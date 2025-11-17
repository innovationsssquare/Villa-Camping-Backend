const Booking = require("../Model/Bookingschema");
const Payout = require("../Model/PayoutSchema");
const CouponOffer = require("../Model/Couponschema");
const Owner = require("../Model/Ownerschema");
const AppErr = require("../Services/AppErr");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Villa = require("../Model/Villaschema");
const { Cottages, CottageUnit } = require("../Model/Cottageschema");
const { Camping, Tent } = require("../Model/Campingschema");
const { Hotels, Room } = require("../Model/Hotelschema");
const { getSocketIO } = require("../Services/Socket");
const Notification = require("../Model/Notificationschema");
const { sendPushNotification } = require("../Services/sendExpoNotification");
const cron = require("node-cron");
const moment = require("moment-timezone");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to validate and apply coupon
const validateAndApplyCoupon = async (
  couponCode,
  subtotal,
  customerId,
  propertyType,
  propertyId,
  checkIn,
  checkOut,
  deviceId
) => {
  if (!couponCode) return null;

  const coupon = await CouponOffer.findOne({
    code: couponCode.trim().toUpperCase(),
    isActive: true,
    validTill: { $gte: new Date() },
  });

  if (!coupon) {
    throw new Error("Invalid or expired coupon code");
  }

  // Check usage limit
  if (coupon.usageLimit <= 0) {
    throw new Error("Coupon usage limit exceeded");
  }

  // Check user limit - count how many times this user has used this coupon
  const userUsageCount = await Booking.countDocuments({
    customerId,
    "coupon.couponId": coupon._id,
    status: { $ne: "cancelled" },
  });

  if (userUsageCount >= coupon.userLimit) {
    throw new Error(`You can only use this coupon ${coupon.userLimit} time(s)`);
  }

  // Check device limit (if deviceId provided)
  if (deviceId && coupon.devicesUsed.includes(deviceId)) {
    throw new Error("This coupon has already been used on this device");
  }

  // Check if user is assigned to this coupon (if users array is populated)
  if (coupon.users && coupon.users.length > 0) {
    const isUserAssigned = coupon.users.some(
      (userId) => userId.toString() === customerId.toString()
    );
    if (!isUserAssigned) {
      throw new Error("This coupon is not available for you");
    }
  }

  // Check property type applicability (for admin offers)
  if (coupon.type === "offer" && coupon.propertyTypes) {
    const normalizedPropertyType = propertyType.toLowerCase();
    if (coupon.propertyTypes !== normalizedPropertyType) {
      throw new Error(
        `This offer is only applicable for ${coupon.propertyTypes} properties`
      );
    }
  }

  // Check specific property (for property owner coupons)
  if (coupon.type === "coupon" && coupon.property) {
    if (coupon.property.toString() !== propertyId.toString()) {
      throw new Error("This coupon is not applicable for this property");
    }
  }

  // Check minimum nights requirement
  if (coupon.minNights) {
    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    if (nights < coupon.minNights) {
      throw new Error(
        `Minimum ${coupon.minNights} nights required to use this coupon`
      );
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discount.type === "percentage") {
    discountAmount = (subtotal * coupon.discount.amount) / 100;
    // Apply max discount cap
    if (discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.discount.type === "fixed") {
    discountAmount = coupon.discount.amount;
    // Apply max discount cap
    if (discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  }

  // Discount cannot exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  return {
    applied: true,
    code: coupon.code,
    couponId: coupon._id,
    discountType: coupon.discount.type,
    discountValue: coupon.discount.amount,
    discountAmount: Math.round(discountAmount * 100) / 100,
    maxDiscount: coupon.maxDiscount,
    appliedAt: new Date(),
    couponType: coupon.type, // "coupon" or "offer"
    title: coupon.title,
  };
};

// Helper function to calculate pricing
const calculatePricing = (items, couponData, taxRate = 0) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = couponData?.discountAmount || 0;
  const amountAfterDiscount = subtotal - discountAmount;
  const taxAmount = (amountAfterDiscount * taxRate) / 100;
  const totalAmount = amountAfterDiscount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency: "INR",
  };
};

// Helper function to create payout
const createPayoutForBooking = async (booking) => {
  try {
    // Get owner details with bank information
    const owner = await Owner.findById(booking.ownerId);
    if (!owner) {
      console.error("Owner not found for payout creation");
      return null;
    }

    // Get property details
    let property;
    switch (booking.propertyType) {
      case "Villa":
        property = await Villa.findById(booking.propertyId);
        break;
      case "Camping":
        property = await Camping.findById(booking.propertyId);
        break;
      case "Hotel":
        property = await Hotels.findById(booking.propertyId);
        break;
      case "Cottage":
        property = await Cottages.findById(booking.propertyId);
        break;
    }

    // Calculate total gateway fees from all successful payments
    const totalGatewayFees = booking.payments
      .filter((p) => p.status === "successful")
      .reduce((sum, p) => sum + (p.gatewayFee || 0), 0);

    // Commission configuration (can be made dynamic based on property/owner tier)
    const COMMISSION_RATE = 15; // 15%
    const TDS_RATE = 1; // 1%
    const GST_RATE = 18; // 18%
    const GATEWAY_FEE_DEDUCTED_FROM = "owner"; // or "admin" or "shared"

    const payout = new Payout({
      bookingId: booking._id,
      ownerId: booking.ownerId,
      ownerDetails: {
        name: owner.name || owner.businessName,
        email: owner.email,
        mobile: owner.mobile,
        bankAccount: owner.bankAccount,
        upiId: owner.upiId,
      },
      propertyType: booking.propertyType,
      propertyId: booking.propertyId,
      propertyName: property?.name || "Unknown Property",
      bookingReference: booking._id.toString().slice(-8).toUpperCase(),
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      bookingStatus: booking.status,
      financials: {
        commissionType: "percentage",
        commissionRate: COMMISSION_RATE,
        taxOnCommission: {
          tdsRate: TDS_RATE,
          gstRate: GST_RATE,
        },
        paymentGatewayFee: {
          rate: 2, // Assuming 2% gateway fee
          amount: totalGatewayFees,
          deductedFrom: GATEWAY_FEE_DEDUCTED_FROM,
        },
        currency: "INR",
      },
      payoutSchedule: {
        type: "after_checkout",
        holdPeriod: 7, // 7 days hold after checkout
      },
    });

    // Calculate payout amounts
    payout.calculatePayout(booking.pricing.totalAmount, COMMISSION_RATE);

    // Save payout
    await payout.save();

    // Update booking with payout reference
    booking.payoutId = payout._id;
    booking.payoutStatus = "pending";
    await booking.save();

    return payout;
  } catch (error) {
    console.error("Error creating payout:", error);
    return null;
  }
};

// Create booking + Razorpay order with coupon support
const createBooking = async (req, res, next) => {
  try {
    const {
      propertyType,
      propertyId,
      ownerId,
      customerId,
      customerDetails,
      checkIn,
      checkOut,
      guests,
      items,
      couponCode,
      paymentType = "full", // "full" or "partial"
      partialPercentage = 30, // Default 30% for partial payment
      taxRate = 0, // GST or other tax rate
      deviceId,
    } = req.body;

    // Validation
    if (
      !propertyType ||
      !propertyId ||
      !ownerId ||
      !customerId ||
      !checkIn ||
      !checkOut ||
      !items ||
      items.length === 0
    ) {
      return next(new AppErr("Missing required fields", 400));
    }

    if (
      !customerDetails?.firstName ||
      !customerDetails?.mobile ||
      !customerDetails?.email
    ) {
      return next(new AppErr("Customer details incomplete", 400));
    }

    // Validate and apply coupon
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    let couponData = null;

    if (couponCode) {
      try {
        couponData = await validateAndApplyCoupon(
          couponCode,
          subtotal,
          customerId,
          propertyType,
          propertyId,
          checkIn,
          checkOut,
          deviceId
        );
      } catch (couponError) {
        return next(new AppErr(couponError.message, 400));
      }
    }

    // Calculate pricing
    const pricing = calculatePricing(items, couponData, taxRate);

    // Calculate payment plan
    let paymentPlan = { type: "full" };
    let amountToPay = pricing.totalAmount;

    if (paymentType === "partial") {
      const partialAmount = Math.round(
        (pricing.totalAmount * partialPercentage) / 100
      );
      const remainingAmount = pricing.totalAmount - partialAmount;

      // Calculate due date (e.g., 7 days before check-in)
      const dueDate = new Date(checkIn);
      dueDate.setDate(dueDate.getDate() - 7);

      paymentPlan = {
        type: "partial",
        partialPercentage,
        amountDue: partialAmount,
        remainingAmount,
        dueDate,
      };
      amountToPay = partialAmount;
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amountToPay * 100), // Convert to paise
      currency: "INR",
      receipt: `booking_${Date.now()}`,
      payment_capture: 1,
    });

    // Create booking in "pending" state
    const booking = await Booking.create({
      propertyType,
      propertyId,
      ownerId,
      customerId,
      customerDetails,
      checkIn,
      checkOut,
      guests,
      items,
      coupon: couponData || { applied: false },
      pricing,
      paymentPlan,
      payments: [
        {
          amount: amountToPay,
          currency: "INR",
          status: "pending",
          paymentType: paymentType === "partial" ? "partial" : "full",
          transactionId: order.id,
        },
      ],
      paymentStatus: "unpaid",
      status: "pending",
      deviceId,
    });

    const notification = await Notification.create({
      recipientType: "owner",
      recipientId: booking.ownerId,
      type: "booking_created",
      category: "booking",
      title: "New Booking Received",
      message: `A new booking has been made by ${booking.customerDetails.firstName} ${booking.customerDetails.lastName}.`,
      bookingId: booking._id,
      propertyId: booking.propertyId,
      priority: "high",
      channels: {
        inApp: true,
        email: { sent: false },
        push: { sent: false },
      },
      data: {
        bookingId: booking._id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        customerName: `${booking.customerDetails.firstName} ${booking.customerDetails.lastName}`,
        totalAmount: booking.pricing.totalAmount,
        propertyType: booking.propertyType,
      },
      metadata: {
        sentByModel: "System",
        deviceInfo: { deviceId: booking.deviceId, platform: "web" },
      },
    });

    const owner = await Owner.findById(booking.ownerId);

    if (owner?.expoPushToken) {
      sendPushNotification(owner.expoPushToken, {
        title: "New Booking Request",
        body: `You received a new booking from ${booking?.customerDetails?.firstName} ${booking?.customerDetails?.lastName}`,
        data: {
          screen: "/Bookingss/screen2", // ✅ expo-router navigation target
          bookingId: booking._id,
        },
      });
    }

    const io = getSocketIO();
    io.to(`owner_${booking.ownerId}`).emit("booking_created", {
      message: "New booking created",
      booking,
    });

    // io.to(`owner_${booking.ownerId}`).emit("notification_new", {
    //   type: "booking_created",
    //   title: notification.title,
    //   message: notification.message,
    //   booking: booking,
    //   notification,
    // });

    res.status(201).json({
      success: true,
      message: "Booking initiated. Complete payment to confirm.",
      data: {
        booking,
        order,
        amountToPay,
        paymentType: paymentPlan.type,
        couponApplied: couponData?.applied || false,
        discountAmount: couponData?.discountAmount || 0,
      },
    });
  } catch (err) {
    console.error("Create booking error:", err);
    next(new AppErr(err.message || "Failed to create booking", 500));
  }
};

// Verify payment + confirm booking + update coupon + create payout
const verifyPaymentAndConfirm = async (req, res, next) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
      gatewayFee = 0,
    } = req.body;

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !bookingId
    ) {
      return next(new AppErr("Payment verification details missing", 400));
    }

    // Verify Razorpay signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return next(new AppErr("Invalid payment signature", 400));
    }

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppErr("Booking not found", 404));

    // Update payment record
    const paymentIndex = booking.payments.findIndex(
      (p) => p.transactionId === razorpayOrderId
    );

    if (paymentIndex !== -1) {
      booking.payments[paymentIndex].status = "successful";
      booking.payments[paymentIndex].transactionId = razorpayPaymentId;
      booking.payments[paymentIndex].paidAt = new Date();
      booking.payments[paymentIndex].gatewayFee = gatewayFee;
    }

    // Update payment status
    const totalPaid = booking.payments
      .filter((p) => p.status === "successful")
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= booking.pricing.totalAmount) {
      booking.paymentStatus = "fully_paid";
      booking.status = "confirmed";
    } else {
      booking.paymentStatus = "partially_paid";
      booking.status = "confirmed"; // Keep pending until full payment
    }

    await booking.save();

    // Update coupon usage if applied
    if (booking.coupon.applied && booking.coupon.couponId) {
      const updateData = {
        $inc: { usageLimit: -1 }, // Decrement usage limit
      };

      // Add device ID to devicesUsed array if provided
      if (booking.deviceId) {
        updateData.$addToSet = { devicesUsed: booking.deviceId };
      }

      await CouponOffer.findByIdAndUpdate(booking.coupon.couponId, updateData);
    }

    // Update property/unit booked dates only if fully paid
    if (booking.paymentStatus === "fully_paid") {
      const { propertyType, propertyId, checkIn, checkOut, items } = booking;

      if (propertyType === "Villa") {
        await Villa.findByIdAndUpdate(
          propertyId,
          { $push: { bookedDates: { checkIn, checkOut } }, status: "booked" },
          { new: true }
        );
      } else {
        for (const item of items) {
          const { unitType, unitId } = item;

          let Model;
          switch (unitType) {
            case "Tent":
              Model = Tent;
              break;
            case "CottageUnit":
              Model = CottageUnit;
              break;
            case "RoomUnit":
              Model = Room;
              break;
            default:
              console.warn(`Unknown unit type: ${unitType}`);
              continue;
          }

          await Model.findByIdAndUpdate(
            unitId,
            {
              $push: { bookedDates: { checkIn, checkOut } },
              status: "booked",
            },
            { new: true }
          );
        }
      }

      // Create payout for owner (async, don't block response)
      createPayoutForBooking(booking).catch((err) =>
        console.error("Payout creation failed:", err)
      );
    }

    const io = getSocketIO();
    io.to(`owner_${booking.ownerId}`).emit("booking_updated", {
      message:
        booking.paymentStatus === "fully_paid"
          ? "Booking confirmed successfully"
          : "Partial payment received",
      booking,
    });

    res.status(200).json({
      success: true,
      message:
        booking.paymentStatus === "fully_paid"
          ? "Payment verified, booking confirmed"
          : "Partial payment received. Complete remaining payment to confirm booking.",
      data: booking,
      paymentStatus: booking.paymentStatus,
      remainingAmount:
        booking.paymentPlan.type === "partial"
          ? booking.paymentPlan.remainingAmount
          : 0,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    next(new AppErr(err.message || "Payment verification failed", 500));
  }
};

// Process remaining payment for partial bookings
const processRemainingPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppErr("Booking not found", 404));

    if (booking.paymentStatus === "fully_paid") {
      return next(new AppErr("Booking is already fully paid", 400));
    }

    if (booking.paymentPlan.type !== "partial") {
      return next(new AppErr("This is not a partial payment booking", 400));
    }

    const remainingAmount = booking.paymentPlan.remainingAmount;

    // Create Razorpay order for remaining amount
    const order = await razorpay.orders.create({
      amount: Math.round(remainingAmount * 100),
      currency: "INR",
      receipt: `remaining_${bookingId}_${Date.now()}`,
      payment_capture: 1,
    });

    // Add new payment record
    booking.payments.push({
      amount: remainingAmount,
      currency: "INR",
      status: "pending",
      paymentType: "remaining",
      transactionId: order.id,
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Remaining payment order created",
      data: { booking, order, amountToPay: remainingAmount },
    });
  } catch (err) {
    console.error("Remaining payment error:", err);
    next(new AppErr("Failed to process remaining payment", 500));
  }
};

// Apply coupon to existing booking (before payment)
const applyCouponToBooking = async (req, res, next) => {
  try {
    const { bookingId, couponCode } = req.body;

    if (!bookingId || !couponCode) {
      return next(new AppErr("Booking ID and coupon code required", 400));
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppErr("Booking not found", 404));

    if (booking.paymentStatus !== "unpaid") {
      return next(
        new AppErr("Cannot apply coupon to paid or partially paid booking", 400)
      );
    }

    if (booking.coupon.applied) {
      return next(new AppErr("Coupon already applied to this booking", 400));
    }

    // Validate and apply coupon
    const couponData = await validateAndApplyCoupon(
      couponCode,
      booking.pricing.subtotal,
      booking.customerId,
      booking.propertyType,
      booking.propertyId,
      booking.checkIn,
      booking.checkOut,
      booking.deviceId
    );

    // Recalculate pricing
    const items = booking.items;
    const pricing = calculatePricing(items, couponData, 0);

    // Update booking
    booking.coupon = couponData;
    booking.pricing = pricing;

    // Update payment plan if partial
    if (booking.paymentPlan.type === "partial") {
      const partialAmount = Math.round(
        (pricing.totalAmount * booking.paymentPlan.partialPercentage) / 100
      );
      booking.paymentPlan.amountDue = partialAmount;
      booking.paymentPlan.remainingAmount = pricing.totalAmount - partialAmount;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        booking,
        originalAmount: booking.pricing.subtotal,
        discountAmount: couponData.discountAmount,
        finalAmount: pricing.totalAmount,
      },
    });
  } catch (err) {
    console.error("Apply coupon error:", err);
    next(new AppErr(err.message || "Failed to apply coupon", 500));
  }
};

// Get booking by ID
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("ownerId", "name email mobile")
      .populate("customerId", "name email mobile")
      .populate("payoutId")
      .populate("coupon.couponId");

    if (!booking) return next(new AppErr("Booking not found", 404));

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch booking", 500));
  }
};

// Get all bookings with filters
const getAllBookings = async (req, res, next) => {
  try {
    const {
      bookingId,
      ownerId,
      customerId,
      status,
      paymentStatus,
      startDate,
      endDate,
      propertyType,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (bookingId) query._id = bookingId;
    if (ownerId) query.ownerId = ownerId;
    if (customerId) query.customerId = customerId;
    if (propertyType) query.propertyType = propertyType;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate && endDate) {
      query.checkIn = { $gte: new Date(startDate) };
      query.checkOut = { $lte: new Date(endDate) };
    } else if (startDate) {
      query.checkIn = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.checkOut = { $lte: new Date(endDate) };
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("ownerId", "name email")
        .populate("customerId", "name email")
        .populate({ path: "propertyId", select: "name location" })
        .populate("payoutId", "payoutStatus financials.netPayout")
        .populate("coupon.couponId", "code title type")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(perPage),
      Booking.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / perPage);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: { total, page: currentPage, totalPages, limit: perPage },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch bookings", 500));
  }
};

// Get bookings by customer
const getBookingsByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    if (!customerId) return next(new AppErr("Customer ID is required", 400));

    const query = { customerId };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate && endDate) {
      query.checkIn = { $gte: new Date(startDate) };
      query.checkOut = { $lte: new Date(endDate) };
    } else if (startDate) {
      query.checkIn = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.checkOut = { $lte: new Date(endDate) };
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("ownerId", "name email")
        .populate({ path: "propertyId", select: "name location images" })
        .populate("coupon.couponId", "code title")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(perPage),
      Booking.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / perPage);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: { total, page: currentPage, totalPages, limit: perPage },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch customer bookings", 500));
  }
};

// Get bookings by owner
const getBookingsByOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    console.log(req.query);

    if (!ownerId) return next(new AppErr("Owner ID is required", 400));

    const query = { ownerId };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate && endDate) {
      query.checkIn = { $gte: new Date(startDate) };
      query.checkOut = { $lte: new Date(endDate) };
    } else if (startDate) {
      query.checkIn = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.checkOut = { $lte: new Date(endDate) };
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const skip = (currentPage - 1) * perPage;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("customerId", "name email mobile")
        .populate({ path: "propertyId", select: "name location" })
        .populate("payoutId", "payoutStatus financials")
        .populate("coupon.couponId", "code title type")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(perPage),
      Booking.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / perPage);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: { total, page: currentPage, totalPages, limit: perPage },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch owner bookings", 500));
  }
};

// Cancel booking with refund handling
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, cancelledBy } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return next(new AppErr("Booking not found", 404));

    if (booking.status === "cancelled") {
      return next(new AppErr("Booking already cancelled", 400));
    }

    // Calculate refund based on cancellation policy
    let refundAmount = 0;
    const totalPaid = booking.payments
      .filter((p) => p.status === "successful")
      .reduce((sum, p) => sum + p.amount, 0);

    // Simple refund logic (customize based on your policy)
    const daysUntilCheckIn = Math.ceil(
      (new Date(booking.checkIn) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilCheckIn > 7) {
      refundAmount = totalPaid * 0.9; // 90% refund
    } else if (daysUntilCheckIn > 3) {
      refundAmount = totalPaid * 0.5; // 50% refund
    } else {
      refundAmount = 0; // No refund
    }

    booking.status = "cancelled";
    booking.cancellation = {
      cancelled: true,
      cancelledAt: new Date(),
      cancelledBy,
      reason,
      refundAmount,
      refundStatus: refundAmount > 0 ? "pending" : "processed",
    };

    await booking.save();

    // Revert coupon usage if applied
    if (booking.coupon.applied && booking.coupon.couponId) {
      const updateData = {
        $inc: { usageLimit: 1 }, // Increment usage limit back
      };

      // Remove device ID from devicesUsed array if provided
      if (booking.deviceId) {
        updateData.$pull = { devicesUsed: booking.deviceId };
      }

      await CouponOffer.findByIdAndUpdate(booking.coupon.couponId, updateData);
    }

    // Update payout if exists
    if (booking.payoutId) {
      await Payout.findByIdAndUpdate(booking.payoutId, {
        bookingStatus: "cancelled",
        payoutStatus: "cancelled",
        "refund.isRefunded": true,
        "refund.refundAmount": refundAmount,
        "refund.refundDate": new Date(),
        "refund.refundReason": reason,
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: { booking, refundAmount },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to cancel booking", 500));
  }
};

const getBookingCountsByStatus = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    if (!ownerId) {
      return next(new AppErr("Owner ID is required", 400));
    }

    // Base filter for this owner
    const baseFilter = { ownerId };

    // Count by status
    const total = await Booking.countDocuments(baseFilter);

    const pending = await Booking.countDocuments({
      ...baseFilter,
      status: "pending",
    });

    const confirmed = await Booking.countDocuments({
      ...baseFilter,
      status: "confirmed",
    });

    const cancelled = await Booking.countDocuments({
      ...baseFilter,
      status: "cancelled",
    });

    const completed = await Booking.countDocuments({
      ...baseFilter,
      status: "completed",
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        confirmed,
        cancelled,
        completed,
      },
    });
  } catch (err) {
    console.error("Booking count error:", err);
    next(new AppErr("Failed to fetch booking counts", 500));
  }
};

const getPropertyBookings = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required.",
      });
    }

    // Month range in IST
    const startDate = moment.tz(`${year}-${month}-01`, "Asia/Kolkata").startOf("month").toDate();
    const endDate = moment.tz(startDate, "Asia/Kolkata").endOf("month").toDate();

    // Fetch bookings
    const bookings = await Booking.find({
      propertyId,
      checkIn: { $lte: endDate },
      checkOut: { $gte: startDate },
    })
      .populate("customerId", "firstName lastName mobile")
      .lean();

    const calendarBookings = [];

    bookings.forEach((bk) => {

      // Convert booking dates to IST correctly
      const checkInIST = moment(bk.checkIn).tz("Asia/Kolkata").startOf("day");
      const checkOutIST = moment(bk.checkOut).tz("Asia/Kolkata").startOf("day");

      // Loop through dates (INCLUSIVE) → FIXED
      for (let d = checkInIST.clone(); d.isSameOrBefore(checkOutIST); d.add(1, "day")) {

        // Ensure we're only pushing THIS month
        if (d.tz("Asia/Kolkata").month() + 1 !== Number(month)) continue;

        calendarBookings.push({
          date: d.date(),
          isBooked: true,
          guestName: `${bk.customerDetails.firstName} ${bk.customerDetails.lastName || ""}`,
          guestPhone: bk.customerDetails.mobile,
          bookingId: bk._id,

          // SEND DATES IN IST ALWAYS
          checkIn: moment(bk.checkIn).tz("Asia/Kolkata").format(),
          checkOut: moment(bk.checkOut).tz("Asia/Kolkata").format(),

          totalAmount: bk.pricing.totalAmount,
          guests: bk.guests.adults + (bk.guests.children || 0),
          status: bk.status,
        });
      }
    });

    return res.json({
      success: true,
      propertyId,
      month,
      year,
      totalBookings: bookings.length,
      calendarBookings,
    });

  } catch (error) {
    console.log("ERR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


cron.schedule("*/10 * * * *", async () => {
  try {
    // Convert NOW to IST correctly
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    // Find bookings where checkout time (UTC) has passed in IST
    const result = await Booking.updateMany(
      {
        checkOut: { $lt: nowIST },
        status: { $in: ["confirmed"] },
        "cancellation.cancelled": false,
      },
      {
        $set: {
          status: "completed",
          updatedAt: new Date(),
        },
      }
    );

    console.log("Bookings marked completed:", result.modifiedCount);
  } catch (err) {
    console.error("CRON ERROR:", err);
  }
});

module.exports = {
  createBooking,
  verifyPaymentAndConfirm,
  processRemainingPayment,
  applyCouponToBooking,
  getBookingById,
  getAllBookings,
  getBookingsByCustomer,
  getBookingsByOwner,
  cancelBooking,
  getBookingCountsByStatus,
  getPropertyBookings,
};
