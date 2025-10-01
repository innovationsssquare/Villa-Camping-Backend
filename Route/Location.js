const express = require("express");
const {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
} = require("../Controller/Location");

const LocationRouter = express.Router();

LocationRouter.post("/create/location", createLocation);
LocationRouter.get("/get/locations", getLocations);
LocationRouter.get("/get/location/:id", getLocationById);
LocationRouter.put("/update/location/:id", updateLocation);
LocationRouter.delete("/delete/location/:id", deleteLocation);

module.exports = { LocationRouter };
