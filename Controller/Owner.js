const { validationResult } = require("express-validator");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");
const Villa = require("../Model/Villaschema");
const Hotel = require("../Model/Hotelschema");
const Cottage = require("../Model/Cottageschema");
const Camping = require("../Model/Campingschema");
const Category = require("../Model/Categoryschema");


const getPropertiesByCategorySlug = async (req, res, next) => {
  // try {
  //   const { ownerId, categorySlug } = req.params;

  //   // Validate category by slug
  //   const category = await Category.findOne({ slug: categorySlug });
  //   if (!category) {
  //     return res
  //       .status(404)
  //       .json({ success: false, message: "Category not found" });
  //   }

  //   const refType = category.name;

  //   // Validate refType
  //   if (!["Villa", "Camping", "Hotel", "Cottage"].includes(refType)) {
  //     return res
  //       .status(400)
  //       .json({ success: false, message: "Unsupported category type" });
  //   }

  //   // Find owner
  //   const owner = await Owner.findById(ownerId);
  //   if (!owner) {
  //     return res
  //       .status(404)
  //       .json({ success: false, message: "Owner not found" });
  //   }

  //   // Filter properties by refType
  //   const matchedProperties = owner.properties.filter(
  //     (p) => p.refType === refType
  //   );

  //   const refIds = matchedProperties.map((p) => p.refId);

  //   // Dynamically select model
  //   const modelMap = {
  //     Villa,
  //     Camping,
  //     Hotel,
  //     Cottage,
  //   };

  //   const propertiesData = await modelMap[refType].find({
  //     _id: { $in: refIds },
  //   });

  //   return res.status(200).json({
  //     success: true,
  //     data: propertiesData,
  //   });
  // } catch (error) {
  //   console.error(error);
  //   return res.status(500).json({ success: false, message: "Server error" });
  // }

  try {
    const { ownerId, categorySlug } = req.params;

    // Validate category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return next(new AppErr("Category not found", 404));
    }

    const refType = category.name;

    if (!["Villa", "Camping", "Hotel", "Cottage"].includes(refType)) {
      return next(new AppErr("Unsupported category type", 400));
    }

    // Validate owner
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    // Filter properties by category
    const matchedProperties = owner.properties.filter(
      (p) => p.refType === refType
    );

    const refIds = matchedProperties.map((p) => p.refId);

    const modelMap = { Villa, Camping, Hotel, Cottage };
    const Model = modelMap[refType];

    const propertiesData = await Model.find({ _id: { $in: refIds } });

    return res.status(200).json({
      success: true,
      data: propertiesData,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Server error", 500));
  }
};

const modelMap = {
  Villa,
  Hotel,
  Camping,
  Cottage,
};

const getAllOwnerProperties = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    const allProperties = [];

    for (const property of owner.properties) {
      const { refType, refId } = property;
      const Model = modelMap[refType];

      if (!Model) {
        console.warn(`No model found for refType: ${refType}`);
        continue; // skip unknown types
      }

      const data = await Model.findById(refId);
      if (data) {
        allProperties.push({ refType, ...data._doc });
      }
    }

    return res.status(200).json({
      status: true,
      data: allProperties,
    });
  } catch (error) {
    next(new AppErr(error.message || "Server error", 500));
  }
};

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

    const updatedOwner = await Owner.findByIdAndUpdate(id, req.body, {
      new: true,
    });

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
    const deletedOwner = await Owner.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

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

const checkOwnerProfileCompletion = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    if (!ownerId) {
      return next(new AppErr("Owner ID is required", 400));
    }

    const owner = await Owner.findById(ownerId);

    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    // If owner has no properties, skip the profile completion check
    const hasProperties = Array.isArray(owner.properties) && owner.properties.length > 0;

    if (!hasProperties) {
      return res.status(200).json({
        success: true,
        showReminder: false,
        message: "No properties found for this owner. Skipping profile check.",
        data: null,
      });
    }

    const { bankDetails, documents } = owner;

    const isBankDetailsFilled =
      bankDetails &&
      bankDetails.accountHolderName &&
      bankDetails.accountNumber &&
      bankDetails.ifscCode &&
      bankDetails.bankName &&
      bankDetails.branchName &&
      bankDetails.upiId;

    const requiredTypes = ["Adhaar", "Agreement", "BankProof"];
    const uploadedTypes = Array.isArray(documents)
      ? documents.map((doc) => doc.type)
      : [];

    const isDocumentsUploaded = requiredTypes.every((type) =>
      uploadedTypes.includes(type)
    );

    const profileCompletionStatus = {
      bankDetailsComplete: !!isBankDetailsFilled,
      documentsComplete: !!isDocumentsUploaded,
    };

    if (!isBankDetailsFilled || !isDocumentsUploaded) {
      return res.status(200).json({
        success: true,
        showReminder: true,
        message: "Please complete your profile (bank details/documents)",
        data: profileCompletionStatus,
      });
    }

    return res.status(200).json({
      success: true,
      showReminder: false,
      message: "Profile is complete",
      data: profileCompletionStatus,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error while fetching owner", 500));
  }
};



const updateBankDetails = async (req, res, next) => {
  try {
    const owner = await Owner.findByIdAndUpdate(
      req.params.ownerId,
      { bankDetails: req.body },
      { new: true, runValidators: true }
    );

    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    res.status(200).json({
      status: true,
      message: "Bank details updated successfully",
      data: owner.bankDetails,
    });
  } catch (err) {
    next(new AppErr(err.message || "Failed to update bank details", 500));
  }
};

const uploadOwnerDocuments = async (req, res, next) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return next(new AppErr("At least one document is required", 400));
    }

    const formattedDocuments = documents.map((doc) => ({
      type: doc.type,
      title: doc.title,
      description: doc.description,
      date: doc.date,
      size: doc.size,
      status: doc.status || "available",
      downloadUrl: doc.downloadUrl,
    }));

    const updatedOwner = await Owner.findByIdAndUpdate(
      req.params.ownerId,
      {
        documents: formattedDocuments,
        documentsUpdated: true,
      },
      { new: true, runValidators: true }
    );

    if (!updatedOwner) {
      return next(new AppErr("Owner not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully",
      data: updatedOwner.documents,
    });
  } catch (err) {
    next(new AppErr(err.message || "Failed to upload documents", 500));
  }
};



module.exports = {
  createOwner,
  getAllOwners,
  getSingleOwner,
  updateOwner,
  deleteOwner,
  loginOwnerWithFirebase,
  getPropertiesByCategorySlug,
  getAllOwnerProperties,
  checkOwnerProfileCompletion,
  updateBankDetails,
  uploadOwnerDocuments
};
