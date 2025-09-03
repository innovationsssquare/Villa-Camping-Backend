const Booking = require("../Model/Bookingschema");
const AppErr = require("../Services/AppErr");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Villa = require("../Model/Villaschema");
const { Cottages, CottageUnit } = require("../Model/Cottageschema");
const {Camping,Tent} = require("../Model/Campingschema");
const {Hotels,Room} = require("../Model/Hotelschema");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create booking + Razorpay order
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
      paymentAmount,
    } = req.body;

    if (!propertyType || !propertyId || !ownerId || !customerId || !checkIn || !checkOut ) {
      return next(new AppErr("Missing required fields", 400));
    }

    // Calculate total amount
    // const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: paymentAmount * 100, // paise
      currency: "INR",
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
      payment: {
        amount: paymentAmount,
        currency: "INR",
        status: "pending",
        transactionId: order.id,
      },
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Booking initiated. Complete payment to confirm.",
      data: booking,
      order,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create booking", 500));
  }
};

// Verify payment + confirm booking
const verifyPaymentAndConfirm = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return next(new AppErr("Payment verification details missing", 400));
    }

    // ✅ Verify Razorpay signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return next(new AppErr("Invalid payment signature", 400));
    }

    // ✅ Update booking
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: "confirmed",
        "payment.status": "paid",
        "payment.transactionId": razorpayPaymentId,
      },
      { new: true }
    );

    if (!booking) return next(new AppErr("Booking not found", 404));

    const { propertyType, propertyId, checkIn, checkOut, items } = booking;

    if (propertyType === "Villa") {
      // Whole property booked
      await Villa.findByIdAndUpdate(
        propertyId,
        { $push: { bookedDates: { checkIn, checkOut } }, status: "booked" },
        { new: true }
      );
    } else {
      // Loop through units in items array
      for (const item of items) {
        const { unitType, unitId } = item;

        switch (unitType) {
          case "Tent":
            await Tent.findByIdAndUpdate(
              unitId,
              { $push: { bookedDates: { checkIn, checkOut } }, status: "booked" },
              { new: true }
            );
            break;

          case "CottageUnit":
            await CottageUnit.findByIdAndUpdate(
              unitId,
              { $push: { bookedDates: { checkIn, checkOut } }, status: "booked" },
              { new: true }
            );
            break;

          case "RoomUnit":
            await RoomUnit.findByIdAndUpdate(
              unitId,
              { $push: { bookedDates: { checkIn, checkOut } }, status: "booked" },
              { new: true }
            );
            break;

          default:
            console.warn(`Unknown unit type: ${unitType}`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified, booking confirmed and property updated",
      data: booking,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Payment verification failed", 500));
  }
};

// Get booking by ID
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) return next(new AppErr("Booking not found", 404));

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch booking", 500));
  }
};

// Get bookings by customer
const getBookingsByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const bookings = await Booking.find({ customerId });

    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch customer bookings", 500));
  }
};

// Get bookings by owner
const getBookingsByOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const bookings = await Booking.find({ ownerId });

    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch owner bookings", 500));
  }
};

// Cancel booking
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: "cancelled", "payment.status": "failed" },
      { new: true }
    );

    if (!booking) return next(new AppErr("Booking not found", 404));

    res.status(200).json({
      success: true,
      message: "Booking cancelled",
      data: booking,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to cancel booking", 500));
  }
};

module.exports = {
  createBooking,
  verifyPaymentAndConfirm,
  getBookingById,
  getBookingsByCustomer,
  getBookingsByOwner,
  cancelBooking,
};
