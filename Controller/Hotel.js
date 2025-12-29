const { Hotels, Room } = require("../Model/Hotelschema");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");
const Booking = require("../Model/Bookingschema");
const moment = require("moment-timezone");
// Create Hotel and Rooms
const createHotel = async (req, res, next) => {
  try {
    const requiredFields = ["owner", "category", "name"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const { rooms, ...hotelData } = req.body;

    // Create the hotel
    const newHotel = await Hotels.create({ ...hotelData });

    // Create the rooms and associate them with the hotel
    const roomDocs = await Promise.all(
      rooms.map(async (room) => {
        const roomDoc = await Room.create({
          ...room,
          hotel: newHotel._id,
        });
        return roomDoc._id;
      })
    );

    newHotel.rooms = roomDocs;
    await newHotel.save();

    // Update the owner's properties to reference the hotel
    await Owner.findByIdAndUpdate(
      newHotel.owner,
      {
        $push: {
          properties: {
            refType: "Hotel",
            refId: newHotel._id,
          },
        },
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      data: newHotel,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create hotel", 500));
  }
};

// Get all hotels (not deleted)
const getAllHotels = async (req, res, next) => {
  try {
    const hotels = await Hotels.find({ deletedAt: null }).populate("rooms");
    res.status(200).json({ success: true, data: hotels });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch hotels", 500));
  }
};

// Get single hotel by ID
const getHotelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hotel = await Hotels.findOne({ _id: id, deletedAt: null })
      .populate("rooms") // ✅ populate rooms
      .populate({
        path: "reviews.userId", // ✅ populate review user
        select: "fullName  email", // adjust fields if needed
      })
      .lean(); // 🔥 important for frontend usage

    if (!hotel) return next(new AppErr("Hotel not found", 404));

    res.status(200).json({ success: true, data: hotel });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch hotel", 500));
  }
};

// Update Hotel
const updateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedHotel = await Hotels.findOneAndUpdate(
      { _id: id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!updatedHotel) {
      return next(new AppErr("Hotel not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      data: updatedHotel,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update hotel", 500));
  }
};

// Soft delete Hotel
const softDeleteHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedHotel = await Hotels.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedHotel) return next(new AppErr("Hotel not found", 404));

    res.status(200).json({
      success: true,
      message: "Hotel soft deleted",
      data: deletedHotel,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete hotel", 500));
  }
};

// Get hotel by propertyId (generic access)
const getHotelByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const hotel = await Hotels.findOne({ _id: propertyId, deletedAt: null });

    if (!hotel) {
      return next(new AppErr("Hotel not found", 404));
    }

    res.status(200).json({ success: true, data: hotel });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch hotel", 500));
  }
};

// Add review and update average rating
const addHotelReview = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { userId, rating, comment, images } = req.body;

    if (!hotelId || !userId || !rating) {
      return next(
        new AppErr("Hotel ID, User ID, and Rating are required", 400)
      );
    }

    const hotel = await Hotels.findById(hotelId);
    if (!hotel || hotel.deletedAt) {
      return next(new AppErr("Hotel not found or has been deleted", 404));
    }

    hotel.reviews.push({ userId, rating, comment, images });

    const totalRatings = hotel.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const totalReviews = hotel.reviews.length;

    hotel.averageRating = totalRatings / totalReviews;
    hotel.totalReviews = totalReviews;

    await hotel.save();

    res.status(200).json({
      success: true,
      message: "Review added successfully",
      data: {
        reviews: hotel.reviews,
        averageRating: hotel.averageRating,
        totalReviews: hotel.totalReviews,
      },
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Failed to add review", 500));
  }
};

const approveAndUpdateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, commission, isLive } = req.body;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return next(
        new AppErr(
          'Invalid status value. Please use "approved" or "rejected".',
          400
        )
      );
    }

    // Validate commission
    if (commission && typeof commission !== "number") {
      return next(new AppErr("Commission should be a number", 400));
    }

    // Validate isLive
    if (typeof isLive !== "boolean") {
      return next(new AppErr("isLive should be a boolean value", 400));
    }

    // Update villa status, commission, and isLive
    const updatedVilla = await Hotels.findByIdAndUpdate(
      id,
      { isapproved: status, commission, isLive },
      { new: true }
    );

    if (!updatedVilla) {
      return next(new AppErr("Hotel not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `Hotel has been ${status} and is now ${
        isLive ? "live" : "inactive"
      } with commission set.`,
      data: updatedVilla,
    });
  } catch (err) {
    console.error(err);
    next(
      new AppErr("Failed to approve, update status, or add commission", 500)
    );
  }
};

const updateHotelPricingByType = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { roomType, weekdayPrice, weekendPrice } = req.body;

    // 1️⃣ Validate input
    if (!roomType) return next(new AppErr("roomType is required", 400));
    if (weekdayPrice == null || weekendPrice == null)
      return next(
        new AppErr("Both weekdayPrice and weekendPrice are required", 400)
      );

    // 2️⃣ Update all rooms of the given type within that hotel
    const roomUpdateResult = await Room.updateMany(
      { hotel: hotelId, roomType },
      {
        $set: {
          "pricing.weekdayPrice": weekdayPrice,
          "pricing.weekendPrice": weekendPrice,
        },
      }
    );

    // 3️⃣ If no rooms found for that type
    if (roomUpdateResult.modifiedCount === 0) {
      return next(new AppErr(`No rooms found for type: ${roomType}`, 404));
    }

    // 4️⃣ Also update hotel-level pricing for same roomType (optional business rule)
    const hotel = await Hotels.findByIdAndUpdate(
      hotelId,
      {
        $set: {
          "pricing.weekdayPrice": weekdayPrice,
          "pricing.weekendPrice": weekendPrice,
        },
      },
      { new: true }
    );

    if (!hotel) return next(new AppErr("Hotel not found", 404));

    res.status(200).json({
      success: true,
      message: `Pricing updated successfully for ${roomType} rooms.`,
      hotel,
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

const getHoteldaydetails = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { date } = req.query; // YYYY-MM-DD from your screen

    if (!date) {
      return next(new AppErr("Date is required in query (YYYY-MM-DD)", 400));
    }

    // 🔹 Ensure hotel exists
    const hotel = await Hotels.findOne({
      _id: hotelId,
      deletedAt: null,
    }).select("_id name");

    if (!hotel) {
      return next(new AppErr("Hotel property not found", 404));
    }

    // 🔹 Day range in IST
    const dayStartIST = moment
      .tz(date, "YYYY-MM-DD", "Asia/Kolkata")
      .startOf("day");
    const dayEndIST = dayStartIST.clone().endOf("day");

    const dayStart = dayStartIST.toDate();
    const dayEnd = dayEndIST.toDate();

    // 1) Get all room units for this hotel
    const rooms = await Room.find({
      hotel: hotelId,
      deletedAt: null,
    }).lean();

    // Map roomId -> room doc
    const roomMap = {};
    rooms.forEach((r) => {
      roomMap[r._id.toString()] = r;
    });

    // 2) Get all bookings that overlap this day for this hotel
    const bookings = await Booking.find({
      propertyType: "Hotels",
      propertyId: hotelId,
      status: { $in: ["pending", "confirmed"] }, // ignore cancelled/completed
      checkIn: { $lt: dayEnd }, // overlap
      checkOut: { $gt: dayStart },
    }).lean();

    // 3) Compute booked counts per roomType from booking items
    const bookedByType = {}; // { 'Standard Room': 3, 'Deluxe Room': 2, ... }

    bookings.forEach((bk) => {
      bk.items
        ?.filter((item) => item.unitType === "RoomUnit")
        .forEach((item) => {
          const roomDoc = roomMap[item.unitId?.toString()];
          if (!roomDoc) return;
          const type = roomDoc.roomType || item.typeName || "Room";

          if (!bookedByType[type]) bookedByType[type] = 0;
          bookedByType[type] += item.quantity || 1;
        });
    });

    // 4) Build room summary:
    // { roomType, total, booked, available, price: { weekday, weekend } }
    const groupedByType = {}; // merge multiple docs of same type

    rooms.forEach((r) => {
      if (!groupedByType[r.roomType]) {
        groupedByType[r.roomType] = {
          roomType: r.roomType,
          total: 0,
          weekdayPrice: r.pricing?.weekdayPrice || 0,
          weekendPrice: r.pricing?.weekendPrice || 0,
        };
      }
      // totalRooms indicates how many identical rooms this unit represents
      groupedByType[r.roomType].total += r.totalRooms || 1;
    });

    const roomsSummary = Object.values(groupedByType).map((r) => {
      const booked = bookedByType[r.roomType] || 0;
      const available = Math.max((r.total || 0) - booked, 0);

      return {
        roomType: r.roomType,
        total: r.total,
        booked,
        available,
        price: {
          weekday: r.weekdayPrice,
          weekend: r.weekendPrice,
        },
      };
    });

    // 5) Build booking list for UI
    const bookingsList = bookings.map((bk) => {
      const roomItem = bk.items.find((it) => it.unitType === "RoomUnit");
      const roomDoc = roomItem ? roomMap[roomItem.unitId?.toString()] : null;

      return {
        roomType: roomDoc?.roomType || roomItem?.typeName || "Room",
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
        hotel: {
          _id: hotel._id,
          name: hotel.name,
        },
        date,
        rooms: roomsSummary,
        bookings: bookingsList,
      },
    });
  } catch (err) {
    console.error("getHoteldaydetails error:", err);
    next(new AppErr("Failed to fetch hotel day details", 500));
  }
};

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

const checkHotelAvailabilityRange = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut, rooms: requestedRooms } = req.body;

    if (!propertyId || !checkIn || !checkOut || !requestedRooms) {
      return res.status(400).json({
        success: false,
        message: "propertyId, checkIn, checkOut, rooms are required",
      });
    }

    // 🔹 Get all room units for this hotel
    const roomUnits = await Room.find({
      hotel: propertyId,
      deletedAt: null,
    }).lean();

    if (!roomUnits.length) {
      return res.status(404).json({
        success: false,
        message: "No rooms found for this hotel",
      });
    }

    // 🔹 Group total rooms by roomType
    const totalByType = {};
    roomUnits.forEach((room) => {
      if (!totalByType[room.roomType]) {
        totalByType[room.roomType] = 0;
      }
      totalByType[room.roomType] += room.totalRooms || 0;
    });

    // 🔹 Generate nights in IST
    const nights = getDateRangeIST(checkIn, checkOut);

    const minAvailableByType = {};

    for (const night of nights) {
      const nightStart = night.clone().startOf("day").toDate();
      const nightEnd = night.clone().endOf("day").toDate();

      // 🔹 Find overlapping bookings
      const bookings = await Booking.find({
        propertyType: "Hotels",
        propertyId,
        status: { $in: ["pending", "confirmed"] },
        checkIn: { $lt: nightEnd },
        checkOut: { $gt: nightStart },
      }).lean();

      // 🔹 Count booked rooms by type
      const bookedByType = {};

      bookings.forEach((bk) => {
        bk.items
          ?.filter((it) => it.unitType === "RoomUnit")
          .forEach((it) => {
            const room = roomUnits.find(
              (r) => r._id.toString() === it.unitId?.toString()
            );
            if (!room) return;

            const type = room.roomType;
            if (!bookedByType[type]) bookedByType[type] = 0;
            bookedByType[type] += it.quantity || 1;
          });
      });

      // 🔹 Calculate availability for this night
      Object.keys(totalByType).forEach((type) => {
        const available = (totalByType[type] || 0) - (bookedByType[type] || 0);

        if (
          minAvailableByType[type] === undefined ||
          available < minAvailableByType[type]
        ) {
          minAvailableByType[type] = available;
        }
      });
    }

    // 🔹 Validate requested rooms
    for (const [type, reqQty] of Object.entries(requestedRooms)) {
      if ((minAvailableByType[type] || 0) < reqQty) {
        return res.status(200).json({
          success: false,
          available: false,
          message: `${type} rooms not available for all selected nights`,
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
    console.error("checkHotelAvailabilityRange error:", err);
    next(new AppErr("Failed to check hotel availability", 500));
  }
};

module.exports = {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  softDeleteHotel,
  getHotelByProperty,
  addHotelReview,
  approveAndUpdateHotel,
  updateHotelPricingByType,
  getHoteldaydetails,
  checkHotelAvailabilityRange,
};
