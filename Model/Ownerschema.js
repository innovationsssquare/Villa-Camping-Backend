const mongoose = require("mongoose");
const mongooseEncryption = require("mongoose-encryption");

const OwnerSchema = new mongoose.Schema(
  {
    firebaseUID: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: String,
    profilePic: String,
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
      accountType: String,
      upiId: String,
      phone: String,
    },

    documents: [
      {
        type: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        date: { type: Date },
        size: { type: String },
        status: { type: String, default: "available" },
        downloadUrl: { type: String },
      },
    ],

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

    bankDetailsUpdated: {
      type: Boolean,
      default: false,
    },
    documentsUpdated: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false, // Initially false, can be set to true after verification
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Encrypt only sensitive fields
// OwnerSchema.plugin(mongooseEncryption, {
//   encryptionKey: process.env.MONGO_ENCRYPTION_KEY, // Encryption key from environment variable
//   signingKey: process.env.MONGO_SIGNING_KEY, // Signing key from environment variable
//   encryptedFields: ['bankDetails', 'documents'], // Fields that should be encrypted
// });

OwnerSchema.pre("save", function (next) {
  if (this.isModified("bankDetails")) {
    this.bankDetailsUpdated = true;
  }
  if (this.isModified("documents")) {
    this.documentsUpdated = true;
  }
  next();
});

module.exports = mongoose.model("Owner", OwnerSchema);
