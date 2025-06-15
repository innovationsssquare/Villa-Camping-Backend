const Villa = require("../Model/Villa");
const AppErr = require("../Services/AppErr");

// Create a villa
const createVilla = async (req, res, next) => {
  try {
    const villa = await Villa.create(req.body);
    res.status(201).json({ success: true, message: "Villa created", data: villa });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create villa", 500));
  }
};

// Get all villas
const getAllVillas = async (req, res, next) => {
  try {
    const villas = await Villa.find({ deletedAt: null }).populate("property");
    res.status(200).json({ success: true, data: villas });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch villas", 500));
  }
};

// Get villa by ID
const getVillaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const villa = await Villa.findById(id).populate("property");

    if (!villa || villa.deletedAt) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({ success: true, data: villa });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch villa", 500));
  }
};

// Update villa
const updateVilla = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Villa.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({ success: true, message: "Villa updated", data: updated });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update villa", 500));
  }
};

// Soft delete villa
const softDeleteVilla = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Villa.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });

    if (!deleted) {
      return next(new AppErr("Villa not found", 404));
    }

    res.status(200).json({ success: true, message: "Villa soft deleted", data: deleted });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete villa", 500));
  }
};

// Get all villas by property ID
const getVillaByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const villas = await Villa.find({ property: propertyId, deletedAt: null });
    res.status(200).json({ success: true, data: villas });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch villas for property", 500));
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
