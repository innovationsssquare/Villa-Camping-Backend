const express = require("express");
const {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  softDeleteProperty,
  getPropertiesByOwner,
} = require("../Controller/Property");

const PropertyRouter = express.Router();

PropertyRouter.post("/create/property", createProperty);
PropertyRouter.get("/get/properties", getAllProperties);
PropertyRouter.get("/get/property/:id", getPropertyById);
PropertyRouter.get("/get/owner/:ownerId/properties", getPropertiesByOwner);
PropertyRouter.put("/update/property/:id", updateProperty);
PropertyRouter.delete("/delete/property/:id", softDeleteProperty);

module.exports = { PropertyRouter };
