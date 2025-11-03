const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // Recipient Information
    recipientType: {
      type: String,
      enum: ["user", "owner", "admin"],
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: "recipientType",
    },

    // Notification Type and Category
    type: {
      type: String,
      enum: [
        // Booking related
        "booking_created",
        "booking_confirmed",
        "booking_cancelled",
        "booking_completed",
        "booking_reminder",
        "booking_modified",

        // Payment related
        "payment_successful",
        "payment_failed",
        "payment_pending",
        "partial_payment_received",
        "remaining_payment_due",
        "refund_initiated",
        "refund_completed",

        // Payout related
        "payout_created",
        "payout_eligible",
        "payout_processing",
        "payout_completed",
        "payout_failed",

        // Coupon related
        "coupon_applied",
        "coupon_expired_soon",
        "new_coupon_available",

        // Property related
        "property_approved",
        "property_rejected",
        "property_suspended",
        "property_verification_pending",

        // Review related
        "new_review",
        "review_reply",

        // System related
        "system_announcement",
        "account_verified",
        "document_required",
        "profile_incomplete",

        // General
        "general_message",
        "promotional",
      ],
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: [
        "booking",
        "payment",
        "payout",
        "property",
        "coupon",
        "review",
        "system",
        "account",
        "promotional",
      ],
      required: true,
      index: true,
    },

    // Notification Content
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Rich content (optional)
    data: {
      type: mongoose.Schema.Types.Mixed,
      description: "Additional data specific to notification type",
    },

    // Related References
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },

    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payout",
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "data.propertyType",
    },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CouponOffer",
    },

    // Notification State
    status: {
      type: String,
      enum: ["unread", "read", "archived", "deleted"],
      default: "unread",
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
    },

    // Priority and Delivery
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    // Delivery channels
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
    },

    // Action Button (optional)
    actionButton: {
      text: String,
      url: String,
      action: String, // e.g., "view_booking", "make_payment"
    },

    // Image/Icon
    image: {
      type: String,
      description: "URL to notification image/icon",
    },

    icon: {
      type: String,
      default: "bell",
    },

    // Scheduled delivery (optional)
    scheduledFor: {
      type: Date,
      index: true,
    },

    isSent: {
      type: Boolean,
      default: false,
      index: true,
    },

    sentAt: {
      type: Date,
    },

    // Expiry
    expiresAt: {
      type: Date,
      index: true,
    },

    // Metadata
    metadata: {
      sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "metadata.sentByModel",
      },
      sentByModel: {
        type: String,
        enum: ["Admin", "System", "User", "Owner"],
      },
      deviceInfo: {
        deviceId: String,
        platform: String, // web, ios, android
        browser: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for better query performance
NotificationSchema.index({ recipientId: 1, recipientType: 1, isRead: 1 });
NotificationSchema.index({ recipientId: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, status: 1, priority: -1 });
NotificationSchema.index({ scheduledFor: 1, isSent: 1 });
NotificationSchema.index({ expiresAt: 1 });

// Virtual for recipient model
NotificationSchema.virtual("recipient", {
  refPath: "recipientType",
  localField: "recipientId",
  foreignField: "_id",
  justOne: true,
});

// Method to mark as read
NotificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.status = "read";
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Method to mark as unread
NotificationSchema.methods.markAsUnread = async function () {
  if (this.isRead) {
    this.isRead = false;
    this.status = "unread";
    this.readAt = null;
    await this.save();
  }
  return this;
};

// Method to archive
NotificationSchema.methods.archive = async function () {
  this.status = "archived";
  await this.save();
  return this;
};

// Method to soft delete
NotificationSchema.methods.softDelete = async function () {
  this.status = "deleted";
  await this.save();
  return this;
};

// Static method to mark multiple as read
NotificationSchema.statics.markManyAsRead = async function (
  recipientId,
  notificationIds
) {
  return await this.updateMany(
    {
      _id: { $in: notificationIds },
      recipientId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        status: "read",
        readAt: new Date(),
      },
    }
  );
};

// Static method to mark all as read for a user
NotificationSchema.statics.markAllAsRead = async function (recipientId) {
  return await this.updateMany(
    {
      recipientId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        status: "read",
        readAt: new Date(),
      },
    }
  );
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function (recipientId) {
  return await this.countDocuments({
    recipientId,
    isRead: false,
    status: { $ne: "deleted" },
  });
};

// Static method to clean up expired notifications
NotificationSchema.statics.cleanupExpired = async function () {
  return await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

// Pre-save middleware to set sentAt
NotificationSchema.pre("save", function (next) {
  if (this.isSent && !this.sentAt) {
    this.sentAt = new Date();
  }
  next();
});

// Ensure virtuals are included
NotificationSchema.set("toJSON", { virtuals: true });
NotificationSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Notification", NotificationSchema);