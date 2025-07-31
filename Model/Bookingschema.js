const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
  },
  propertyType: {
    type: String,
    enum: ["Villa", "Cottage", "Hotel", "Camping"],
    required: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "propertyType", // Dynamically reference Camping/Villa/Cottage/etc
  },

  // For Camping Bookings: multiple tents with type & quantity
  campingTents: [
    {
      tent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tent",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],

  // Booking Date Range
  checkInDate: {
    type: Date,
    required: true,
  },
  checkOutDate: {
    type: Date,
    required: true,
  },

  guests: {
    adults: Number,
    children: Number,
  },

  priceDetails: {
    subtotal: Number,
    tax: Number,
    discount: Number,
    totalAmount: Number,
    commission: Number,
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },

  bookingStatus: {
    type: String,
    enum: ["confirmed", "cancelled", "completed"],
    default: "confirmed",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
