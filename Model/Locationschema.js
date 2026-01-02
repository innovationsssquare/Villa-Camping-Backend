const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    coverImage: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      enum: ["city", "area", "landmark"],
      required: true,
    },

    coordinates: {
      type: [Number],
      required: true,
    },

    description: {
      type: String,
    },

    features: [String],

    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* ---------- SLUG GENERATION ---------- */
LocationSchema.pre("save", async function (next) {
  if (!this.isModified("name")) return next();

  let baseSlug = this.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  let slug = baseSlug;
  let count = 1;

  const Location = mongoose.models.Location;

  while (await Location.exists({ slug })) {
    slug = `${baseSlug}-${count++}`;
  }

  this.slug = slug;
  next();
});

module.exports = mongoose.model("Location", LocationSchema);
