const Admin = require("../Model/Admin");
const AppErr = require("../Services/AppErr");

// Create or Register Admin
const createAdmin = async (req, res, next) => {
  try {
    const { firebaseUID, fullName, email, mobile, profilePic, isSuperAdmin, permissions } = req.body;

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

    res.status(201).json({ success: true, message: "Admin created", data: admin });
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
    if (!admin || admin.deletedAt) return next(new AppErr("Admin not found", 404));
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
    res.status(200).json({ success: true, message: "Admin updated", data: updated });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update admin", 500));
  }
};

// Soft Delete Admin
const softDeleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Admin.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
    if (!deleted) return next(new AppErr("Admin not found", 404));
    res.status(200).json({ success: true, message: "Admin soft deleted", data: deleted });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete admin", 500));
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  softDeleteAdmin,
};
