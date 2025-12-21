const { Cottages, CottageUnit  } = require("../Model/Cottageschema");
const Owner = require("../Model/Ownerschema");
const AppErr = require("../Services/AppErr");
const Booking = require("../Model/Bookingschema");
const moment = require("moment-timezone");
// Create Cottages and Cottage Units
const createCottage = async (req, res, next) => {
  try {
    const requiredFields = ["owner", "category"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const { cottages: cottageUnits, ...cottageData } = req.body;

    // 1️⃣ Create parent Cottage property (saved in 'cottages' collection)
    const newCottage = await Cottages.create({ ...cottageData });

    // 2️⃣ Create each CottageUnit (saved in 'cottageunits' collection)
    const cottageUnitDocs = await Promise.all(
      cottageUnits.map(async (unit) => {
        const unitDoc = await CottageUnit.create({
          ...unit,
          Cottages: newCottage._id, // link to parent Cottage
        });
        return unitDoc._id;
      })
    );

    // 3️⃣ Link unit IDs to the parent Cottage
    newCottage.cottages = cottageUnitDocs;
    await newCottage.save();

    // 4️⃣ Update Owner to reference the new Cottage property
    await Owner.findByIdAndUpdate(
      newCottage.owner,
      {
        $push: {
          properties: {
            refType: "Cottage",
            refId: newCottage._id,
          },
        },
      },
      { new: true }
    );

    // 5️⃣ Success response
    res.status(201).json({
      success: true,
      message: "Cottage property created successfully",
      data: newCottage,
    });
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }
    next(new AppErr("Failed to create cottage", 500));
  }
};



// Get all cottages (not soft-deleted)
const getAllCottages = async (req, res, next) => {
  try {
    const cottages = await Cottages.find({ deletedAt: null }).populate("cottages");
    res.status(200).json({ success: true, data: cottages });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch cottages", 500));
  }
};

// Get single cottage property by ID
const getCottageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cottage = await Cottages.findOne({ _id: id, deletedAt: null })
      .populate("cottages"); // ✅ Path must match schema ref

    if (!cottage) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({ success: true, data: cottage });
  } catch (err) {
    console.error("Error fetching cottage:", err);
    next(new AppErr("Failed to fetch cottage", 500));
  }
};



// Update cottage property
const updateCottage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Cottages.findOneAndUpdate(
      { _id: id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!updated) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({
      success: true,
      message: "Cottage updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update cottage", 500));
  }
};

// Soft delete
const softDeleteCottage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Cottages.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deleted) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({
      success: true,
      message: "Cottage soft deleted",
      data: deleted,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete cottage", 500));
  }
};

// Get cottage by propertyId
const getCottageByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const cottage = await Cottages.findOne({
      _id: propertyId,
      deletedAt: null,
    }).populate("cottages");

    if (!cottage) return next(new AppErr("Cottage not found", 404));

    res.status(200).json({ success: true, data: cottage });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch cottage", 500));
  }
};

// Add Review to Cottage
const addCottageReview = async (req, res, next) => {
  try {
    const { cottageId } = req.params;
    const { userId, rating, comment, images } = req.body;

    if (!userId || !rating) {
      return next(new AppErr("User ID and rating required", 400));
    }

    const cottage = await Cottages.findById(cottageId);
    if (!cottage || cottage.deletedAt) {
      return next(new AppErr("Cottage not found or deleted", 404));
    }

    cottage.reviews.push({ userId, rating, comment, images });

    const totalRatings = cottage.reviews.reduce((sum, r) => sum + r.rating, 0);
    const totalReviews = cottage.reviews.length;

    cottage.averageRating = totalRatings / totalReviews;
    cottage.totalReviews = totalReviews;

    await cottage.save();

    res.status(200).json({
      success: true,
      message: "Review added successfully",
      data: {
        reviews: cottage.reviews,
        averageRating: cottage.averageRating,
        totalReviews: cottage.totalReviews,
      },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to add review", 500));
  }
};

const approveAndUpdateCottage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, commission, isLive } = req.body; 

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return next(new AppErr('Invalid status value. Please use "approved" or "rejected".', 400));
    }

    // Validate commission
    if (commission && typeof commission !== 'number') {
      return next(new AppErr('Commission should be a number', 400));
    }

    // Validate isLive
    if (typeof isLive !== 'boolean') {
      return next(new AppErr('isLive should be a boolean value', 400));
    }

    // Update villa status, commission, and isLive
    const updatedVilla = await Cottages.findByIdAndUpdate(
      id,
      { isapproved: status, commission, isLive },
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Cottage not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Cottage has been ${status} and is now ${isLive ? 'live' : 'inactive'} with commission set.`,
      data: updatedVilla,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to approve, update status, or add commission", 500));
  }
};


const updateCottagePricingByType = async (req, res, next) => {
  try {
    const { cottageId } = req.params;
    const { cottageType, weekdayPrice, weekendPrice } = req.body;

    if (!cottageType) return next(new AppErr("cottageType is required", 400));

    const result = await CottageUnit.updateMany(
      { Cottages: cottageId, cottageType },
      {
        $set: {
          "pricing.weekdayPrice": weekdayPrice,
          "pricing.weekendPrice": weekendPrice,
        },
      }
    );

    if (result.modifiedCount === 0)
      return next(
        new AppErr(`No cottages found for type: ${cottageType}`, 404)
      );

    res.status(200).json({
      success: true,
      message: `Pricing updated successfully for ${cottageType} cottages.`,
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

const getCottagedaydetails = async (req, res, next) => {
  try {
    const { cottageId } = req.params;
    const { date } = req.query; // same as dateStr from your screen

    if (!date) {
      return next(new AppErr("Date is required in query (YYYY-MM-DD)", 400));
    }

    // 🔹 Ensure cottage exists
    const cottage = await Cottages.findOne({
      _id: cottageId,
      deletedAt: null,
    }).select("_id name");

    if (!cottage) {
      return next(new AppErr("Cottage property not found", 404));
    }

    // 🔹 Day range in IST
    const dayStartIST = moment
      .tz(date, "YYYY-MM-DD", "Asia/Kolkata")
      .startOf("day");
    const dayEndIST = dayStartIST.clone().endOf("day");

    const dayStart = dayStartIST.toDate();
    const dayEnd = dayEndIST.toDate();

    // 1) Get all cottage units for this cottage
    const units = await CottageUnit.find({
      Cottages: cottageId,
      deletedAt: null,
    }).lean();

    // Map unitId -> unit doc for quick access
    const unitMap = {};
    units.forEach((u) => {
      unitMap[u._id.toString()] = u;
    });

    // 2) Get all bookings that overlap this day for this cottage
    const bookings = await Booking.find({
      propertyType: "Cottages",
      propertyId: cottageId,
      status: { $in: ["pending", "confirmed"] }, // ignore cancelled/completed
      checkIn: { $lt: dayEnd },  // overlap logic
      checkOut: { $gt: dayStart },
    }).lean();

    // 3) Compute booked counts per cottageType from booking items
    const bookedByType = {}; // { 'Single': 3, 'Couple': 1, ... }

    bookings.forEach((bk) => {
      bk.items
        ?.filter((item) => item.unitType === "CottageUnit")
        .forEach((item) => {
          const unitDoc = unitMap[item.unitId?.toString()];
          if (!unitDoc) return;
          const type = unitDoc.cottageType || item.typeName || "Cottages";

          if (!bookedByType[type]) bookedByType[type] = 0;
          bookedByType[type] += item.quantity || 1;
        });
    });

    // 4) Build cottage summary:
    //    { cottageType, total, booked, available, price: { weekday, weekend } }
    const groupedByType = {}; // merge multiple docs of same type

    units.forEach((u) => {
      if (!groupedByType[u.cottageType]) {
        groupedByType[u.cottageType] = {
          cottageType: u.cottageType,
          total: 0,
          weekdayPrice: u.pricing?.weekdayPrice || 0,
          weekendPrice: u.pricing?.weekendPrice || 0,
        };
      }
      groupedByType[u.cottageType].total += u.totalcottage || 0;
    });

    const cottagesSummary = Object.values(groupedByType).map((u) => {
      const booked = bookedByType[u.cottageType] || 0;
      const available = Math.max((u.total || 0) - booked, 0);

      return {
        cottageType: u.cottageType,
        total: u.total,
        booked,
        available,
        price: {
          weekday: u.weekdayPrice,
          weekend: u.weekendPrice,
        },
      };
    });

    // 5) Build booking list for the UI
    const bookingsList = bookings.map((bk) => {
      const unitItem = bk.items.find((it) => it.unitType === "CottageUnit");
      const unitDoc = unitItem
        ? unitMap[unitItem.unitId?.toString()]
        : null;

      return {
        cottageType: unitDoc?.cottageType || unitItem?.typeName || "Cottages",
        guestName: `${bk.customerDetails.firstName} ${
          bk.customerDetails.lastName || ""
        }`.trim(),
        checkIn: bk.checkIn,
        checkOut: bk.checkOut,
        bookingId: bk._id.toString(),
        status: bk.status,
      };
    });

    return res.json({
      success: true,
      data: {
        cottage: {
          _id: cottage._id,
          name: cottage.name,
        },
        date,
        cottages: cottagesSummary,
        bookings: bookingsList,
      },
    });
  } catch (err) {
    console.error("getCottagedaydetails error:", err);
    next(new AppErr("Failed to fetch cottage day details", 500));
  }
};

const checkCottageAvailabilityRange = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, cottages: requestedCottages } = req.body;

    if (!propertyId || !checkIn || !checkOut || !requestedCottages) {
      return res.status(400).json({
        success: false,
        message: "propertyId, checkIn, checkOut, cottages are required",
      });
    }

    // 🔹 Get all cottage units for this property
    const cottageUnits = await CottageUnit.find({
      Cottages: propertyId,
      deletedAt: null,
      status: "available",
    }).lean();

    if (!cottageUnits.length) {
      return res.status(404).json({
        success: false,
        message: "No cottage units found for this property",
      });
    }

    // 🔹 Group total cottages by type
    const totalByType = {};
    cottageUnits.forEach((unit) => {
      if (!totalByType[unit.cottageType]) {
        totalByType[unit.cottageType] = 0;
      }
      totalByType[unit.cottageType] += unit.totalcottage || 0;
    });

    // 🔹 Generate nights (IST)
    const nights = getDateRangeIST(checkIn, checkOut);

    // Track minimum availability across nights
    const minAvailableByType = {};

    for (const night of nights) {
      const nightStart = night.clone().startOf("day").toDate();
      const nightEnd = night.clone().endOf("day").toDate();

      // 🔹 Find overlapping bookings
      const bookings = await Booking.find({
        propertyType: "Cottage",
        propertyId,
        status: { $in: ["pending", "confirmed"] },
        checkIn: { $lt: nightEnd },
        checkOut: { $gt: nightStart },
      }).lean();

      // 🔹 Count booked cottages by type
      const bookedByType = {};

      bookings.forEach((bk) => {
        bk.items
          ?.filter((it) => it.unitType === "Cottage")
          .forEach((it) => {
            const unit = cottageUnits.find(
              (u) => u._id.toString() === it.unitId?.toString()
            );
            if (!unit) return;

            const type = unit.cottageType;
            if (!bookedByType[type]) bookedByType[type] = 0;
            bookedByType[type] += it.quantity || 1;
          });
      });

      // 🔹 Calculate availability for this night
      Object.keys(totalByType).forEach((type) => {
        const available =
          (totalByType[type] || 0) - (bookedByType[type] || 0);

        if (
          minAvailableByType[type] === undefined ||
          available < minAvailableByType[type]
        ) {
          minAvailableByType[type] = available;
        }
      });
    }

    // 🔹 Validate requested cottages
    for (const [type, reqQty] of Object.entries(requestedCottages)) {
      if ((minAvailableByType[type] || 0) < reqQty) {
        return res.status(200).json({
          success: false,
          available: false,
          message: `${type} cottages not available for all selected nights`,
          details: {
            requested: reqQty,
            available: minAvailableByType[type] || 0,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      available: true,
    });
  } catch (err) {
    console.error("checkCottageAvailabilityRange error:", err);
    next(new AppErr("Failed to check cottage availability", 500));
  }
};


module.exports = {
  createCottage,
  getAllCottages,
  getCottageById,
  updateCottage,
  softDeleteCottage,
  getCottageByProperty,
  addCottageReview,
  approveAndUpdateCottage,
  updateCottagePricingByType,
  getCottagedaydetails,
  checkCottageAvailabilityRange
};
