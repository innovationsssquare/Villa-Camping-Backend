const express = require("express");
const router = express.Router();
const CottageController = require("../Controller/CottageController");

// Create cottage parent & unit
router.post("/add", CottageController.createCottage);

// Get all cottages
router.get("/getAll", CottageController.getAllCottages);

// Get a single cottage by ID
router.get("/get/:id", CottageController.getCottageById);

// Update cottage unit
router.put("/update/:id", CottageController.updateCottageUnit);

// Soft delete cottage unit
router.delete("/delete/:id", CottageController.deleteCottageUnit);

module.exports = router;
