const Villa = require("../Model/Villaschema");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");
// Create a Villa
const createVilla = async (req, res, next) => {
  try {
    // Validate required fields manually for better error messaging (optional but useful)
    const requiredFields = ["owner", "category"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Create the Villa using Mongoose schema validation
    const villa = await Villa.create(req.body);

    // Add this villa to the owner's properties array
    await Owner.findByIdAndUpdate(
      villa.owner,
      {
        $push: {
          properties: {
            refType: "Villa",
            refId: villa._id,
          },
        },
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Villa created and added to owner's properties",
      data: villa,
    });
  } catch (err) {
    console.error(err);

    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    next(new AppErr("Failed to create villa", 500));
  }
};

// Get All Villas (excluding soft-deleted ones)
const getAllVillas = async (req, res, next) => {
  try {
    const villas = await Villa.find({ deletedAt: null });
    res.status(200).json({ success: true, data: villas });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch villas", 500));
  }
};

// Get Villa By ID
const getVillaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const villa = await Villa.findOne({ _id: id, deletedAt: null })
      .populate({
        path: "reviews.userId",
        select: "fullName email",
      })
      .lean(); // 🔥 important
    if (!villa) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({ success: true, data: villa });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch villa", 500));
  }
};

// Update Villa
const updateVilla = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedVilla = await Villa.findOneAndUpdate(
      { _id: id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Villa updated successfully",
      data: updatedVilla,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update villa", 500));
  }
};

// Soft Delete Villa
const softDeleteVilla = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedVilla = await Villa.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedVilla) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Villa soft deleted",
      data: deletedVilla,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete villa", 500));
  }
};

// Get Villas by ID (if using propertyId = villaId pattern for now)
const getVillaByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const villa = await Villa.findOne({ _id: propertyId, deletedAt: null });

    if (!villa) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({ success: true, data: villa });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch villa", 500));
  }
};

// Add a review to a villa and update average rating
const addVillaReview = async (req, res, next) => {
  try {
    const { villaId } = req.params;
    const { userId, rating, comment, images } = req.body;

    if (!villaId || !userId || !rating) {
      return next(
        new AppErr("Villa ID, User ID, and Rating are required", 400)
      );
    }

    const villa = await Villa.findById(villaId);
    if (!villa || villa.deletedAt) {
      return next(new AppErr("Villa not found or has been deleted", 404));
    }

    // Push the new review to the reviews array
    villa.reviews.push({
      userId,
      rating,
      comment,
      images,
    });

    // Recalculate average rating
    const totalRatings = villa.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const totalReviews = villa.reviews.length;
    villa.averageRating = totalRatings / totalReviews;
    villa.totalReviews = totalReviews;

    await villa.save();

    res.status(200).json({
      success: true,
      message: "Review added successfully",
      data: {
        reviews: villa.reviews,
        averageRating: villa.averageRating,
        totalReviews: villa.totalReviews,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to add review", 500));
  }
};

const approveAndUpdateVilla = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, commission, isLive } = req.body;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return next(
        new AppErr(
          'Invalid status value. Please use "approved" or "rejected".',
          400
        )
      );
    }

    // Validate commission
    if (commission && typeof commission !== "number") {
      return next(new AppErr("Commission should be a number", 400));
    }

    // Validate isLive
    if (typeof isLive !== "boolean") {
      return next(new AppErr("isLive should be a boolean value", 400));
    }

    // Update villa status, commission, and isLive
    const updatedVilla = await Villa.findByIdAndUpdate(
      id,
      { isapproved: status, commission, isLive },
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Villa has been ${status} and is now ${
        isLive ? "live" : "inactive"
      } with commission set.`,
      data: updatedVilla,
    });
  } catch (err) {
    console.error(err);
    next(
      new AppErr("Failed to approve, update status, or add commission", 500)
    );
  }
};

const updateVillaPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { weekdayPrice, weekendPrice } = req.body;

    if (weekdayPrice == null && weekendPrice == null) {
      return next(
        new AppErr(
          "At least one price field (weekdayPrice or weekendPrice) is required",
          400
        )
      );
    }

    const updatedVilla = await Villa.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        $set: {
          ...(weekdayPrice != null && { "pricing.weekdayPrice": weekdayPrice }),
          ...(weekendPrice != null && { "pricing.weekendPrice": weekendPrice }),
        },
      },
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Villa pricing updated successfully",
      data: updatedVilla.pricing,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update villa pricing", 500));
  }
};

module.exports = {
  createVilla,
  getAllVillas,
  getVillaById,
  updateVilla,
  softDeleteVilla,
  getVillaByProperty,
  addVillaReview,
  approveAndUpdateVilla,
  updateVillaPricing,
};
