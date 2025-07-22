const { validationResult } = require("express-validator");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");

// Create owner
const createOwner = async (req, res, next) => {
 try {
    const { firebaseUID, name, email, phone, profilePic } = req.body;

    let owner = await Owner.findOne({ firebaseUID, email });

    if (!owner) {
      owner = await Owner.create({
        firebaseUID,
        name,
        email,
        phone,
        profilePic,
      });
    }

    res.status(200).json({
      success: true,
      message: "Owner logged in or registered",
      data: owner,
    });
  } catch (error) {
     next(new AppErr("Login or registration failed", 500));
  }
};

// Login owner using Firebase UID
const loginOwnerWithFirebase = async (req, res, next) => {
  try {
    const { firebaseUID, email } = req.body;

    const owner = await Owner.findOne({ firebaseUID, email });

    if (!owner) {
      return next(new AppErr("Owner not found. Please register first.", 404));
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: owner,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error logging in owner", 500));
  }
};




// Get all owners
const getAllOwners = async (req, res, next) => {
  try {
    const owners = await Owner.find({ deletedAt: null }).populate({
      path: "properties",
      populate: { path: "category" }, // Ensure Property schema has 'category' populated
    });

    res.status(200).json({ success: true, data: owners });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error fetching owners", 500));
  }
};

// Get single owner by ID
const getSingleOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const owner = await Owner.findById(id).populate({
      path: "properties",
      populate: { path: "category" },
    });

    if (!owner) return next(new AppErr("Owner not found", 404));

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error fetching owner", 500));
  }
};

// Update owner
const updateOwner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedOwner = await Owner.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedOwner) return next(new AppErr("Owner not found", 404));

    res.status(200).json({
      success: true,
      message: "Owner updated successfully",
      data: updatedOwner,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error updating owner", 500));
  }
};

// Soft delete owner
const deleteOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedOwner = await Owner.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });

    if (!deletedOwner) return next(new AppErr("Owner not found", 404));

    res.status(200).json({
      success: true,
      message: "Owner deleted successfully",
      data: deletedOwner,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error deleting owner", 500));
  }
};

// Add property to owner
// const addPropertyToOwner = async (req, res, next) => {
//   try {
//     const { ownerId, propertyId } = req.params;

//     const owner = await Owner.findById(ownerId);
//     if (!owner) return next(new AppErr("Owner not found", 404));

//     const property = await Property.findById(propertyId);
//     if (!property) return next(new AppErr("Property not found", 404));

//     if (!owner.properties.includes(propertyId)) {
//       owner.properties.push(propertyId);
//       await owner.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: "Property added to owner",
//       data: owner,
//     });
//   } catch (error) {
//     console.error(error);
//     next(new AppErr("Error adding property to owner", 500));
//   }
// };

module.exports = {
  createOwner,
  getAllOwners,
  getSingleOwner,
  updateOwner,
  deleteOwner,
  loginOwnerWithFirebase
};
