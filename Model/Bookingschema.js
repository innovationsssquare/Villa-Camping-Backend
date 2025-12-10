const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  propertyType: {
    type: String,
    enum: ["Villa", "Camping", "Hotels", "Cottages"],
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
    required: false,
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
  bookingMode: {
    type: String,
    enum: ["online", "offline"],
    default: "online",
    index: true,
  },
  createdBy: {
    type: String,
    enum: ["system", "owner", "admin"],
    default: "system",
  },
  // Enhanced Coupon System
  coupon: {
    applied: { type: Boolean, default: false },
    code: { type: String },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
    },
    discountValue: { type: Number },
    discountAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    appliedAt: { type: Date },
  },

  // Pricing Breakdown
  pricing: {
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
  },

  // Partial Payment System
  paymentPlan: {
    type: {
      type: String,
      enum: ["full", "partial"],
      default: "full",
    },
    partialPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    amountDue: { type: Number },
    remainingAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
  },

  // Payment Tracking
  payments: [
    {
      amount: { type: Number, required: true },
      currency: { type: String, default: "INR" },
      status: {
        type: String,
        enum: ["pending", "successful", "failed", "refunded"],
        default: "pending",
      },
      paymentType: {
        type: String,
        enum: ["partial", "full", "remaining"],
        required: true,
      },
      paymentMethod: {
        type: String,
        enum: ["card", "upi", "netbanking", "wallet", "cash"],
      },
      transactionId: String,
      gatewayResponse: mongoose.Schema.Types.Mixed,
      gatewayFee: {
        type: Number,
        default: 0,
      }, // Track gateway fee per transaction
      paidAt: Date,
      refundedAt: Date,
      refundAmount: Number,
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // Overall Payment Status
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partially_paid", "fully_paid", "refunded", "failed"],
    default: "unpaid",
  },

  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },

  // Payout Reference
  payoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payout",
  },
  payoutStatus: {
    type: String,
    enum: ["not_created", "pending", "processing", "completed"],
    default: "not_created",
  },

  deviceId: {
    type: String,
  },

  // Cancellation Details
  cancellation: {
    cancelled: { type: Boolean, default: false },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reason: String,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
    },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware
BookingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total paid amount
BookingSchema.virtual("totalPaid").get(function () {
  return this.payments
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + p.amount, 0);
});

// Virtual for pending payment amount
BookingSchema.virtual("pendingAmount").get(function () {
  return this.pricing.totalAmount - this.totalPaid;
});

// Virtual for total gateway fees
BookingSchema.virtual("totalGatewayFees").get(function () {
  return this.payments
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + (p.gatewayFee || 0), 0);
});

// Ensure virtuals are included
BookingSchema.set("toJSON", { virtuals: true });
BookingSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Booking", BookingSchema);
