const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema({
  // Reference to booking
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },

  // Owner/Vendor Information
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
    index: true,
  },
  ownerDetails: {
    name: String,
    email: String,
    mobile: String,
    bankAccount: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
    },
    upiId: String,
  },

  // Property Information
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
  propertyName: String,

  // Booking Details
  bookingReference: String,
  checkIn: Date,
  checkOut: Date,
  bookingStatus: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
  },

  // Financial Breakdown
  financials: {
    // Booking Amount
    bookingAmount: {
      type: Number,
      required: true,
    }, // Total booking amount from customer

    // Commission Calculation
    commissionType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    commissionRate: {
      type: Number,
      required: true,
    }, // e.g., 15 for 15% or fixed amount
    commissionAmount: {
      type: Number,
      required: true,
    }, // Calculated commission

    // Tax Calculation (TDS/GST on commission)
    taxOnCommission: {
      tdsRate: { type: Number, default: 0 }, // e.g., 1 for 1% TDS
      tdsAmount: { type: Number, default: 0 },
      gstRate: { type: Number, default: 0 }, // e.g., 18 for 18% GST
      gstAmount: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
    },

    // Gateway/Payment Processing Fee
    paymentGatewayFee: {
      rate: { type: Number, default: 0 }, // e.g., 2 for 2%
      amount: { type: Number, default: 0 },
      deductedFrom: {
        type: String,
        enum: ["owner", "admin", "shared"],
        default: "owner",
      },
    },

    // Payout Calculation
    grossPayout: {
      type: Number,
      required: true,
    }, // bookingAmount - commissionAmount
    deductions: { type: Number, default: 0 }, // taxes + fees if applicable
    netPayout: {
      type: Number,
      required: true,
    }, // Final amount to be paid to owner

    // Admin Earnings
    adminEarnings: {
      commission: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      gatewayFeeShare: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    currency: { type: String, default: "INR" },
  },

  // Payout Schedule
  payoutSchedule: {
    type: {
      type: String,
      enum: ["immediate", "after_checkin", "after_checkout", "scheduled"],
      default: "after_checkout",
    },
    scheduledDate: Date, // When payout should be processed
    holdPeriod: {
      type: Number,
      default: 0,
    }, // Days to hold after checkout (e.g., 7 days)
    eligibleDate: Date, // Calculated date when payout becomes eligible
  },

  // Payout Tracking
  payoutStatus: {
    type: String,
    enum: [
      "pending",
      "eligible",
      "processing",
      "completed",
      "failed",
      "on_hold",
      "cancelled",
    ],
    default: "pending",
    index: true,
  },

  // Payment Transactions to Owner
  payoutTransactions: [
    {
      amount: { type: Number, required: true },
      paymentMethod: {
        type: String,
        enum: ["bank_transfer", "upi", "cheque", "cash", "wallet"],
        required: true,
      },
      transactionId: String, // UTR/Reference number
      transactionDate: Date,
      status: {
        type: String,
        enum: ["initiated", "processing", "completed", "failed", "reversed"],
        default: "initiated",
      },
      remarks: String,
      failureReason: String,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // Refund Handling (if booking cancelled)
  refund: {
    isRefunded: { type: Boolean, default: false },
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
    ownerPenalty: Number, // If owner needs to pay penalty
    adjustedPayout: Number, // Payout after refund adjustment
  },

  // Split Payment (if booking has partial payments)
  splitPayouts: [
    {
      paymentInstallment: {
        type: String,
        enum: ["partial", "remaining", "full"],
      },
      customerPaidAmount: Number,
      ownerPayoutAmount: Number,
      commissionAmount: Number,
      status: {
        type: String,
        enum: ["pending", "completed"],
      },
      paidAt: Date,
    },
  ],

  // Dispute/Hold Information
  dispute: {
    isDisputed: { type: Boolean, default: false },
    disputeReason: String,
    disputeDate: Date,
    resolvedDate: Date,
    resolution: String,
    holdAmount: Number,
  },

  // Notes and Remarks
  notes: {
    internal: String, // Admin notes
    ownerVisible: String, // Notes visible to owner
  },

  // Audit Trail
  statusHistory: [
    {
      status: String,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },
      changedAt: { type: Date, default: Date.now },
      reason: String,
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for better query performance
PayoutSchema.index({ ownerId: 1, payoutStatus: 1 });
PayoutSchema.index({ bookingId: 1 });
PayoutSchema.index({ "payoutSchedule.eligibleDate": 1 });
PayoutSchema.index({ createdAt: -1 });

// Pre-save middleware
PayoutSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total paid to owner
PayoutSchema.virtual("totalPaidToOwner").get(function () {
  return this.payoutTransactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
});

// Virtual for pending payout amount
PayoutSchema.virtual("pendingPayoutAmount").get(function () {
  return this.financials.netPayout - this.totalPaidToOwner;
});

// Method to calculate payout
PayoutSchema.methods.calculatePayout = function (bookingAmount, commissionRate) {
  const commissionAmount = (bookingAmount * commissionRate) / 100;
  const grossPayout = bookingAmount - commissionAmount;
  
  // Calculate TDS on commission if applicable
  const tdsAmount = (commissionAmount * (this.financials.taxOnCommission.tdsRate || 0)) / 100;
  
  // Calculate GST on commission if applicable
  const gstAmount = (commissionAmount * (this.financials.taxOnCommission.gstRate || 0)) / 100;
  
  const totalTax = tdsAmount + gstAmount;
  
  // Calculate payment gateway fee deduction
  let gatewayFeeDeduction = 0;
  if (this.financials.paymentGatewayFee.deductedFrom === "owner") {
    gatewayFeeDeduction = this.financials.paymentGatewayFee.amount;
  } else if (this.financials.paymentGatewayFee.deductedFrom === "shared") {
    gatewayFeeDeduction = this.financials.paymentGatewayFee.amount / 2;
  }
  
  const deductions = totalTax + gatewayFeeDeduction;
  const netPayout = grossPayout - deductions;
  
  // Admin earnings
  const adminEarnings = {
    commission: commissionAmount,
    tax: totalTax,
    gatewayFeeShare: this.financials.paymentGatewayFee.amount - gatewayFeeDeduction,
    total: commissionAmount + totalTax + (this.financials.paymentGatewayFee.amount - gatewayFeeDeduction),
  };
  
  this.financials.bookingAmount = bookingAmount;
  this.financials.commissionAmount = commissionAmount;
  this.financials.grossPayout = grossPayout;
  this.financials.taxOnCommission.tdsAmount = tdsAmount;
  this.financials.taxOnCommission.gstAmount = gstAmount;
  this.financials.taxOnCommission.totalTax = totalTax;
  this.financials.deductions = deductions;
  this.financials.netPayout = netPayout;
  this.financials.adminEarnings = adminEarnings;
  
  return this;
};

// Method to mark payout as eligible
PayoutSchema.methods.markEligible = function () {
  if (this.payoutStatus === "pending") {
    const eligibleDate = new Date();
    if (this.payoutSchedule.type === "after_checkout" && this.checkOut) {
      eligibleDate.setDate(
        new Date(this.checkOut).getDate() + this.payoutSchedule.holdPeriod
      );
    }
    this.payoutSchedule.eligibleDate = eligibleDate;
    this.payoutStatus = "eligible";
    this.statusHistory.push({
      status: "eligible",
      changedAt: new Date(),
      reason: "Booking completed and hold period elapsed",
    });
  }
  return this;
};

// Ensure virtuals are included
PayoutSchema.set("toJSON", { virtuals: true });
PayoutSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Payout", PayoutSchema);