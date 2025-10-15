const { validationResult } = require("express-validator");
const CouponOffer = require("../Model/Couponschema"); // Assuming a Mongoose model
const AppErr = require("../Services/AppErr"); // Custom error handling utility

// Create a new coupon offer
const CreateCouponOffer = async (req, res, next) => {
  try {
    // Validate incoming request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    // Destructure the request body to get the necessary fields
    const {
      code,
      type,
      title,
      description,
      discountAmount,
      discountType,
      validFrom,
      validUntil,
      isActive,
      usageLimit,
      userLimit,
      propertyTypes,
      property,
      createdBy,
      owner,
    } = req.body;

    // Check if the coupon/offer already exists
    const existingCoupon = await CouponOffer.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({
        status: false,
        message: "Coupon code already exists",
      });
    }

    // Create a new coupon offer
    const newCouponOffer = await CouponOffer.create({
      code,
      type,
      title,
      description,
      discount: {
        amount: discountAmount,
        type: discountType,
      },
      validTill: validUntil,
      isActive,
      usageLimit,
      userLimit,
      propertyTypes,
      property,
      createdBy,
      owner,
    });

    // Return success response
    res.status(201).json({
      status: "success",
      data: {
        couponOffer: newCouponOffer,
      },
    });
  } catch (err) {
    next(new AppErr("Failed to create coupon offer", 500, err.message));
  }
};

// Get a coupon by ID
const GetCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await CouponOffer.findById(id);

    if (!coupon) {
      return res.status(404).json({
        status: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        coupon,
      },
    });
  } catch (err) {
    next(new AppErr("Failed to fetch coupon", 500, err.message));
  }
};

// Get all coupons
const GetAllCoupons = async (req, res, next) => {
  try {
    const coupons = await CouponOffer.find();
    res.status(200).json({
      status: "success",
      data: {
        coupons,
      },
    });
  } catch (err) {
    next(new AppErr("Failed to fetch coupons", 500, err.message));
  }
};

// Get all coupons by type (offer)
const GetAllCouponsbyoffer = async (req, res, next) => {
  try {
    const coupons = await CouponOffer.find({ type: "offer" });
    const descriptions = coupons.map(offer => offer.description);

    res.status(200).json({
      status: "success",
      descriptions: descriptions, 
    });
  } catch (err) {
    next(new AppErr("Failed to fetch offers", 500, err.message));
  }
};

// Update a coupon
const UpdateCoupon = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const updatedCoupon = await CouponOffer.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedCoupon) {
      return res.status(404).json({
        status: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        coupon: updatedCoupon,
      },
    });
  } catch (err) {
    next(new AppErr("Failed to update coupon", 500, err.message));
  }
};

// Delete a coupon
const DeleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await CouponOffer.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({
        status: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Coupon deleted successfully",
    });
  } catch (err) {
    next(new AppErr("Failed to delete coupon", 500, err.message));
  }
};

// Apply a coupon
const ApplyCoupon = async (req, res, next) => {
  try {
    // Validate incoming request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { couponCode, orderValue, userId, deviceId } = req.body;

    // Fetch the coupon or offer from the database
    const coupon = await CouponOffer.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(404).json({
        status: false,
        message: "Invalid coupon code",
      });
    }

    // Check if the coupon is expired
    if (new Date() > new Date(coupon.validTill)) {
      return res.status(400).json({
        status: false,
        message: "Coupon has expired",
      });
    }

    // Check if the user has exceeded their usage limit
    const userUsageCount = await CouponOffer.countDocuments({
      code: couponCode,
      "users": userId,
    });

    if (userUsageCount >= coupon.userLimit) {
      return res.status(400).json({
        status: false,
        message: `You have exceeded the usage limit for this coupon (${coupon.userLimit} times)`,
      });
    }

    // Check if the device has already used this coupon
    if (coupon.devicesUsed.includes(deviceId)) {
      return res.status(400).json({
        status: false,
        message: "This device has already used the coupon",
      });
    }

    // Check if the user has already used the coupon
    if (coupon.users.includes(userId)) {
      return res.status(400).json({
        status: false,
        message: "This user has already used the coupon",
      });
    }

    // Validate the order value
    if (orderValue < coupon.minOrderValue) {
      return res.status(400).json({
        status: false,
        message: `Order value must be at least ${coupon.minOrderValue} to apply this coupon`,
      });
    }

    // Update coupon usage for the device and user
    coupon.devicesUsed.push(deviceId);
    coupon.users.push(userId);
    await coupon.save();

    // Calculate the discount
    let discountAmount = 0;
    if (coupon.discount.type === "percentage") {
      discountAmount = (orderValue * coupon.discount.amount) / 100;
    } else if (coupon.discount.type === "fixed") {
      discountAmount = coupon.discount.amount;
    }

    // Return the discount details
    return res.status(200).json({
      status: "success",
      data: {
        coupon,
        discountAmount,
      },
    });
  } catch (err) {
    next(new AppErr("Failed to apply coupon", 500, err.message));
  }
};

module.exports = {
  CreateCouponOffer,
  GetCouponById,
  GetAllCoupons,
  UpdateCoupon,
  DeleteCoupon,
  ApplyCoupon,
  GetAllCouponsbyoffer,
};
