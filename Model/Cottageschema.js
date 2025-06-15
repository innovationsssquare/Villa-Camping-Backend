const mongoose = require("mongoose");

// Cottage Unit Schema
const CottageUnitSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  maxCapacity: Number,
  isAvailable: { type: Boolean, default: true },
  pricePerNight: Number,
  seasonalPricing: [{ season: String, price: Number }],
  bookedDates: [{ checkIn: Date, checkOut: Date }],
  status: { type: String, enum: ["available", "booked"], default: "available" },
  amenities: [String],
  images: [String],
  houseRules: [String],
  checkInTime: { type: String, default: "1 PM" },
  checkOutTime: { type: String, default: "11 AM" },
  securityDeposit: { type: Number, default: 3000 },
  cancellationPolicy: { type: String, default: "No refund on cancellations." },
  extraPersonCharge: { type: Number, default: 1000 },
  deletedAt: { type: Date, default: null },
});

// Cottage Schema
const CottageSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  cottages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cottage" }],
  deletedAt: { type: Date, default: null },
});

module.exports = {
  Cottages: mongoose.model("Cottages", CottageSchema),
  Cottage: mongoose.model("Cottage", CottageUnitSchema),
};
