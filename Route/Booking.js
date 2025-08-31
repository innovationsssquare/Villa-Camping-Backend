const express = require("express");
const {
  createBooking,
  verifyPaymentAndConfirm,
  getBookingById,
  getBookingsByCustomer,
  getBookingsByOwner,
  cancelBooking,
} = require("../Controller/Booking");

const BookingRouter = express.Router();

BookingRouter.post("/create", createBooking);
BookingRouter.post("/verify", verifyPaymentAndConfirm);

BookingRouter.get("/:id", getBookingById);
BookingRouter.get("/customer/:customerId", getBookingsByCustomer);
BookingRouter.get("/owner/:ownerId", getBookingsByOwner);

BookingRouter.put("/cancel/:id", cancelBooking);

module.exports = { BookingRouter };
