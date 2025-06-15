const { Camping } = require("../Model/Camping");
const AppErr = require("../Services/AppErr");

// Create a camping
const createCamping = async (req, res, next) => {
  try {
    const camping = await Camping.create(req.body);
    res.status(201).json({ success: true, message: "Camping created", data: camping });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create camping", 500));
  }
};

// Get all campings
const getAllCampings = async (req, res, next) => {
  try {
    const campings = await Camping.find({ deletedAt: null }).populate("property").populate("tents");
    res.status(200).json({ success: true, data: campings });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch campings", 500));
  }
};

// Get camping by ID
const getCampingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const camping = await Camping.findById(id).populate("property").populate("tents");

    if (!camping || camping.deletedAt) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({ success: true, data: camping });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch camping", 500));
  }
};

// Update camping
const updateCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Camping.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({ success: true, message: "Camping updated", data: updated });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update camping", 500));
  }
};

// Soft delete camping
const softDeleteCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Camping.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });

    if (!deleted) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({ success: true, message: "Camping soft deleted", data: deleted });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete camping", 500));
  }
};

// Get all campings by property ID
const getCampingByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const campings = await Camping.find({ property: propertyId, deletedAt: null }).populate("tents");
    res.status(200).json({ success: true, data: campings });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch campings for property", 500));
  }
};

module.exports = {
  createCamping,
  getAllCampings,
  getCampingById,
  updateCamping,
  softDeleteCamping,
  getCampingByProperty,
};
