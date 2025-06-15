const mongoose = require("mongoose");

// Tent Schema
const TentSchema = new mongoose.Schema({
  camping: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Camping",
    required: true,
  },
  type: { type: String, enum: ["Couple", "Family", "Group"], required: true },
  minCapacity: Number,
  maxCapacity: Number,
  isAvailable: { type: Boolean, default: true },
  pricePerNight: Number,
  bookedDates: [{ checkIn: Date, checkOut: Date }],
  status: { type: String, enum: ["available", "booked"], default: "available" },
  amenities: [String],
  images: [String],
  deletedAt: { type: Date, default: null },
});

// Camping Schema
const CampingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  tents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tent" }],
  deletedAt: { type: Date, default: null },
});

// Export both models correctly
module.exports = {
  Camping: mongoose.model("Camping", CampingSchema),
  Tent: mongoose.model("Tent", TentSchema),
};
