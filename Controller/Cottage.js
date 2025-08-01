const { Cottages, Cottage } = require("../Model/Cottageschema");
const Owner = require("../Model/Ownerschema");
const AppErr = require("../Services/AppErr");

// Create Cottages and Cottage Units
const createCottage = async (req, res, next) => {
  try {
    const requiredFields = ["owner", "category"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const { cottages: cottageUnits, ...cottageData } = req.body;

    const newCottage = await Cottages.create({ ...cottageData });

    const cottageUnitDocs = await Promise.all(
      cottageUnits.map(async (unit) => {
        const unitDoc = await Cottage.create({
          ...unit,
          Cottages: newCottage._id,
        });
        return unitDoc._id;
      })
    );

    newCottage.cottages = cottageUnitDocs;
    await newCottage.save();

    await Owner.findByIdAndUpdate(
      newCottage.owner,
      {
        $push: {
          properties: {
            refType: "Cottages",
            refId: newCottage._id,
          },
        },
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Cottage property created successfully",
      data: newCottage,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create cottage", 500));
  }
};

// Get all cottages (not soft-deleted)
const getAllCottages = async (req, res, next) => {
  try {
    const cottages = await Cottages.find({ deletedAt: null }).populate("cottages");
    res.status(200).json({ success: true, data: cottages });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch cottages", 500));
  }
};

// Get single cottage property by ID
const getCottageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cottage = await Cottages.findOne({ _id: id, deletedAt: null }).populate("cottages");

    if (!cottage) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({ success: true, data: cottage });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch cottage", 500));
  }
};

// Update cottage property
const updateCottage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Cottages.findOneAndUpdate(
      { _id: id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!updated) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({
      success: true,
      message: "Cottage updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update cottage", 500));
  }
};

// Soft delete
const softDeleteCottage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Cottages.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deleted) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({
      success: true,
      message: "Cottage soft deleted",
      data: deleted,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete cottage", 500));
  }
};

// Get cottage by propertyId
const getCottageByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const cottage = await Cottages.findOne({
      _id: propertyId,
      deletedAt: null,
    }).populate("cottages");

    if (!cottage) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({ success: true, data: cottage });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch cottage", 500));
  }
};

// Add Review to Cottage
const addCottageReview = async (req, res, next) => {
  try {
    const { cottageId } = req.params;
    const { userId, rating, comment, images } = req.body;

    if (!userId || !rating) {
      return next(new AppErr("User ID and rating required", 400));
    }

    const cottage = await Cottages.findById(cottageId);
    if (!cottage || cottage.deletedAt) {
      return next(new AppErr("Cottage not found or deleted", 404));
    }

    cottage.reviews.push({ userId, rating, comment, images });

    const totalRatings = cottage.reviews.reduce((sum, r) => sum + r.rating, 0);
    const totalReviews = cottage.reviews.length;

    cottage.averageRating = totalRatings / totalReviews;
    cottage.totalReviews = totalReviews;

    await cottage.save();

    res.status(200).json({
      success: true,
      message: "Review added successfully",
      data: {
        reviews: cottage.reviews,
        averageRating: cottage.averageRating,
        totalReviews: cottage.totalReviews,
      },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to add review", 500));
  }
};

module.exports = {
  createCottage,
  getAllCottages,
  getCottageById,
  updateCottage,
  softDeleteCottage,
  getCottageByProperty,
  addCottageReview,
};
