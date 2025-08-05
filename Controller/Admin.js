const Admin = require("../Model/Adminschema");
const AppErr = require("../Services/AppErr");
const Villa = require("../Model/Villaschema");
const Booking = require("../Model/Bookingschema");
const Camping = require("../Model/Campingschema");
const Cottage = require("../Model/Cottageschema");
const Hotel = require("../Model/Hotelschema");
const Category =require("../Model/Categoryschema")
// Create or Register Admin
const createAdmin = async (req, res, next) => {
  try {
    const {
      firebaseUID,
      fullName,
      email,
      mobile,
      profilePic,
      isSuperAdmin,
      permissions,
    } = req.body;

    const existing = await Admin.findOne({ firebaseUID });
    if (existing) {
      return next(new AppErr("Admin already exists", 400));
    }

    const admin = await Admin.create({
      firebaseUID,
      fullName,
      email,
      mobile,
      profilePic,
      isSuperAdmin,
      permissions,
    });

    res
      .status(201)
      .json({ success: true, message: "Admin created", data: admin });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create admin", 500));
  }
};

// Get all Admins
const getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find({ deletedAt: null });
    res.status(200).json({ success: true, data: admins });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch admins", 500));
  }
};

// Get Admin by ID
const getAdminById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin || admin.deletedAt)
      return next(new AppErr("Admin not found", 404));
    res.status(200).json({ success: true, data: admin });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch admin", 500));
  }
};

// Update Admin
const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Admin.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return next(new AppErr("Admin not found", 404));
    res
      .status(200)
      .json({ success: true, message: "Admin updated", data: updated });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update admin", 500));
  }
};

// Soft Delete Admin
const softDeleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Admin.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!deleted) return next(new AppErr("Admin not found", 404));
    res
      .status(200)
      .json({ success: true, message: "Admin soft deleted", data: deleted });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete admin", 500));
  }
};

const getAllProperties = async (req, res, next) => {
  try {
    // Fetch all properties where the admin is the owner
    const properties = await Villa.find({ owner: req.adminId }); // Assuming admin ID is available in req.adminId

    if (!properties || properties.length === 0) {
      return next(new AppErr("No properties found for this admin", 404));
    }

    res.status(200).json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to fetch properties", 500));
  }
};

// Get booking details for all properties
const getBookingDetails = async (req, res, next) => {
  try {
    // Assuming Booking model has a reference to the villa
    const bookings = await Booking.find({ owner: req.adminId }).populate(
      "villa"
    );

    if (!bookings || bookings.length === 0) {
      return next(new AppErr("No bookings found for this admin", 404));
    }

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to fetch booking details", 500));
  }
};

// Get analytics for admin (e.g., total bookings, total revenue)
const getAnalytics = async (req, res, next) => {
  try {
    const totalBookings = await Booking.countDocuments({ owner: req.adminId });
    const totalRevenue = await Booking.aggregate([
      {
        $match: { owner: req.adminId },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$price" }, // Assuming "price" field in Booking model
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to fetch analytics", 500));
  }
};

// Get total revenue for all properties
const getRevenue = async (req, res, next) => {
  try {
    const revenue = await Booking.aggregate([
      {
        $match: { owner: req.adminId },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$price" }, // Assuming "price" field in Booking model
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: revenue[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to fetch revenue details", 500));
  }
};


const getPropertiesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { isapproved, page, limit } = req.query;

    // Define the model map based on category
    const modelMap = {
      Villa: Villa,
      Camping: Camping.Camping, // Assuming Camping has a .Camping model
      Cottage: Cottage.Cottages, // Assuming Cottage has a .Cottages model
      Hotel: Hotel.Hotels, // Assuming Hotel has a .Hotels model
    };

    // Find the model based on category ID
    const Categoryy = await Category.findById(categoryId); // Assuming there's a Category schema
    if (!Categoryy) {
      return next(new AppErr("Category not found", 404));
    }

    const categoryName = Categoryy.name; // Assume 'name' in Category is Villa, Camping, etc.
    const Model = modelMap[categoryName];

    if (!Model) {
      return next(new AppErr("No model found for this category", 500));
    }

    // Construct the query filter
    const filter = { category: categoryId, deletedAt: null };

    // If `isapproved` is provided, add it to the filter
    if (isapproved) {
      filter.isapproved = isapproved;
    }

    // Pagination calculations
    const skip = (page - 1) * limit;
    const totalProperties = await Model.countDocuments(filter); // Get the total number of properties
    const totalPages = Math.ceil(totalProperties / limit); // Calculate total pages

    // Fetch the properties with pagination
    const properties = await Model.find(filter)
      .skip(skip)
      .limit(Number(limit));

    if (!properties || properties.length === 0) {
      return next(new AppErr("No properties found for this category", 404));
    }

    res.status(200).json({
      success: true,
      data: properties,
      pagination: {
        total: totalProperties, // Total number of properties
        page: Number(page),     // Current page number
        limit: Number(limit),   // Properties per page
        totalPages: totalPages, // Total number of pages
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to fetch properties by category", 500));
  }
};




module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  softDeleteAdmin,
  getAllProperties,
  getBookingDetails,
  getAnalytics,
  getRevenue,
  getPropertiesByCategory
};
