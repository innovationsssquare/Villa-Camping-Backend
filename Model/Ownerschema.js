const mongoose = require("mongoose");

const OwnerSchema = new mongoose.Schema(
  {
    firebaseUID: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    profilePic: {
      type: String,
    },
    role: {
      type: String,
      default: "owner",
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      upiId: String,
    },
    documents: {
      idProof: String,
      agreement: String,
      bankProof: String,
    },

    properties: [
      {
        refType: {
          type: String,
          required: true,
          enum: ["Villa", "Camping", "Hotel", "Cottage"],
        },
        refId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "properties.refType",
        },
      },
    ],

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Owner", OwnerSchema);
