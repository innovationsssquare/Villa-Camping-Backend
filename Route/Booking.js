const express = require("express");
const {
  createBooking,
  verifyPaymentAndConfirm,
  getBookingById,
  getBookingsByCustomer,
  getBookingsByOwner,
  cancelBooking,
  getBookingCountsByStatus,
  getPropertyBookings,
  createOfflineBooking,
  createOfflineCampingBooking,
  createOfflineCottageBooking,
  createOfflineHotelBooking,
  addReview,
  getAllBookings,
  getAllBookingsAdmin
} = require("../Controller/Booking");

const BookingRouter = express.Router();

BookingRouter.post("/create", createBooking);
BookingRouter.post("/createoffline", createOfflineBooking);
BookingRouter.post("/createofflinecamping", createOfflineCampingBooking);
BookingRouter.post("/cottageoffline", createOfflineCottageBooking);
BookingRouter.post("/Hoteloffline", createOfflineHotelBooking);

BookingRouter.post("/verify", verifyPaymentAndConfirm);

BookingRouter.get("/admin", getAllBookingsAdmin);
BookingRouter.get("/:id", getBookingById);
BookingRouter.get("/customer/:customerId", getBookingsByCustomer);
BookingRouter.get("/owner/:ownerId", getBookingsByOwner);

BookingRouter.put("/cancel/:id", cancelBooking);
BookingRouter.get("/counts/:ownerId", getBookingCountsByStatus);
BookingRouter.get("/property/:propertyId", getPropertyBookings);
BookingRouter.post("/write-review", addReview);

module.exports = { BookingRouter };
