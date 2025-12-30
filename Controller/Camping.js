const { Camping, Tent } = require("../Model/Campingschema");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");
const Booking = require("../Model/Bookingschema");
const moment = require("moment-timezone");

// Create Camping and Tent data
const createCamping = async (req, res, next) => {
  try {
    const requiredFields = ["owner", "category"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const { tents, ...campingData } = req.body;

    const newCamping = await Camping.create({ ...campingData });

    const tentDocs = await Promise.all(
      tents.map(async (tent) => {
        const tentDoc = await Tent.create({
          ...tent,
          camping: newCamping._id,
        });
        return tentDoc._id;
      })
    );

    newCamping.tents = tentDocs;
    await newCamping.save();

    await Owner.findByIdAndUpdate(
      newCamping.owner,
      {
        $push: {
          properties: {
            refType: "Camping",
            refId: newCamping._id,
          },
        },
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Camping created successfully",
      data: newCamping,
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
    next(new AppErr("Failed to create camping", 500));
  }
};

// Get all campings (not deleted)
const getAllCampings = async (req, res, next) => {
  try {
    const campings = await Camping.find({ deletedAt: null }).populate("tents");
    res.status(200).json({ success: true, data: campings });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch campings", 500));
  }
};

// Get single camping by ID
const getCampingById = async (req, res, next) => {
  try {
    const { id } = req.params;
 const camping = await Camping.findOne({ _id: id, deletedAt: null })
      .populate("tents") // ✅ populate rooms
      .populate({
        path: "reviews.userId", // ✅ populate review user
        select: "fullName  email", // adjust fields if needed
      })
      .lean(); // 🔥 important for frontend usage
    if (!camping) return next(new AppErr("Camping not found", 404));

    res.status(200).json({ success: true, data: camping });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch camping", 500));
  }
};

// Update Camping
const updateCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedCamping = await Camping.findOneAndUpdate(
      { _id: id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!updatedCamping) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Camping updated successfully",
      data: updatedCamping,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update camping", 500));
  }
};

// Soft delete Camping
const softDeleteCamping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCamping = await Camping.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedCamping) return next(new AppErr("Camping not found", 404));

    res.status(200).json({
      success: true,
      message: "Camping soft deleted",
      data: deletedCamping,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete camping", 500));
  }
};

// Get camping by propertyId (generic access)
const getCampingByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const camping = await Camping.findOne({ _id: propertyId, deletedAt: null });

    if (!camping) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({ success: true, data: camping });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch camping", 500));
  }
};

// Add review and update average rating
const addCampingReview = async (req, res, next) => {
  try {
    const { campingId } = req.params;
    const { userId, rating, comment, images } = req.body;

    if (!campingId || !userId || !rating) {
      return next(new AppErr("Camping ID, User ID, and Rating are required", 400));
    }

    const camping = await Camping.findById(campingId);
    if (!camping || camping.deletedAt) {
      return next(new AppErr("Camping not found or has been deleted", 404));
    }

    camping.reviews.push({ userId, rating, comment, images });

    const totalRatings = camping.reviews.reduce((sum, review) => sum + review.rating, 0);
    const totalReviews = camping.reviews.length;

    camping.averageRating = totalRatings / totalReviews;
    camping.totalReviews = totalReviews;

    await camping.save();

    res.status(200).json({
      success: true,
      message: "Review added successfully",
      data: {
        reviews: camping.reviews,
        averageRating: camping.averageRating,
        totalReviews: camping.totalReviews,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to add review", 500));
  }
};

const approveAndUpdateCamping = async (req, res, next) => {
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
    const updatedVilla = await Camping.findByIdAndUpdate(
      id,
      { isapproved: status, commission, isLive },
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Camping not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Camping has been ${status} and is now ${isLive ? 'live' : 'inactive'} with commission set.`,
      data: updatedVilla,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to approve, update status, or add commission", 500));
  }
};


const updateCampingTentTypePricing = async (req, res, next) => {
  try {
    const { campingId } = req.params;
    const { tentType, weekdayPrice, weekendPrice } = req.body;

    if (!tentType) {
      return next(new AppErr("Tent type is required", 400));
    }

    if (weekdayPrice == null && weekendPrice == null) {
      return next(
        new AppErr("At least one price field (weekdayPrice or weekendPrice) is required", 400)
      );
    }

    // --- 1️⃣ Update Camping Pricing ---
    const campingUpdateFields = {};
    if (weekdayPrice != null) campingUpdateFields["pricing.weekdayPrice"] = weekdayPrice;
    if (weekendPrice != null) campingUpdateFields["pricing.weekendPrice"] = weekendPrice;

    const updatedCamping = await Camping.findOneAndUpdate(
      { _id: campingId, deletedAt: null },
      { $set: campingUpdateFields },
      { new: true }
    );

    if (!updatedCamping) {
      return next(new AppErr("Camping not found", 404));
    }

    // --- 2️⃣ Update All Tents of the Given Type ---
    const tentUpdateFields = {};
    if (weekdayPrice != null) tentUpdateFields["pricing.weekdayPrice"] = weekdayPrice;
    if (weekendPrice != null) tentUpdateFields["pricing.weekendPrice"] = weekendPrice;

    const result = await Tent.updateMany(
      { camping: campingId, tentType, deletedAt: null },
      { $set: tentUpdateFields }
    );

    if (result.matchedCount === 0) {
      return next(
        new AppErr(`No tents found for type "${tentType}" in this camping`, 404)
      );
    }

    // --- 3️⃣ Get Updated Tent Records ---
    const updatedTents = await Tent.find({
      camping: campingId,
      tentType,
      deletedAt: null,
    }).select("tentType pricing");

    res.status(200).json({
      success: true,
      message: `Pricing updated for camping and all "${tentType}" tents`,
      data: {
        campingPricing: updatedCamping.pricing,
        tentType,
        updatedTents,
      },
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update camping and tent type pricing", 500));
  }
};

// Add Tent to Existing Camping
const addTentToCamping = async (req, res, next) => {
  try {
    const { id } = req.params; // campingId
    const {
      tentType,
      amenities,
      minCapacity,
      maxCapacity,
      pricing,
      tentimages,
      totaltents,
    } = req.body;

    console.log("Tent payload:", req.body);

    if (!tentType || !pricing) {
      return next(new AppErr("Tent type and pricing are required", 400));
    }

    const camping = await Camping.findOne({ _id: id, deletedAt: null });
    if (!camping) {
      return next(new AppErr("Camping not found", 404));
    }

    // ✅ Create Tent using your TentSchema fields
    const newTent = await Tent.create({
      camping: id,
      tentType,
      amenities,
      minCapacity,
      maxCapacity,
      pricing,
      tentimages,
      totaltents,
    });

    // ✅ Push tent into camping WITHOUT triggering Camping validation
    await Camping.findByIdAndUpdate(
      id,
      { $push: { tents: newTent._id } },
      { new: true, runValidators: false } // ← important
    );

    res.status(201).json({
      success: true,
      message: "Tent added successfully to camping",
      data: newTent,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to add tent to camping", 500));
  }
};


// GET /api/camping/:campingId/day-details?date=YYYY-MM-DD
const getcampingdaydetails = async (req, res, next) => {
  try {
    const { campingId } = req.params;
    const { date } = req.query; // same as dateStr from your screen
    if (!date) {
      return next(new AppErr("Date is required in query (YYYY-MM-DD)", 400));
    }

    // 🔹 Ensure camping exists
    const camping = await Camping.findOne({
      _id: campingId,
      deletedAt: null,
    }).select("_id name");
    if (!camping) {
      return next(new AppErr("Camping property not found", 404));
    }

    // 🔹 Day range in IST
    const dayStartIST = moment
      .tz(date, "YYYY-MM-DD", "Asia/Kolkata")
      .startOf("day");
    const dayEndIST = dayStartIST.clone().endOf("day");

    const dayStart = dayStartIST.toDate();
    const dayEnd = dayEndIST.toDate();

    // 1) Get all tents for this camping
    const tents = await Tent.find({
      camping: campingId,
      deletedAt: null,
      isAvailable: true,
    }).lean();

    // Map tentId -> tent doc for quick access
    const tentMap = {};
    tents.forEach((t) => {
      tentMap[t._id.toString()] = t;
    });

    // 2) Get all bookings that overlap this day for this camping
    const bookings = await Booking.find({
      propertyType: "Camping",
      propertyId: campingId,
      status: { $in: ["pending", "confirmed"] }, // ignore cancelled/completed
      checkIn: { $lt: dayEnd }, // overlap logic
      checkOut: { $gt: dayStart },
    }).lean();

    // 3) Compute booked counts per tentType from booking items
    const bookedByType = {}; // { 'Single': 3, 'Couple': 1, ... }

    bookings.forEach((bk) => {
      bk.items
        ?.filter((item) => item.unitType === "Tent")
        .forEach((item) => {
          const tentDoc = tentMap[item.unitId?.toString()];
          if (!tentDoc) return;
          const type = tentDoc.tentType || "Tent";

          if (!bookedByType[type]) bookedByType[type] = 0;
          bookedByType[type] += item.quantity || 1;
        });
    });

    // 4) Build tent summary like your mock:
    //    { tentType, total, booked, available, price: { weekday, weekend } }
    const groupedByType = {}; // merge multiple docs of same type

    tents.forEach((t) => {
      if (!groupedByType[t.tentType]) {
        groupedByType[t.tentType] = {
          tentType: t.tentType,
          total: 0,
          weekdayPrice: t.pricing?.weekdayPrice || 0,
          weekendPrice: t.pricing?.weekendPrice || 0,
        };
      }
      groupedByType[t.tentType].total += t.totaltents || 0;
    });

    const tentsSummary = Object.values(groupedByType).map((t) => {
      const booked = bookedByType[t.tentType] || 0;
      const available = Math.max((t.total || 0) - booked, 0);

      return {
        tentType: t.tentType,
        total: t.total,
        booked,
        available,
        price: {
          weekday: t.weekdayPrice,
          weekend: t.weekendPrice,
        },
      };
    });

    // 5) Build booking list like your mock `bookings` array
    const bookingsList = bookings.map((bk) => {
      const tentItem = bk.items.find((it) => it.unitType === "Tent");
      const tentDoc = tentItem
        ? tentMap[tentItem.unitId?.toString()]
        : null;

      return {
        tentType: tentDoc?.tentType || tentItem?.typeName || "Tent",
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
        camping: {
          _id: camping._id,
          name: camping.name,
        },
        date,
        tents: tentsSummary,
        bookings: bookingsList,
      },
    });
  } catch (err) {
    console.error("getCampingDayDetails error:", err);
    next(new AppErr("Failed to fetch camping day details", 500));
  }
}

const getDateRangeIST = (checkIn, checkOut) => {
  const start = moment.utc(checkIn).tz("Asia/Kolkata").startOf("day");
  const end = moment.utc(checkOut).tz("Asia/Kolkata").startOf("day");

  const dates = [];
  const curr = start.clone();

  while (curr.isBefore(end)) {
    dates.push(curr.clone());
    curr.add(1, "day");
  }

  return dates; // array of moment dates
};


const checkCampingAvailabilityRange = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, tents: requestedTents } = req.body;

    if (!propertyId || !checkIn || !checkOut || !requestedTents) {
      return res.status(400).json({
        success: false,
        message: "propertyId, checkIn, checkOut, tents are required",
      });
    }

    // 🔹 Get all tent docs for this camping
    const tentDocs = await Tent.find({
      camping: propertyId,
      deletedAt: null,
      isAvailable: true,
    }).lean();

    if (!tentDocs.length) {
      return res.status(404).json({
        success: false,
        message: "No tents found for this camping",
      });
    }

    // Group total tents by type
    const totalByType = {};
    tentDocs.forEach((t) => {
      if (!totalByType[t.tentType]) totalByType[t.tentType] = 0;
      totalByType[t.tentType] += t.totaltents || 0;
    });

    // 🔹 Generate nights
    const nights = getDateRangeIST(checkIn, checkOut);

    // Track minimum availability across nights
    const minAvailableByType = {};

    for (const night of nights) {
      const nightStart = night.clone().startOf("day").toDate();
      const nightEnd = night.clone().endOf("day").toDate();

      // Get bookings overlapping this night
      const bookings = await Booking.find({
        propertyType: "Camping",
        propertyId,
        status: { $in: ["pending", "confirmed"] },
        checkIn: { $lt: nightEnd },
        checkOut: { $gt: nightStart },
      }).lean();

      // Count booked tents by type
      const bookedByType = {};

      bookings.forEach((bk) => {
        bk.items
          ?.filter((it) => it.unitType === "Tent")
          .forEach((it) => {
            const tentDoc = tentDocs.find(
              (t) => t._id.toString() === it.unitId?.toString()
            );
            if (!tentDoc) return;

            const type = tentDoc.tentType;
            if (!bookedByType[type]) bookedByType[type] = 0;
            bookedByType[type] += it.quantity || 1;
          });
      });

      // Calculate availability for this night
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

    // 🔹 Validate against requested tents
    for (const [type, reqQty] of Object.entries(requestedTents)) {
      if ((minAvailableByType[type] || 0) < reqQty) {
        return res.status(200).json({
          success: false,
          available: false,
          message: `${type} tents not available for all selected nights`,
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
    console.error("checkCampingAvailabilityRange error:", err);
    next(new AppErr("Failed to check camping availability", 500));
  }
};



module.exports = {
  createCamping,
  getAllCampings,
  getCampingById,
  updateCamping,
  softDeleteCamping,
  getCampingByProperty,
  addCampingReview,
  approveAndUpdateCamping,
  updateCampingTentTypePricing,
  addTentToCamping,
  getcampingdaydetails,
  checkCampingAvailabilityRange
};
