const User = require("../Model/Userschema");
const AppErr = require("../Services/AppErr");
const Villa = require("../Model/Villaschema");
const Booking = require("../Model/Bookingschema");
const Camping = require("../Model/Campingschema");
const Cottage = require("../Model/Cottageschema");
const Hotel = require("../Model/Hotelschema");
const Category = require("../Model/Categoryschema");
const { Room } = require("../Model/Hotelschema");
const { CottageUnit } = require("../Model/Cottageschema");
const { Tent } = require("../Model/Campingschema");

// Login or Register
const loginOrRegisterUser = async (req, res, next) => {
  try {
    const { firebaseUID, email, fullName, profilePic } = req.body;

    let user = await User.findOne({ firebaseUID });

    if (!user) {
      user = await User.create({ firebaseUID, email, fullName, profilePic });
      return res
        .status(201)
        .json({ success: true, message: "User registered", data: user });
    }

    res
      .status(200)
      .json({ success: true, message: "Login successful", data: user });
  } catch (err) {
    console.error(err);
    next(new AppErr("User login or register failed", 500));
  }
};

// Update User Profile
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, mobile, profilePic } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { fullName, mobile, profilePic, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedUser) return next(new AppErr("User not found", 404));

    res
      .status(200)
      .json({ success: true, message: "User updated", data: updatedUser });
  } catch (err) {
    console.error(err);
    next(new AppErr("User update failed", 500));
  }
};

// Get User By ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return next(new AppErr("User not found", 404));

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    next(new AppErr("Get user failed", 500));
  }
};

// Helper function → check date overlap
const isDateOverlap = (bookings, checkIn, checkOut) => {
  return bookings.some(
    (b) =>
      new Date(checkIn) < new Date(b.checkOut) &&
      new Date(checkOut) > new Date(b.checkIn)
  );
};

const getAvailableProperties = async (req, res, next) => {
  try {
    const { categoryId, checkIn, checkOut, subtype, page = 1, limit = 10 } = req.query;

    if (!categoryId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "categoryId, checkIn, and checkOut are required",
      });
    }

    // ✅ Find category to determine type
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const type = category.name; // Villa, Hotel, Cottage, Camping
    let properties = [];

    switch (type) {
      case "Villa":
        properties = await Villa.find({
          category: categoryId,
          isapproved: "approved",
          isLive: true,
          deletedAt: null,
        });

        // filter out booked villas
        properties = properties.filter(
          (villa) => !isDateOverlap(villa.bookedDates, checkIn, checkOut)
        );

        // ✅ subtype filter for villa (like 2BHK, 3BHK)
        if (subtype) {
          properties = properties.filter((villa) => villa.bhkType === subtype);
        }
        break;

      case "Hotel":
        const rooms = await RoomUnit.find({
          deletedAt: null,
          status: "available",
          ...(subtype ? { roomType: subtype } : {}), // ✅ filter at query level
        }).populate({
          path: "hotel",
          match: {
            category: categoryId,
            isapproved: "approved",
            isLive: true,
            deletedAt: null,
          },
        });

        const hotelMap = {};
        rooms.forEach((room) => {
          if (room.hotel && !isDateOverlap(room.bookedDates, checkIn, checkOut)) {
            const hotelId = room.hotel._id.toString();
            if (!hotelMap[hotelId]) {
              hotelMap[hotelId] = {
                ...room.hotel.toObject(),
                rooms: [],
              };
            }
            hotelMap[hotelId].rooms.push({
              _id: room._id,
              subtype: room.roomType,
              totalRooms: room.totalRooms,
              minCapacity: room.minCapacity,
              maxCapacity: room.maxCapacity,
              pricePerNight: room.pricePerNight,
              amenities: room.amenities,
              images: room.roomImages,
            });
          }
        });
        properties = Object.values(hotelMap);
        break;

      case "Cottage":
        const cottages = await CottageUnit.find({
          deletedAt: null,
          status: "available",
          ...(subtype ? { cottageType: subtype } : {}), // ✅ filter at query level
        }).populate({
          path: "Cottages",
          match: {
            category: categoryId,
            isapproved: "approved",
            isLive: true,
            deletedAt: null,
          },
        });

        const cottageMap = {};
        cottages.forEach((cottage) => {
          if (cottage.Cottages && !isDateOverlap(cottage.bookedDates, checkIn, checkOut)) {
            const cottageId = cottage.Cottages._id.toString();
            if (!cottageMap[cottageId]) {
              cottageMap[cottageId] = {
                ...cottage.Cottages.toObject(),
                units: [],
              };
            }
            cottageMap[cottageId].units.push({
              _id: cottage._id,
              subtype: cottage.cottageType,
              totalUnits: cottage.totalUnits,
              minCapacity: cottage.minCapacity,
              maxCapacity: cottage.maxCapacity,
              pricePerNight: cottage.pricePerNight,
              amenities: cottage.amenities,
              images: cottage.cottageImages,
            });
          }
        });
        properties = Object.values(cottageMap);
        break;

      case "Camping":
        const tents = await Tent.find({
          deletedAt: null,
          status: "available",
          ...(subtype ? { tentType: subtype } : {}), // ✅ filter at query level
        }).populate({
          path: "camping",
          match: {
            category: categoryId,
            isapproved: "approved",
            isLive: true,
            deletedAt: null,
          },
        });

        const campingMap = {};
        tents.forEach((tent) => {
          if (tent.camping && !isDateOverlap(tent.bookedDates, checkIn, checkOut)) {
            const campId = tent.camping._id.toString();
            if (!campingMap[campId]) {
              campingMap[campId] = {
                ...tent.camping.toObject(),
                tents: [],
              };
            }
            campingMap[campId].tents.push({
              _id: tent._id,
              subtype: tent.tentType,
              totalTents: tent.totaltents,
              minCapacity: tent.minCapacity,
              maxCapacity: tent.maxCapacity,
              pricePerNight: tent.pricePerNight,
              amenities: tent.amenities,
              images: tent.tentimages,
            });
          }
        });
        properties = Object.values(campingMap);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid property type",
        });
    }

    // ✅ Pagination
    const totalProperties = properties.length;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const totalPages = Math.ceil(totalProperties / limitNumber);

    const paginatedProperties = properties.slice(
      (pageNumber - 1) * limitNumber,
      pageNumber * limitNumber
    );

    res.status(200).json({
      success: true,
      data: paginatedProperties,
      pagination: {
        total: totalProperties,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = {
  loginOrRegisterUser,
  updateUser,
  getUserById,
  getAvailableProperties,
};
