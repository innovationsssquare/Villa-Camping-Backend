const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  propertyType: {
    type: String,
    enum: ["Villa", "Camping", "Hotel", "Cottage"],
    required: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "propertyType",
    required: true,
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  customerDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String },
  },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },

  guests: {
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
  },

  items: [
    {
      unitType: {
        type: String,
        enum: ["Tent", "CottageUnit", "RoomUnit", "VillaUnit"],
        required: true,
      },
      unitId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "items.unitType",
      },
      typeName: String,
      quantity: { type: Number, required: true },
      pricePerNight: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
  ],

  payment: {
    amount: Number,
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: String,
  },

  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", BookingSchema);
