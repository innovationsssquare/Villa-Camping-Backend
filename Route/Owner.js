const express = require("express");
const { body } = require("express-validator");
const {
  createOwner,
  getAllOwners,
  getSingleOwner,
  updateOwner,
  deleteOwner,
  addPropertyToOwner,
  loginOwnerWithFirebase,
} = require("../Controller/Owner");

const OwnerRouter = express.Router();

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
  createOwner
);

OwnerRouter.put("/update/owner/:id", updateOwner);
OwnerRouter.get("/get/owners", getAllOwners);
OwnerRouter.get("/get/owner/:id", getSingleOwner);
OwnerRouter.delete("/delete/owner/:id", deleteOwner);
OwnerRouter.put("/owner/:ownerId/add-property/:propertyId", addPropertyToOwner);

module.exports = { OwnerRouter };
