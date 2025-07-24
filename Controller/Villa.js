const Villa = require("../Model/Villaschema");
const AppErr = require("../Services/AppErr");
const Owner =require("../Model/Ownerschema")
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
    const villa = await Villa.findOne({ _id: id, deletedAt: null });

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

module.exports = {
  createVilla,
  getAllVillas,
  getVillaById,
  updateVilla,
  softDeleteVilla,
  getVillaByProperty,
};
