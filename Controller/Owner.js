const { validationResult } = require("express-validator");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");
const Villa = require("../Model/Villaschema");
const Hotel = require("../Model/Hotelschema");
const Cottage = require("../Model/Cottageschema");
const Camping = require("../Model/Campingschema");
const Category = require("../Model/Categoryschema");

const getPropertiesByCategorySlug = async (req, res, next) => {
  try {
    const { ownerId, categorySlug } = req.params;

    // Validate category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return next(new AppErr("Category not found", 404));
    }

    const refType = category.name;
    console.log(refType);
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
    console.log(matchedProperties)
    const refIds = matchedProperties.map((p) => p.refId);

    const modelMap = {
      Villa: Villa,
      Camping: Camping.Camping,
      Hotel: Hotel.Hotels,
      Cottage: Cottage.Cottages,
    };

    const Model = modelMap[refType];
    console.log(Model)
    if (!Model) {
      return next(new AppErr("Model not found for category", 500));
    }

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

const getAllOwnerProperties = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    // Correct model references for each property type
    const modelMap = {
      Villa: Villa,
      Camping: Camping.Camping,
      Hotel: Hotel.Hotels,
      Cottage: Cottage.Cottages,
    };

    const allProperties = [];

    for (const property of owner.properties) {
      const { refType, refId } = property;
      console.log("Looking for:", refType, refId);

      const Model = modelMap[refType];

      if (!Model || typeof Model.findById !== "function") {
        console.warn(`Invalid or missing model for refType: ${refType}`);
        continue;
      }

      const data = await Model.findById(refId);
      if (data) {
        allProperties.push({
          refType,
          refId,
          ...data._doc,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: allProperties,
    });
  } catch (error) {
    console.error("getAllOwnerProperties error:", error);
    next(new AppErr(error.message || "Server error", 500));
  }
};



// const getAllOwnerProperties = async (req, res, next) => {
//   try {
//     const { ownerId } = req.params;

//     const owner = await Owner.findById(ownerId);
//     if (!owner) {
//       return next(new AppErr("Owner not found", 404));
//     }

//     const allProperties = [];

//     for (const property of owner.properties) {
//       const { refType, refId } = property;
//       const Model = modelMap[refType];

//       if (!Model) {
//         console.warn(`No model found for refType: ${refType}`);
//         continue; // skip unknown types
//       }

//       const data = await Model.findById(refId);
//       if (data) {
//         allProperties.push({ refType, ...data._doc });
//       }
//     }

//     return res.status(200).json({
//       status: true,
//       data: allProperties,
//     });
//   } catch (error) {
//     next(new AppErr(error.message || "Server error", 500));
//   }
// };

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
    const { page = 1, limit = 10, isVerified } = req.query; // Default to page 1 and limit 10 if not provided

    // Build the filter to include or exclude verified owners
    const filter = { deletedAt: null };
    if (isVerified !== undefined) {
      filter.isVerified = isVerified === "true"; // Convert to boolean based on the query parameter
    }

    // Calculate pagination values
    const skip = (page - 1) * limit;
    const totalOwners = await Owner.countDocuments(filter); // Total number of owners
    const totalPages = Math.ceil(totalOwners / limit); // Total number of pages

    // Fetch the owners with pagination and populated properties
    const owners = await Owner.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: "properties",
        populate: { path: "category" }, // Ensure Property schema has 'category' populated
      });

    if (!owners || owners.length === 0) {
      return next(new AppErr("No owners found", 404));
    }

    res.status(200).json({
      success: true,
      data: owners,
      pagination: {
        total: totalOwners,  // Total number of owners
        page: Number(page),  // Current page number
        limit: Number(limit), // Properties per page
        totalPages: totalPages, // Total number of pages
      },
    });
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

    // Check if owner has any properties
    const hasProperties =
      Array.isArray(owner.properties) && owner.properties.length > 0;

    const { bankDetails, documents } = owner;

    const isBankDetailsFilled =
      bankDetails &&
      bankDetails.accountHolderName &&
      bankDetails.accountNumber &&
      bankDetails.ifscCode &&
      bankDetails.bankName &&
      bankDetails.branchName &&
      bankDetails.upiId;

    const requiredTypes = ["adhaar", "agreement", "bank_passbook"];
    const uploadedTypes = Array.isArray(documents)
      ? documents.map((doc) => doc.type)
      : [];

    const isDocumentsUploaded = requiredTypes.every((type) =>
      uploadedTypes.includes(type)
    );

    const profileCompletionStatus = {
      propertyAdded: hasProperties,
      bankDetailsComplete: !!isBankDetailsFilled,
      documentsComplete: !!isDocumentsUploaded,
    };

    if (!hasProperties) {
      return res.status(200).json({
        success: true,
        showReminder: false,
        message: "No properties found for this owner. Skipping profile check.",
        data: profileCompletionStatus,
      });
    }

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

    // Format the new documents
    const newFormattedDocuments = documents.map((doc) => ({
      type: doc.type,
      title: doc.title,
      description: doc.description,
      date: doc.date,
      size: doc.size,
      status: doc.status || "available",
      downloadUrl: doc.downloadUrl,
    }));

    const owner = await Owner.findById(req.params.ownerId);

    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    // Combine existing and new documents
    const updatedDocuments = [
      ...(owner.documents || []),
      ...newFormattedDocuments,
    ];

    // Save the updated documents
    owner.documents = updatedDocuments;
    owner.documentsUpdated = true;
    await owner.save();

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully",
      data: owner.documents,
    });
  } catch (err) {
    next(new AppErr(err.message || "Failed to upload documents", 500));
  }
};

const getOwnerCounts = async (req, res, next) => {
  try {
    // Count total owners, verified owners, and not verified owners
    const totalOwners = await Owner.countDocuments({ deletedAt: null });
    const verifiedOwners = await Owner.countDocuments({
      isVerified: true,
      deletedAt: null,
    });
    const notVerifiedOwners = await Owner.countDocuments({
      isVerified: false,
      deletedAt: null,
    });

    res.status(200).json({
      success: true,
      data: {
        totalOwners,
        verifiedOwners,
        notVerifiedOwners,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error fetching owner counts", 500));
  }
};

const verifyOwner = async (req, res, next) => {
  try {
    const { id } = req.params;  // Get the owner ID from the route parameter
    const { isVerified } = req.body;  // Get the verification status from the request body

    if (typeof isVerified !== "boolean") {
      return next(new AppErr("isVerified must be a boolean value", 400));
    }

    // Find the owner by ID
    const owner = await Owner.findById(id);
    if (!owner) {
      return next(new AppErr("Owner not found", 404));
    }

    // Update the owner's verification status
    owner.isVerified = isVerified;

    // Save the updated owner data
    await owner.save();

    res.status(200).json({
      success: true,
      message: isVerified ? "Owner verified successfully" : "Owner unverified successfully",
      data: owner,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to verify the owner", 500));
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
  uploadOwnerDocuments,
  getOwnerCounts,
  verifyOwner
};
