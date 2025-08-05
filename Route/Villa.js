const express = require("express");
const {
  createVilla,
  getAllVillas,
  getVillaById,
  updateVilla,
  softDeleteVilla,
  getVillaByProperty,
  addVillaReview,
  approveRejectVilla,
  addCommissionAndUpdateStatus
} = require("../Controller/Villa");

const VillaRouter = express.Router();

VillaRouter.post("/create/villa", createVilla);
VillaRouter.get("/get/villas", getAllVillas);
VillaRouter.get("/get/villa/:id", getVillaById);
VillaRouter.put("/update/villa/:id", updateVilla);
VillaRouter.delete("/delete/villa/:id", softDeleteVilla);
VillaRouter.get("/get/villas/property/:propertyId", getVillaByProperty);
// villaRoutes.js or wherever your router lives
VillaRouter.post("/:villaId/reviews", addVillaReview);

VillaRouter.put("/approve-reject/:id", approveRejectVilla);
VillaRouter.put("/add-commission/:id", addCommissionAndUpdateStatus);
module.exports = { VillaRouter };
