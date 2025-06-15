const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    bookedVilla: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Villa",
      default: null,
    },
    bookedCottage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cottage",
      default: null,
    },
    bookedTent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tent",
      default: null,
    },
    bookedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    amountPaid: Number,
    totalAmount: Number,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    bookingRules: {
      type: String,
      default: "No refund on cancellations within 48 hours of check-in.",
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
