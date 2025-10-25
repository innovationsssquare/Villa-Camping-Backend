const express = require("express");
const {
  createCamping,
  getAllCampings,
  getCampingById,
  updateCamping,
  softDeleteCamping,
  getCampingByProperty,
  approveAndUpdateCamping,
  updateCampingTentTypePricing
} = require("../Controller/Camping");

const CampingRouter = express.Router();

CampingRouter.post("/create/camping", createCamping);
CampingRouter.get("/get/campings", getAllCampings);
CampingRouter.get("/get/camping/:id", getCampingById);
CampingRouter.put("/update/camping/:id", updateCamping);
CampingRouter.delete("/delete/camping/:id", softDeleteCamping);
CampingRouter.get("/get/campings/property/:propertyId", getCampingByProperty);
CampingRouter.put("/approve-reject/:id", approveAndUpdateCamping);
CampingRouter.put("/camping/:campingId/tents/pricing", updateCampingTentTypePricing);

module.exports = { CampingRouter };
