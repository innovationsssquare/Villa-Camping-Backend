const express = require("express");
const { body } = require("express-validator");
const {
  createOwner,
  getAllOwners,
  getSingleOwner,
  updateOwner,
  deleteOwner,
  loginOwnerWithFirebase,
  getPropertiesByCategorySlug,
  getAllOwnerProperties,
  checkOwnerProfileCompletion,
  uploadOwnerDocuments,
  updateBankDetails,
  getOwnerCounts
} = require("../Controller/Owner");
const verifyToken = require("../MiddleWare/Verfiytoken");
const verifyGoogleToken = require("../MiddleWare/verifyGoogleToken");

const OwnerRouter = express.Router();

OwnerRouter.get(
  "/properties/:ownerId/:categorySlug",
  getPropertiesByCategorySlug
);
OwnerRouter.get("/owner/properties/:ownerId", getAllOwnerProperties);
OwnerRouter.get(
  "/profile-check/:ownerId",
  verifyGoogleToken,
  checkOwnerProfileCompletion
);
OwnerRouter.put("/update-bank/:ownerId", verifyGoogleToken, updateBankDetails);
OwnerRouter.put(
  "/upload-documents/:ownerId",
  verifyGoogleToken,
  uploadOwnerDocuments
);

// Owner login (Firebase Gmail)
OwnerRouter.post(
  "/login/owner",
  body("firebaseUID").notEmpty().withMessage("firebaseUID is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  loginOwnerWithFirebase
);

// Create owner (manual, fallback)
OwnerRouter.post(
  "/create/owner",
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  verifyGoogleToken,
  createOwner
);

OwnerRouter.put("/update/owner/:id", updateOwner);
OwnerRouter.get("/get/owners", getAllOwners);
OwnerRouter.get("/get/owner/:id", getSingleOwner);
OwnerRouter.delete("/delete/owner/:id", deleteOwner);
OwnerRouter.get("/get-owner-counts", getOwnerCounts);

// OwnerRouter.put("/owner/:ownerId/add-property/:propertyId", addPropertyToOwner);

module.exports = { OwnerRouter };
