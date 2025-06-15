const express = require("express");
const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  softDeleteAdmin,
} = require("../Controller/Admin");

const verifyFirebaseToken = require("../Middlewares/verifyFirebaseToken");

const AdminRouter = express.Router();

AdminRouter.post("/create/admin", verifyFirebaseToken, createAdmin);
AdminRouter.get("/get/admins", verifyFirebaseToken, getAllAdmins);
AdminRouter.get("/get/admin/:id", verifyFirebaseToken, getAdminById);
AdminRouter.put("/update/admin/:id", verifyFirebaseToken, updateAdmin);
AdminRouter.delete("/delete/admin/:id", verifyFirebaseToken, softDeleteAdmin);

module.exports = { AdminRouter };
