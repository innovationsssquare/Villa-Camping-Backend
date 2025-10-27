// models/CouponOffer.js
const mongoose = require("mongoose");

const CouponOfferSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["coupon", "offer"],
      required: true,
      description:
        "Differentiates between admin offers and property owner coupons",
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    discount: {
      amount: { type: Number, required: true }, // Discount amount
      type: { type: String, enum: ["percentage", "fixed"], required: true }, // Percentage or fixed discount
    },
    maxDiscount: { type: Number, required: true }, // Maximum discount that can be applied
    validTill: { type: Date, required: true }, // Validity of the offer/coupon
    minNights: { type: Number, required: false }, // Optional, only for property owner coupons with minimum nights restriction
    isActive: { type: Boolean, default: false }, // Whether the coupon or offer is active
    usageLimit: { type: Number, default: 20 }, // How many times the coupon/offer can be used
    userLimit: { type: Number, default: 1 }, // Limit per user
    propertyTypes: {
      type: String,
      enum: ["villa", "cottage", "camping", "hotel"],
      required: false,
    },
   // Property types applicable for admin offers, optional for property owner coupons
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: false,
    }, // Property reference, only for property owner coupons
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    }, // Admin who created the offer, only for admin offers
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: false,
    }, // Property owner who created the coupon, only for property owner coupons
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users to whom the coupon is assigned
    devicesUsed: [{ type: String }], // Track device fingerprints (device IDs) for each coupon usage
  },
  { timestamps: true }
);

module.exports = mongoose.model("CouponOffer", CouponOfferSchema);
