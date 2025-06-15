const Property = require("../Model/Proprtyschema");
const AppErr = require("../Services/AppErr");

// Create a property
const createProperty = async (req, res, next) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json({ success: true, message: "Property created", data: property });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create property", 500));
  }
};

// Get all properties
const getAllProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ deletedAt: null })
      .populate("owner")
      .populate("category")
      .populate("villaDetails")
      .populate("cottageDetails")
      .populate("campingDetails")
      .populate("hotelDetails");

    res.status(200).json({ success: true, data: properties });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch properties", 500));
  }
};

// Get single property
const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id)
      .populate("owner")
      .populate("category")
      .populate("villaDetails")
      .populate("cottageDetails")
      .populate("campingDetails")
      .populate("hotelDetails");

    if (!property || property.deletedAt) {
      return next(new AppErr("Property not found", 404));
    }

    res.status(200).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    next(new AppErr("Error fetching property", 500));
  }
};

// Update property
const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Property.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      return next(new AppErr("Property not found", 404));
    }

    res.status(200).json({ success: true, message: "Property updated", data: updated });
  } catch (err) {
    console.error(err);
    next(new AppErr("Error updating property", 500));
  }
};

// Soft delete property
const softDeleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Property.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });

    if (!deleted) {
      return next(new AppErr("Property not found", 404));
    }

    res.status(200).json({ success: true, message: "Property soft deleted", data: deleted });
  } catch (err) {
    console.error(err);
    next(new AppErr("Error deleting property", 500));
  }
};

// Get all properties of an owner
const getPropertiesByOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    const properties = await Property.find({ owner: ownerId, deletedAt: null })
      .populate("category")
      .populate("villaDetails")
      .populate("cottageDetails")
      .populate("campingDetails")
      .populate("hotelDetails");

    res.status(200).json({ success: true, data: properties });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch properties by owner", 500));
  }
};

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  softDeleteProperty,
  getPropertiesByOwner,
};
