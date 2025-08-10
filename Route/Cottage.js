const express = require("express");
const {
  createCottage,
  getAllCottages,
  getCottageById,
  updateCottage,
  softDeleteCottage,
  getCottageByProperty,
  addCottageReview,
  approveAndUpdateCottage
} = require("../Controller/Cottage");

const CottageRouter = express.Router();

CottageRouter.post("/create/cottage", createCottage);
CottageRouter.get("/get/cottages", getAllCottages);
CottageRouter.get("/get/cottage/:id", getCottageById);
CottageRouter.put("/update/cottage/:id", updateCottage);
CottageRouter.delete("/delete/cottage/:id", softDeleteCottage);
CottageRouter.get("/get/cottages/property/:propertyId", getCottageByProperty);
CottageRouter.post("/add/review/:cottageId", addCottageReview);
CottageRouter.put("/approve-reject/:id", approveAndUpdateCottage);

module.exports = { CottageRouter };
