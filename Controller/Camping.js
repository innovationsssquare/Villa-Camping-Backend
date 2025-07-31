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

module.exports = {
  createCamping,
  getAllCampings,
  getCampingById,
  updateCamping,
  softDeleteCamping,
  getCampingByProperty,
  addCampingReview,
};
