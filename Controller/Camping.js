const { Camping, Tent } = require("../Model/Campingschema");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");

// Create Camping and Tent data
const createCamping = async (req, res, next) => {
  try {
    const requiredFields = ["owner", "category"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const { tents, ...campingData } = req.body;

    const newCamping = await Camping.create({ ...campingData });

    const tentDocs = await Promise.all(
      tents.map(async (tent) => {
        const tentDoc = await Tent.create({
          ...tent,
          camping: newCamping._id,
        });
        return tentDoc._id;
      })
    );

    newCamping.tents = tentDocs;
    await newCamping.save();

    await Owner.findByIdAndUpdate(
      newCamping.owner,
      {
        $push: {
          properties: {
            refType: "Camping",
            refId: newCamping._id,
          },
        },
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Camping created successfully",
      data: newCamping,
    });
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    next(new AppErr("Failed to create camping", 500));
  }
};

// Get all campings (not deleted)
const getAllCampings = async (req, res, next) => {
  try {
    const campings = await Camping.find({ deletedAt: null }).populate("tents");
    res.status(200).json({ success: true, data: campings });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch campings", 500));
  }
};

// Get single camping by ID
const getCampingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const camping = await Camping.findOne({ _id: id, deletedAt: null }).populate("tents");

    if (!camping) return next(new AppErr("Camping not found", 404));

    res.status(200).json({ success: true, data: camping });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch camping", 500));
  }
};

// Update Camping
const updateCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedCamping = await Camping.findOneAndUpdate(
      { _id: id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!updatedCamping) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Camping updated successfully",
      data: updatedCamping,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update camping", 500));
  }
};

// Soft delete Camping
const softDeleteCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCamping = await Camping.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedCamping) return next(new AppErr("Camping not found", 404));

    res.status(200).json({
      success: true,
      message: "Camping soft deleted",
      data: deletedCamping,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete camping", 500));
  }
};

// Get camping by propertyId (generic access)
const getCampingByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const camping = await Camping.findOne({ _id: propertyId, deletedAt: null });

    if (!camping) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({ success: true, data: camping });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch camping", 500));
  }
};

// Add review and update average rating
const addCampingReview = async (req, res, next) => {
  try {
    const { campingId } = req.params;
    const { userId, rating, comment, images } = req.body;

    if (!campingId || !userId || !rating) {
      return next(new AppErr("Camping ID, User ID, and Rating are required", 400));
    }

    const camping = await Camping.findById(campingId);
    if (!camping || camping.deletedAt) {
      return next(new AppErr("Camping not found or has been deleted", 404));
    }

    camping.reviews.push({ userId, rating, comment, images });

    const totalRatings = camping.reviews.reduce((sum, review) => sum + review.rating, 0);
    const totalReviews = camping.reviews.length;

    camping.averageRating = totalRatings / totalReviews;
    camping.totalReviews = totalReviews;

    await camping.save();

    res.status(200).json({
      success: true,
      message: "Review added successfully",
      data: {
        reviews: camping.reviews,
        averageRating: camping.averageRating,
        totalReviews: camping.totalReviews,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to add review", 500));
  }
};

const approveAndUpdateCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, commission, isLive } = req.body; 

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return next(new AppErr('Invalid status value. Please use "approved" or "rejected".', 400));
    }

    // Validate commission
    if (commission && typeof commission !== 'number') {
      return next(new AppErr('Commission should be a number', 400));
    }

    // Validate isLive
    if (typeof isLive !== 'boolean') {
      return next(new AppErr('isLive should be a boolean value', 400));
    }

    // Update villa status, commission, and isLive
    const updatedVilla = await Camping.findByIdAndUpdate(
      id,
      { isapproved: status, commission, isLive },
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Camping has been ${status} and is now ${isLive ? 'live' : 'inactive'} with commission set.`,
      data: updatedVilla,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to approve, update status, or add commission", 500));
  }
};


const updateCampingTentTypePricing = async (req, res, next) => {
  try {
    const { campingId } = req.params;
    const { tentType, weekdayPrice, weekendPrice } = req.body;

    if (!tentType) {
      return next(new AppErr("Tent type is required", 400));
    }

    if (weekdayPrice == null && weekendPrice == null) {
      return next(
        new AppErr("At least one price field (weekdayPrice or weekendPrice) is required", 400)
      );
    }

    // --- 1️⃣ Update Camping Pricing ---
    const campingUpdateFields = {};
    if (weekdayPrice != null) campingUpdateFields["pricing.weekdayPrice"] = weekdayPrice;
    if (weekendPrice != null) campingUpdateFields["pricing.weekendPrice"] = weekendPrice;

    const updatedCamping = await Camping.findOneAndUpdate(
      { _id: campingId, deletedAt: null },
      { $set: campingUpdateFields },
      { new: true }
    );

    if (!updatedCamping) {
      return next(new AppErr("Camping not found", 404));
    }

    // --- 2️⃣ Update All Tents of the Given Type ---
    const tentUpdateFields = {};
    if (weekdayPrice != null) tentUpdateFields["pricing.weekdayPrice"] = weekdayPrice;
    if (weekendPrice != null) tentUpdateFields["pricing.weekendPrice"] = weekendPrice;

    const result = await Tent.updateMany(
      { camping: campingId, tentType, deletedAt: null },
      { $set: tentUpdateFields }
    );

    if (result.matchedCount === 0) {
      return next(
        new AppErr(`No tents found for type "${tentType}" in this camping`, 404)
      );
    }

    // --- 3️⃣ Get Updated Tent Records ---
    const updatedTents = await Tent.find({
      camping: campingId,
      tentType,
      deletedAt: null,
    }).select("tentType pricing");

    res.status(200).json({
      success: true,
      message: `Pricing updated for camping and all "${tentType}" tents`,
      data: {
        campingPricing: updatedCamping.pricing,
        tentType,
        updatedTents,
      },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update camping and tent type pricing", 500));
  }
};

// Add Tent to Existing Camping
const addTentToCamping = async (req, res, next) => {
  try {
    const { id  } = req.params;
    const { tentType, capacity, pricing, images, quantity } = req.body;

    if (!tentType || !pricing) {
      return next(new AppErr("Tent type and pricing are required", 400));
    }

    const camping = await Camping.findOne({ _id: id , deletedAt: null });
    if (!camping) {
      return next(new AppErr("Camping not found", 404));
    }

    // Create new Tent
    const newTent = await Tent.create({
      tentType,
      capacity,
      pricing,
      images,
      quantity,
      camping: id ,
    });

    // Push tent id inside camping document
    camping.tents.push(newTent._id);
    await camping.save();

    res.status(201).json({
      success: true,
      message: "Tent added successfully to camping",
      data: newTent,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to add tent to camping", 500));
  }
};




module.exports = {
  createCamping,
  getAllCampings,
  getCampingById,
  updateCamping,
  softDeleteCamping,
  getCampingByProperty,
  addCampingReview,
  approveAndUpdateCamping,
  updateCampingTentTypePricing,
  addTentToCamping
};
