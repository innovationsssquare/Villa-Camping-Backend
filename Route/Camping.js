const express = require("express");
const {
  createCamping,
  getAllCampings,
  getCampingById,
  updateCamping,
  softDeleteCamping,
  getCampingByProperty,
} = require("../Controller/Camping");

const CampingRouter = express.Router();

CampingRouter.post("/create/camping", createCamping);
CampingRouter.get("/get/campings", getAllCampings);
CampingRouter.get("/get/camping/:id", getCampingById);
CampingRouter.put("/update/camping/:id", updateCamping);
CampingRouter.delete("/delete/camping/:id", softDeleteCamping);
CampingRouter.get("/get/campings/property/:propertyId", getCampingByProperty);

module.exports = { CampingRouter };
