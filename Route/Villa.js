const express = require("express");
const {
  createVilla,
  getAllVillas,
  getVillaById,
  updateVilla,
  softDeleteVilla,
  getVillaByProperty,
} = require("../Controller/Villa");

const VillaRouter = express.Router();

VillaRouter.post("/create/villa", createVilla);
VillaRouter.get("/get/villas", getAllVillas);
VillaRouter.get("/get/villa/:id", getVillaById);
VillaRouter.put("/update/villa/:id", updateVilla);
VillaRouter.delete("/delete/villa/:id", softDeleteVilla);
VillaRouter.get("/get/villas/property/:propertyId", getVillaByProperty);

module.exports = { VillaRouter };
