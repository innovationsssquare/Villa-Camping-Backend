const express = require("express");

const {
  createSupportTicket,
  getMySupportTickets,
  getAllSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
  deleteSupportTicket,
} = require("../Controller/Support");
const SupportRouter = express.Router();

// If you have auth middlewares, import them:
// const { protect, restrictTo } = require("../controllers/authController");

// Owner app – create ticket from SupportScreen
SupportRouter.post(
  "/create-ticket",
  // protect,
  createSupportTicket
);

// Owner app – get tickets of logged-in owner
SupportRouter.get(
  "/my-tickets",
  // protect,
  getMySupportTickets
);

// Admin panel – get all tickets
SupportRouter.get(
  "/",
  // protect,
  // restrictTo("admin", "superadmin"),
  getAllSupportTickets
);

// Admin panel – get single ticket details
SupportRouter.get(
  "/:id",
  // protect,
  // restrictTo("admin", "superadmin"),
  getSupportTicketById
);

// Admin panel – update ticket status / add reply
SupportRouter.patch(
  "/:id",
  // protect,
  // restrictTo("admin", "superadmin"),
  updateSupportTicketStatus
);

// Admin panel – soft delete ticket
SupportRouter.delete(
  "/:id",
  // protect,
  // restrictTo("admin", "superadmin"),
  deleteSupportTicket
);

module.exports = {SupportRouter};
