const mongoose = require("mongoose");

// Tent Schema
const TentSchema = new mongoose.Schema({
  camping: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Camping",
    required: true,
  },
  tentType: {
    type: String,
    enum: ["Single", "Couple", "Family", "luxury", "treehouse"],
    required: true,
  },
  totaltents: { type: Number, required: true },
  minCapacity: Number,
  maxCapacity: Number,
  extraPersonCharge: Number,
  isAvailable: { type: Boolean, default: true },
  pricePerNight: Number,
  bookedDates: [
    {
      checkIn: Date,
      checkOut: Date,
    },
  ],
  status: { type: String, enum: ["available", "booked"], default: "available" },
  amenities: [String],
  tentimages: [String],
  deletedAt: { type: Date, default: null },
});

// Camping Schema
const CampingSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  name: {
    type: String,
  },

  description: {
    type: String,
  },

  address: {
    addressLine: { type: String },
    maplink: { type: String },
    city: { type: String },
    area: { type: String },
  },
  coordinates: { type: [Number], required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
  nearbyattractions: [String],
  topamenities: [String],

  amenities: [String],
  brochure: { type: String },
  greatFor: [
    {
      type: String,
      enum: [
        "Mountain View",
        "Pet-Friendly",
        "Ideal for Families",
        "Beachfront",
        "Ideal for Groups",
      ],
    },
  ],
  images: [String],
  reelVideo: { type: String },

  CampingRules: [String],

  checkInTime: {
    type: String,
    default: "1 PM",
  },

  checkOutTime: {
    type: String,
    default: "11 AM",
  },

  securityDeposit: {
    type: Number,
    default: 3000,
  },

  lateCheckoutCharge: {
    type: Number,
    default: 1000,
  },

  highlights: [
    {
      title: { type: String },
      description: { type: String },
      image: { type: String },
    },
  ],
  cancellationPolicy: [String],
  paymentTerms: [String],

  foodOptions: {
    type: String,
    default: "Homely made food available on request",
  },
  tags: [
    {
      type: String,
      enum: ["popular", "trending", "new"],
    },
  ],
  faqs: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
    },
  ],
  experiences: [
    {
      title: { type: String, required: true },
      description: { type: String },
      image: { type: String, required: true },
      category: { type: String },
      order: { type: Number, default: 0 },
    },
  ],

  exploreStay: [
    {
      title: { type: String, required: true },
      description: { type: String },
      image: { type: String },
      link: { type: String },
    },
  ],
  isapproved: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  commission: {
    type: Number,
  },
  isLive: {
    type: Boolean,
    default: false,
  },
  reviews: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rating: { type: Number, required: true },
      comment: { type: String },
      images: [String],
      isTopReview: { type: Boolean, default: false },
      categories: [String],
      createdAt: { type: Date, default: Date.now },
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["available", "fully_booked"],
    default: "available",
  },
  pricing: {
    weekdayPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    weekendPrice: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  tents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tent" }],
  deletedAt: { type: Date, default: null },
});

// Export both models correctly
module.exports = {
  Camping: mongoose.model("Camping", CampingSchema),
  Tent: mongoose.model("Tent", TentSchema),
};
