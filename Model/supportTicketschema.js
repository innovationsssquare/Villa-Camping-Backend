const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema(
  {
    // Optional: link ticket to the owner / user who created it
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner", // change to your actual user model name if different
    },

    // Basic fields from your screen
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },

    category: {
      type: String,
      enum: ["payment", "booking", "property", "account", "technical", "other"],
      default: "payment",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },

    // Ticket status for admin panel
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    // Optional: track replies from support/admin
    replies: [
      {
        message: { type: String, required: true },
        repliedAt: { type: Date, default: Date.now },
        // who replied (admin / support user)
        repliedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users", // or "Admin" if you have a separate model
        },
      },
    ],

    // Soft delete (similar to your camping/villa style)
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const SupportTicket = mongoose.model("SupportTicket", SupportTicketSchema);
module.exports = SupportTicket;
