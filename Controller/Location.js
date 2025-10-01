const Location = require("../Model/Locationschema");
const AppErr = require("../Services/AppErr");

/**
 * Create Location
 */
const createLocation = async (req, res, next) => {
  try {
    const { name, type, coordinates } = req.body;
    // basic validation
    if (!name || !type || !coordinates) {
      return next(new AppErr("name, type and coordinates are required", 400));
    }

    // avoid duplicate name
    const existing = await Location.findOne({ name });
    if (existing) {
      return next(new AppErr("Location with this name already exists", 409));
    }

    const location = await Location.create(req.body);
    res.status(201).json({ success: true, data: location });
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
    next(new AppErr("Failed to create location", 500));
  }
};

/**
 * Get locations (with optional filters + pagination)
 * Query params: page, limit, type, isPopular, search
 *
 * If `page` is not provided -> returns all matching documents and `pagination.page` will be `null`
 */
const getLocations = async (req, res, next) => {
  try {
    const { page, limit = 10, type, isPopular, search } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const total = await Location.countDocuments(filter);

    // If page is provided -> paginate. Otherwise return all matching docs.
    let locations;
    const limitNumber = Number(limit) || 10;

    if (page !== undefined && page !== null && page !== "") {
      const pageNumber = Number(page) || 1;
      const skip = (pageNumber - 1) * limitNumber;
      locations = await Location.find(filter)
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        data: locations,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    } else {
      // no pagination requested
      locations = await Location.find(filter).sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        data: locations,
        pagination: {
          total,
          page: null,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber) || 0,
        },
      });
    }
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch locations", 500));
  }
};

/**
 * Get single location by id
 */
const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await Location.findById(id);
    if (!location) return next(new AppErr("Location not found", 404));
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch location", 500));
  }
};

/**
 * Update location
 */
const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Location.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return next(new AppErr("Location not found", 404));
    res.status(200).json({ success: true, data: updated });
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
    next(new AppErr("Failed to update location", 500));
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Location.findByIdAndDelete(id);
    if (!removed) return next(new AppErr("Location not found", 404));
    res
      .status(200)
      .json({ success: true, message: "Location deleted", data: removed });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete location", 500));
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};
