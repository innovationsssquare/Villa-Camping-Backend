const express = require("express");
const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  softDeleteAdmin,
  getAllProperties,
  getBookingDetails,
  getAnalytics,
  getRevenue,
  getPropertiesByCategory
} = require("../Controller/Admin");

const verifyToken = require("../MiddleWare/Verfiytoken");

const AdminRouter = express.Router();

AdminRouter.post("/create/admin", verifyToken, createAdmin);
AdminRouter.get("/get/admins", verifyToken, getAllAdmins);
AdminRouter.get("/get/admin/:id", verifyToken, getAdminById);
AdminRouter.put("/update/admin/:id", verifyToken, updateAdmin);
AdminRouter.delete("/delete/admin/:id", verifyToken, softDeleteAdmin);

AdminRouter.get("/properties", getAllProperties);

// Get booking details of all properties
AdminRouter.get("/bookings", getBookingDetails);

// Get analytics (e.g., total bookings, total revenue, etc.)
AdminRouter.get("/analytics", getAnalytics);

// Get total revenue from bookings
AdminRouter.get("/revenue", getRevenue);
AdminRouter.get("/properties/category/:categoryId", getPropertiesByCategory);



module.exports = { AdminRouter };
