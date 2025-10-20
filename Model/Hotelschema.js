const mongoose = require("mongoose");

// Room Unit Schema (aligning with the Cottage Unit Schema)
const RoomUnitSchema = new mongoose.Schema(
  {
    Hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
    },
    roomType: {
      type: String,
      enum: ["Standard Room", "Deluxe Room", "Suit"],
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    totalRooms: {
      type: Number,
      default: 1,
    },
    maxCapacity: {
      type: Number,
      required: true,
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
    bookedDates: [
      {
        checkIn: Date,
        checkOut: Date,
      },
    ],
    status: {
      type: String,
      enum: ["available", "booked"],
      default: "available",
    },
    amenities: [String],
    images: [String],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hotel Schema (aligning with the Camping and Cottage schemas)
const HotelSchema = new mongoose.Schema(
  {
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
      required: true,
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
    amenities: [String],
    coordinates: { type: [Number], required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    nearbyattractions: [String],
    topamenities: [String],
    images: [String],
    reelVideo: { type: String },
    HotelRules: [String],
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
    highlights: [
      {
        title: { type: String },
        description: { type: String },
        image: { type: String },
      },
    ],
    cancellationPolicy: [String],
    paymentTerms: [String],

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

      foodOptions: {
      available: [
        {
          type: String,
          enum: ["Breakfast", "Lunch", "High Tea", "Dinner"],
          trim: true,
        },
      ],
      default: [],
      adultPrice: { type: Number, default: 0, min: 0 },
      childPrice: { type: Number, default: 0, min: 0 },
      note: { type: String, trim: true, default: "" },
    },
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
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = {
  Hotels: mongoose.model("Hotels", HotelSchema),
  Room: mongoose.model("Room", RoomUnitSchema),
};
