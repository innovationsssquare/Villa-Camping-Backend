const mongoose = require("mongoose");

const VillaSchema = new mongoose.Schema(
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
    },

    description: {
      type: String,
    },

    address: {
      addressLine: { type: String },
      city: { type: String },
      area: { type: String },
    },
    coordinates: { type: [Number], required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    nearbyattractions: [
      {
        nearbylocation: { type: String },
        distance: { type: String },
      },
    ],
    bhkType: {
      type: String,
      enum: ["1BHK", "2BHK", "3BHK", "4BHK"],
      default: "2BHK",
    },

    maxCapacity: {
      type: Number,
      default: 10,
    },
    rooms: { type: Number },
    baths: { type: Number },
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
          "Lake View"
        ],
      },
    ],

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

    extraPersonCharge: {
      type: Number,
      default: 1000,
    },

    kitchenCharge: {
      type: Number,
      default: 1000,
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
    topamenities: [String],

    images: [String],
    reelVideo: { type: String },

    houseRules: [String],

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
    kitchenPolicy: [String],
    relocationPolicy: [String],
    spaces: [
      {
        image: { type: String },
        name: { type: String },
        description: { type: String },
        details: [String],
      },
    ],
    tags: [
      {
        type: String,
        enum: ["popular", "trending", "new"],
      },
    ],
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
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },

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
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Villa", VillaSchema);
