const User = require("../Model/Userschema");
const AppErr = require("../Services/AppErr");
const Villa = require("../Model/Villaschema");
const Booking = require("../Model/Bookingschema");
const { Camping } = require("../Model/Campingschema");
const { Cottages } = require("../Model/Cottageschema");
const { Hotels } = require("../Model/Hotelschema");
const Location = require("../Model/Locationschema");
const Category = require("../Model/Categoryschema");
const { Room } = require("../Model/Hotelschema");
const { CottageUnit } = require("../Model/Cottageschema");
const { Tent } = require("../Model/Campingschema");
const moment = require("moment-timezone");
const redis = require("../Services/redis");

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

const CHECKIN_HOUR = 14; // 2:00 PM IST
const CHECKOUT_HOUR = 11; // 11 AM
const CHECKOUT_MINUTE = 30; // 11:30 AM IST

// Helper function → check date overlap
const isDateOverlap = (bookings, checkIn, checkOut) => {
  // Convert client input UTC → IST
  let checkInIST = moment.utc(checkIn).tz("Asia/Kolkata").set({
    hour: CHECKIN_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  let checkOutIST = moment.utc(checkOut).tz("Asia/Kolkata").set({
    hour: CHECKOUT_HOUR,
    minute: CHECKOUT_MINUTE,
    second: 0,
    millisecond: 0,
  });

  return bookings.some((b) => {
    // Convert DB UTC → IST
    let bookingCheckInIST = moment.utc(b.checkIn).tz("Asia/Kolkata").set({
      hour: CHECKIN_HOUR,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    let bookingCheckOutIST = moment.utc(b.checkOut).tz("Asia/Kolkata").set({
      hour: CHECKOUT_HOUR,
      minute: CHECKOUT_MINUTE,
      second: 0,
      millisecond: 0,
    });

    // ✅ Overlap check
    // If new checkIn is exactly same as old checkOut → ALLOWED
    return (
      checkInIST.isBefore(bookingCheckOutIST) &&
      checkOutIST.isAfter(bookingCheckInIST)
    );
  });
};

const isWeekendInRange = (checkIn, checkOut) => {
  let start = moment.utc(checkIn).tz("Asia/Kolkata").startOf("day");
  let end = moment.utc(checkOut).tz("Asia/Kolkata").startOf("day");

  let current = start.clone();

  while (current.isBefore(end)) {
    const day = current.day(); // 0 = Sunday, 6 = Saturday

    if (day === 0 || day === 6) {
      return true;
    }

    current.add(1, "day");
  }

  return false;
};

// const getAvailableProperties = async (req, res, next) => {
//   try {
//     const {
//       categoryId,
//       checkIn,
//       checkOut,
//       subtype,
//       sortBy,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     if (!categoryId || !checkIn || !checkOut) {
//       return res.status(400).json({
//         success: false,
//         message: "categoryId, checkIn, and checkOut are required",
//       });
//     }

//     // ✅ Find category to determine type
//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: "Category not found",
//       });
//     }

//     const type = category.name; // Villa, Hotel, Cottage, Camping
//     let properties = [];

//     switch (type) {
//       case "Villa":
//         properties = await Villa.find({
//           category: categoryId,
//           isapproved: "approved",
//           isLive: true,
//           deletedAt: null,
//         });
//         // filter out booked villas
//         properties = properties.filter(
//           (villa) => !isDateOverlap(villa.bookedDates, checkIn, checkOut)
//         );

//         // ✅ subtype filter for villa (like 2BHK, 3BHK)
//         if (subtype) {
//           properties = properties.filter((villa) => villa.bhkType === subtype);
//         }
//         break;

//       case "Hotel":
//         const rooms = await Room.find({
//           deletedAt: null,
//           status: "available",
//           ...(subtype ? { roomType: subtype } : {}), // ✅ filter at query level
//         }).populate({
//           path: "hotel",
//           match: {
//             category: categoryId,
//             isapproved: "approved",
//             isLive: true,
//             deletedAt: null,
//           },
//         });

//         const hotelMap = {};
//         rooms.forEach((room) => {
//           if (
//             room.hotel &&
//             !isDateOverlap(room.bookedDates, checkIn, checkOut)
//           ) {
//             const hotelId = room.hotel._id.toString();
//             if (!hotelMap[hotelId]) {
//               hotelMap[hotelId] = {
//                 ...room.hotel.toObject(),
//                 rooms: [],
//               };
//             }
//             hotelMap[hotelId].rooms.push({
//               _id: room._id,
//               subtype: room.roomType,
//               totalRooms: room.totalRooms,
//               minCapacity: room.minCapacity,
//               maxCapacity: room.maxCapacity,
//               pricePerNight: room.pricePerNight,
//               amenities: room.amenities,
//               images: room.roomImages,
//             });
//           }
//         });
//         properties = Object.values(hotelMap);
//         break;

//       case "Cottage":
//         const cottages = await CottageUnit.find({
//           deletedAt: null,
//           ...(subtype ? { cottageType: subtype } : {}),
//         }).populate({
//           path: "Cottages",
//           match: {
//             category: categoryId,
//             isapproved: "approved",
//             isLive: true,
//             deletedAt: null,
//           },
//         });

//         const cottageMap = {};

//         cottages.forEach((unit) => {
//           if (!unit.Cottages) return;

//           const cottageId = unit.Cottages._id.toString();

//           if (!cottageMap[cottageId]) {
//             cottageMap[cottageId] = {
//               ...unit.Cottages.toObject(),
//               units: [],
//             };
//           }

//           cottageMap[cottageId].units.push({
//             _id: unit._id,
//             subtype: unit.cottageType,
//             totalUnits: unit.totalcottage,
//             minCapacity: unit.minCapacity,
//             maxCapacity: unit.maxCapacity,
//             pricing: unit.pricing,
//             amenities: unit.amenities,
//             images: unit.cottageimages,
//             status: unit.status,
//           });
//         });

//         properties = Object.values(cottageMap);
//         break;

//       case "Camping":
//         const tents = await Tent.find({
//           deletedAt: null,
//           status: "available",
//           ...(subtype ? { tentType: subtype } : {}), // ✅ filter at query level
//         }).populate({
//           path: "camping",
//           match: {
//             category: categoryId,
//             isapproved: "approved",
//             isLive: true,
//             deletedAt: null,
//           },
//         });

//         const campingMap = {};
//         tents.forEach((tent) => {
//           if (
//             tent.camping &&
//             !isDateOverlap(tent.bookedDates, checkIn, checkOut)
//           ) {
//             const campId = tent.camping._id.toString();
//             if (!campingMap[campId]) {
//               campingMap[campId] = {
//                 ...tent.camping.toObject(),
//                 tents: [],
//               };
//             }
//             campingMap[campId].tents.push({
//               _id: tent._id,
//               subtype: tent.tentType,
//               totalTents: tent.totaltents,
//               minCapacity: tent.minCapacity,
//               maxCapacity: tent.maxCapacity,
//               pricePerNight: tent.pricePerNight,
//               amenities: tent.amenities,
//               images: tent.tentimages,
//             });
//           }
//         });
//         properties = Object.values(campingMap);
//         break;

//       default:
//         return res.status(400).json({
//           success: false,
//           message: "Invalid property type",
//         });
//     }

//     // ✅ Pagination
//     const totalProperties = properties.length;
//     const pageNumber = Number(page);
//     const limitNumber = Number(limit);
//     const totalPages = Math.ceil(totalProperties / limitNumber);

//     const paginatedProperties = properties.slice(
//       (pageNumber - 1) * limitNumber,
//       pageNumber * limitNumber
//     );

//     res.status(200).json({
//       success: true,
//       data: paginatedProperties,
//       pagination: {
//         total: totalProperties,
//         page: pageNumber,
//         limit: limitNumber,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     next(error);
//   }
// };

// const getAvailableProperties = async (req, res, next) => {
//   try {
//     const {
//       categoryId,
//       checkIn,
//       checkOut,
//       subtype,
//       sortBy = "popular",
//       priceMin,
//       priceMax,
//       search,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     if (!categoryId || !checkIn || !checkOut) {
//       return res.status(400).json({
//         success: false,
//         message: "categoryId, checkIn, and checkOut are required",
//       });
//     }

//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({
//         success: false,
//         message: "Category not found",
//       });
//     }

//     const type = category.name; // Villa | Hotel | Cottage | Camping
//     let properties = [];

//     /* =========================
//        FETCH PROPERTIES
//     ========================== */

//     switch (type) {
//       case "Villa": {
//         properties = await Villa.find({
//           category: categoryId,
//           isapproved: "approved",
//           isLive: true,
//           deletedAt: null,
//         });

//         properties = properties.filter(
//           (villa) => !isDateOverlap(villa.bookedDates, checkIn, checkOut)
//         );

//         if (subtype) {
//           properties = properties.filter(
//             (villa) => villa.bhkType === subtype
//           );
//         }
//         break;
//       }

//       case "Hotel": {
//         const rooms = await Room.find({
//           deletedAt: null,
//           status: "available",
//           ...(subtype ? { roomType: subtype } : {}),
//         }).populate({
//           path: "hotel",
//           match: {
//             category: categoryId,
//             isapproved: "approved",
//             isLive: true,
//             deletedAt: null,
//           },
//         });

//         const hotelMap = {};

//         rooms.forEach((room) => {
//           if (
//             room.hotel &&
//             !isDateOverlap(room.bookedDates, checkIn, checkOut)
//           ) {
//             const hotelId = room.hotel._id.toString();

//             if (!hotelMap[hotelId]) {
//               hotelMap[hotelId] = {
//                 ...room.hotel.toObject(),
//                 rooms: [],
//               };
//             }

//             hotelMap[hotelId].rooms.push({
//               _id: room._id,
//               subtype: room.roomType,
//               totalRooms: room.totalRooms,
//               minCapacity: room.minCapacity,
//               maxCapacity: room.maxCapacity,
//               amenities: room.amenities,
//               images: room.roomImages,
//             });
//           }
//         });

//         properties = Object.values(hotelMap);
//         break;
//       }

//       case "Cottage": {
//         const units = await CottageUnit.find({
//           deletedAt: null,
//           ...(subtype ? { cottageType: subtype } : {}),
//         }).populate({
//           path: "Cottages",
//           match: {
//             category: categoryId,
//             isapproved: "approved",
//             isLive: true,
//             deletedAt: null,
//           },
//         });

//         const cottageMap = {};

//         units.forEach((unit) => {
//           if (!unit.Cottages) return;

//           const cottageId = unit.Cottages._id.toString();

//           if (!cottageMap[cottageId]) {
//             cottageMap[cottageId] = {
//               ...unit.Cottages.toObject(),
//               units: [],
//             };
//           }

//           cottageMap[cottageId].units.push({
//             _id: unit._id,
//             subtype: unit.cottageType,
//             totalUnits: unit.totalcottage,
//             minCapacity: unit.minCapacity,
//             maxCapacity: unit.maxCapacity,
//             amenities: unit.amenities,
//             images: unit.cottageimages,
//             status: unit.status,
//           });
//         });

//         properties = Object.values(cottageMap);
//         break;
//       }

//       case "Camping": {
//         const tents = await Tent.find({
//           deletedAt: null,
//           status: "available",
//           ...(subtype ? { tentType: subtype } : {}),
//         }).populate({
//           path: "camping",
//           match: {
//             category: categoryId,
//             isapproved: "approved",
//             isLive: true,
//             deletedAt: null,
//           },
//         });

//         const campingMap = {};

//         tents.forEach((tent) => {
//           if (
//             tent.camping &&
//             !isDateOverlap(tent.bookedDates, checkIn, checkOut)
//           ) {
//             const campId = tent.camping._id.toString();

//             if (!campingMap[campId]) {
//               campingMap[campId] = {
//                 ...tent.camping.toObject(),
//                 tents: [],
//               };
//             }

//             campingMap[campId].tents.push({
//               _id: tent._id,
//               subtype: tent.tentType,
//               totalTents: tent.totaltents,
//               minCapacity: tent.minCapacity,
//               maxCapacity: tent.maxCapacity,
//               amenities: tent.amenities,
//               images: tent.tentimages,
//             });
//           }
//         });

//         properties = Object.values(campingMap);
//         break;
//       }

//       default:
//         return res.status(400).json({
//           success: false,
//           message: "Invalid property type",
//         });
//     }

//     /* =========================
//        SEARCH FILTER
//     ========================== */
//     if (search) {
//       const regex = new RegExp(search, "i");

//       properties = properties.filter((property) =>
//         regex.test(property.name || "")
//       );
//     }

//     /* =========================
//        PRICE RANGE FILTER
//        (COMMON pricing OBJECT)
//     ========================== */
//     if (priceMin || priceMax) {
//       const min = Number(priceMin) || 0;
//       const max = Number(priceMax) || Infinity;

//       properties = properties.filter((property) => {
//         const price = property.pricing?.weekdayPrice;
//         if (typeof price !== "number") return false;
//         return price >= min && price <= max;
//       });
//     }

//     /* =========================
//        SORTING
//     ========================== */
//     switch (sortBy) {
//       case "low-high":
//         properties.sort(
//           (a, b) =>
//             (a.pricing?.weekdayPrice || 0) -
//             (b.pricing?.weekdayPrice || 0)
//         );
//         break;

//       case "high-low":
//         properties.sort(
//           (a, b) =>
//             (b.pricing?.weekdayPrice || 0) -
//             (a.pricing?.weekdayPrice || 0)
//         );
//         break;

//       case "rating":
//         properties.sort(
//           (a, b) =>
//             (b.averageRating || 0) -
//             (a.averageRating || 0)
//         );
//         break;

//       case "popular":
//       default:
//         properties.sort(
//           (a, b) =>
//             (Array.isArray(b.tags) && b.tags.includes("popular") ? 1 : 0) -
//             (Array.isArray(a.tags) && a.tags.includes("popular") ? 1 : 0)
//         );
//     }

//     /* =========================
//        PAGINATION
//     ========================== */
//     const total = properties.length;
//     const pageNumber = Number(page);
//     const limitNumber = Number(limit);

//     const paginated = properties.slice(
//       (pageNumber - 1) * limitNumber,
//       pageNumber * limitNumber
//     );

//     res.status(200).json({
//       success: true,
//       data: paginated,
//       pagination: {
//         total,
//         page: pageNumber,
//         limit: limitNumber,
//         totalPages: Math.ceil(total / limitNumber),
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     next(error);
//   }
// };

const getAvailableProperties = async (req, res, next) => {
  try {
    const {
      categoryId,
      checkIn,
      checkOut,
      subtype,
      sortBy = "popular",
      priceMin,
      priceMax,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    if (!categoryId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "categoryId, checkIn, and checkOut are required",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const type = category.name; // Villa | Hotel | Cottage | Camping
    let properties = [];

    /* =========================
       WEEKEND DECISION (IST)
    ========================== */
    const isWeekend = isWeekendInRange(checkIn, checkOut);
    const priceKey = isWeekend ? "weekendPrice" : "weekdayPrice";

    /* =========================
       FETCH PROPERTIES
    ========================== */
    switch (type) {
      case "Villa": {
        properties = await Villa.find({
          category: categoryId,
          isapproved: "approved",
          isLive: true,
          deletedAt: null,
        });

        properties = properties.filter(
          (villa) => !isDateOverlap(villa.bookedDates, checkIn, checkOut)
        );

        if (subtype) {
          properties = properties.filter((villa) => villa.bhkType === subtype);
        }
        break;
      }

      case "Hotel": {
        const rooms = await Room.find({
          deletedAt: null,
          status: "available",
          ...(subtype ? { roomType: subtype } : {}),
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
          if (
            room.hotel &&
            !isDateOverlap(room.bookedDates, checkIn, checkOut)
          ) {
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
              amenities: room.amenities,
              images: room.roomImages,
            });
          }
        });

        properties = Object.values(hotelMap);
        break;
      }

      case "Cottage": {
        const units = await CottageUnit.find({
          deletedAt: null,
          ...(subtype ? { cottageType: subtype } : {}),
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

        units.forEach((unit) => {
          if (!unit.Cottages) return;

          const cottageId = unit.Cottages._id.toString();

          if (!cottageMap[cottageId]) {
            cottageMap[cottageId] = {
              ...unit.Cottages.toObject(),
              units: [],
            };
          }

          cottageMap[cottageId].units.push({
            _id: unit._id,
            subtype: unit.cottageType,
            totalUnits: unit.totalcottage,
            minCapacity: unit.minCapacity,
            maxCapacity: unit.maxCapacity,
            amenities: unit.amenities,
            images: unit.cottageimages,
            status: unit.status,
          });
        });

        properties = Object.values(cottageMap);
        break;
      }

      case "Camping": {
        const tents = await Tent.find({
          deletedAt: null,
          status: "available",
          ...(subtype ? { tentType: subtype } : {}),
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
          if (
            tent.camping &&
            !isDateOverlap(tent.bookedDates, checkIn, checkOut)
          ) {
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
              amenities: tent.amenities,
              images: tent.tentimages,
            });
          }
        });

        properties = Object.values(campingMap);
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid property type",
        });
    }

    /* =========================
       SEARCH FILTER
    ========================== */
    if (search) {
      const regex = new RegExp(search, "i");
      properties = properties.filter((p) => regex.test(p.name || ""));
    }

    /* =========================
       PRICE RANGE FILTER
       (COMMON pricing object)
    ========================== */
    if (priceMin || priceMax) {
      const min = Number(priceMin) || 0;
      const max = Number(priceMax) || Infinity;

      properties = properties.filter((p) => {
        const price = p.pricing?.[priceKey];
        if (typeof price !== "number") return false;
        return price >= min && price <= max;
      });
    }

    /* =========================
       SORTING
    ========================== */
    switch (sortBy) {
      case "low-high":
        properties.sort(
          (a, b) => (a.pricing?.[priceKey] || 0) - (b.pricing?.[priceKey] || 0)
        );
        break;

      case "high-low":
        properties.sort(
          (a, b) => (b.pricing?.[priceKey] || 0) - (a.pricing?.[priceKey] || 0)
        );
        break;

      case "rating":
        properties.sort(
          (a, b) => (b.averageRating || 0) - (a.averageRating || 0)
        );
        break;

      case "featured":
        properties = properties.filter(
          (p) => Array.isArray(p.tags) && p.tags.includes("featured")
        );
        break;

      case "new":
        properties.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        break;

      case "pool":
        properties = properties.filter(
          (p) =>
            Array.isArray(p.amenities) &&
            p.amenities.map((a) => a.toLowerCase()).includes("swimming pool")
        );
        break;

      case "popular":
      default:
        properties.sort(
          (a, b) =>
            (Array.isArray(b.tags) && b.tags.includes("popular") ? 1 : 0) -
            (Array.isArray(a.tags) && a.tags.includes("popular") ? 1 : 0)
        );
    }

    /* =========================
       PAGINATION
    ========================== */
    const total = properties.length;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const paginated = properties.slice(
      (pageNumber - 1) * limitNumber,
      pageNumber * limitNumber
    );

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const { categoryId, propertyId } = req.params;
    if (!categoryId || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "categoryId and propertyId are required",
      });
    }

    // ✅ Find category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const type = category.name; // Villa, Hotel, Cottage, Camping
    let property = null;
    switch (type) {
      case "Villa":
        property = await Villa.findOne({
          _id: propertyId,
          category: categoryId,
          isapproved: "approved",
          isLive: true,
          deletedAt: null,
        });
        break;

      case "Hotel":
        const rooms = await Room.find({
          hotel: propertyId,
          deletedAt: null,
        }).populate({
          path: "hotel",
          match: {
            _id: propertyId,
            category: categoryId,
            isapproved: "approved",
            isLive: true,
            deletedAt: null,
          },
        });

        if (rooms.length > 0 && rooms[0].hotel) {
          property = {
            ...rooms[0].hotel.toObject(),
            rooms: rooms.map((room) => ({
              _id: room._id,
              subtype: room.roomType,
              totalRooms: room.totalRooms,
              maxCapacity: room.maxCapacity,
              pricePerNight: room.pricePerNight,
              amenities: room.amenities,
              images: room.roomImages,
            })),
          };
        }
        break;

      case "Cottage":
        const cottageUnits = await CottageUnit.find({
          Cottages: propertyId,
          deletedAt: null,
        }).populate({
          path: "Cottages",
          match: {
            _id: propertyId,
            category: categoryId,
            isapproved: "approved",
            isLive: true,
            deletedAt: null,
          },
        });

        if (cottageUnits.length > 0 && cottageUnits[0].Cottages) {
          property = {
            ...cottageUnits[0].Cottages.toObject(),
            units: cottageUnits.map((unit) => ({
              _id: unit._id,
              subtype: unit.cottageType,
              totalUnits: unit.totalcottage,
              minCapacity: unit.minCapacity,
              maxCapacity: unit.maxCapacity,
              pricePerNight: unit.pricePerNight,
              amenities: unit.amenities,
              images: unit.cottageimages,
            })),
          };
        }
        break; // ✅ important

      case "Camping":
        const tents = await Tent.find({
          camping: propertyId,
          deletedAt: null,
        }).populate({
          path: "camping",
          match: {
            _id: propertyId,
            category: categoryId,
            isapproved: "approved",
            isLive: true,
            deletedAt: null,
          },
        });

        if (tents.length > 0 && tents[0].camping) {
          property = {
            ...tents[0].camping.toObject(),
            tents: tents.map((tent) => ({
              _id: tent._id,
              subtype: tent.tentType,
              totalTents: tent.totaltents,
              minCapacity: tent.minCapacity,
              maxCapacity: tent.maxCapacity,
              pricePerNight: tent.pricePerNight,
              amenities: tent.amenities,
              images: tent.tentimages,
            })),
          };
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid property type",
        });
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const checkVillaAvailability = async (req, res, next) => {
  try {
    const { propertyId, checkIn, checkOut } = req.body;

    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "propertyId, checkIn, checkOut are required",
      });
    }

    const villa = await Villa.findOne({
      _id: propertyId,
      isapproved: "approved",
      isLive: true,
      deletedAt: null,
    });

    if (!villa) {
      return res.status(404).json({
        success: false,
        message: "Villa not found",
      });
    }

    const isBooked = isDateOverlap(villa.bookedDates || [], checkIn, checkOut);

    if (isBooked) {
      return res.status(200).json({
        success: false,
        available: false,
        message: "Villa is not available for selected dates",
      });
    }

    res.status(200).json({
      success: true,
      available: true,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

const getUpcomingWeekendRange = () => {
  const now = moment.tz("Asia/Kolkata").startOf("day");

  let friday = now.clone().day(5); // Friday

  // If today is Sat/Sun, move to next week's Friday
  if (now.day() >= 6) {
    friday = friday.add(1, "week");
  }

  const sunday = friday.clone().day(7); // Sunday

  return {
    checkIn: friday.set({ hour: 14, minute: 0 }).toISOString(),
    checkOut: sunday.set({ hour: 11, minute: 30 }).toISOString(),
  };
};

const getAvailableThisWeekend = async (req, res, next) => {
  try {
    const { categoryId, subtype } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId is required",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const { checkIn, checkOut } = getUpcomingWeekendRange();
    const type = category.name;
    let properties = [];

    // 🏡 VILLA
    if (type === "Villa") {
      properties = await Villa.find({
        category: categoryId,
        isapproved: "approved",
        isLive: true,
        deletedAt: null,
        ...(subtype ? { bhkType: subtype } : {}),
      });

      properties = properties.filter(
        (villa) => !isDateOverlap(villa.bookedDates || [], checkIn, checkOut)
      );
    }

    // 🏨 HOTEL
    if (type === "Hotel") {
      const rooms = await Room.find({
        deletedAt: null,
        ...(subtype ? { roomType: subtype } : {}),
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
        if (
          room.hotel &&
          !isDateOverlap(room.bookedDates || [], checkIn, checkOut)
        ) {
          const id = room.hotel._id.toString();
          if (!hotelMap[id]) {
            hotelMap[id] = { ...room.hotel.toObject(), rooms: [] };
          }
          hotelMap[id].rooms.push(room);
        }
      });

      properties = Object.values(hotelMap);
    }

    // 🏕 CAMPING
    if (type === "Camping") {
      const tents = await Tent.find({
        deletedAt: null,
        status: "available",
        ...(subtype ? { tentType: subtype } : {}),
      }).populate({
        path: "camping",
        match: {
          category: categoryId,
          isapproved: "approved",
          isLive: true,
          deletedAt: null,
        },
      });

      const campMap = {};

      tents.forEach((tent) => {
        if (
          tent.camping &&
          !isDateOverlap(tent.bookedDates || [], checkIn, checkOut)
        ) {
          const id = tent.camping._id.toString();
          if (!campMap[id]) {
            campMap[id] = { ...tent.camping.toObject(), tents: [] };
          }
          campMap[id].tents.push(tent);
        }
      });

      properties = Object.values(campMap);
    }

    // 🏡 COTTAGE
    if (type === "Cottage") {
      const units = await CottageUnit.find({
        deletedAt: null,
        ...(subtype ? { cottageType: subtype } : {}),
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

      units.forEach((unit) => {
        if (!unit.Cottages) return;

        const id = unit.Cottages._id.toString();
        if (!cottageMap[id]) {
          cottageMap[id] = { ...unit.Cottages.toObject(), units: [] };
        }
        cottageMap[id].units.push(unit);
      });

      properties = Object.values(cottageMap);
    }

    res.status(200).json({
      success: true,
      weekend: { checkIn, checkOut },
      total: properties.length,
      data: properties,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

const getMapProperties = async (req, res, next) => {
  try {
    const { locationId, categoryId } = req.query;
    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: "locationId is required",
      });
    }

    // 🔹 Validate location
    const location = await Location.findById(locationId).select(
      "name coordinates"
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // 🔹 Base filter (COMMON FOR ALL)
    const baseFilter = {
      location: locationId,
      isLive: true,
      isapproved: "approved",
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    // 🔹 Optional category filter
    if (categoryId) {
      baseFilter.category = categoryId;
    }

    // 🔹 Fetch from all property models
    const [villas, campings, cottages, hotels] = await Promise.all([
      Villa.find(baseFilter)
        .populate("category", "name")
        .select("name pricing coordinates images category"),

      Camping.find(baseFilter)
        .populate("category", "name")
        .select("name pricing coordinates images category"),

      Cottages.find(baseFilter)
        .populate("category", "name")
        .select("name pricing coordinates images category"),

      Hotels.find(baseFilter)
        .populate("category", "name")
        .select("name pricing coordinates images category"),
    ]);

    // 🔹 Normalize response (VERY IMPORTANT)
    const normalize = (items, type) =>
      items.map((item) => ({
        id: item._id,
        title: item.name,
        price: item.pricing,
        coordinates: item.coordinates,
        image: item.images?.[0],
        category: item.category?.name,
        categoryId: item.category?._id,
        type, // villa | camping | cottage | hotel
        location: location.name,
      }));

    const data = [
      ...normalize(villas, "villa"),
      ...normalize(campings, "camping"),
      ...normalize(cottages, "cottage"),
      ...normalize(hotels, "hotel"),
    ];

    return res.status(200).json({
      success: true,
      location: {
        id: location._id,
        name: location.name,
        coordinates: location.coordinates,
      },
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const getTrendingReels = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 12;

    const pipeline = [
      {
        $match: {
          reelVideo: { $exists: true, $ne: "" },
          isLive: true,
          deletedAt: null,
        },
      },
      {
        $project: {
          title: "$name",
          videoUrl: "$reelVideo",
          image: { $arrayElemAt: ["$images", 0] },
          propertyType: { $literal: "" },
          author: "$name",
          createdAt: 1,
        },
      },
    ];

    const [villas, hotels, cottages, campings] = await Promise.all([
      Villa.aggregate([...pipeline, { $addFields: { propertyType: "villa" } }]),
      Hotels.aggregate([
        ...pipeline,
        { $addFields: { propertyType: "hotel" } },
      ]),
      Cottages.aggregate([
        ...pipeline,
        { $addFields: { propertyType: "cottage" } },
      ]),
      Camping.aggregate([
        ...pipeline,
        { $addFields: { propertyType: "camping" } },
      ]),
    ]);

    const reels = [...villas, ...hotels, ...cottages, ...campings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((item, index) => ({
        id: item._id,
        title: item.title,
        author: item.author,
        views: `${Math.floor(Math.random() * 10 + 1)}K Views`, // placeholder
        image: item.image,
        videoUrl: item.videoUrl,
        propertyType: item.propertyType,
      }));

    res.status(200).json({
      success: true,
      data: reels,
    });
  } catch (error) {
    next(error);
  }
};

const LIMIT_DEFAULT = 12;

const buildPipeline = () => [
  { $match: { isLive: true, deletedAt: null, "reviews.0": { $exists: true } } },
  { $unwind: "$reviews" },
  {
    $lookup: {
      from: "users", // 🔑 correct collection
      localField: "reviews.userId",
      foreignField: "_id",
      as: "user",
    },
  },
  {
    $addFields: {
      user: { $arrayElemAt: ["$user", 0] },
    },
  },
  {
    $project: {
      _id: "$reviews._id",
      rating: "$reviews.rating",
      review: "$reviews.comment",
      isTopReview: "$reviews.isTopReview",
      createdAt: "$reviews.createdAt",
      reviewImage: { $arrayElemAt: ["$reviews.images", 0] },
      propertyName: "$name",
      username: {
        $ifNull: ["$user.fullName", "Guest"],
      },
    },
  },
];

const getReviewHighlights = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 12;

    const [villas, hotels, cottages, campings] = await Promise.all([
      Villa.aggregate(buildPipeline()),
      Hotels.aggregate(buildPipeline()),
      Cottages.aggregate(buildPipeline()),
      Camping.aggregate(buildPipeline()),
    ]);

    const reviews = [...villas, ...hotels, ...cottages, ...campings]
      .sort((a, b) =>
        a.isTopReview !== b.isTopReview
          ? b.isTopReview - a.isTopReview
          : new Date(b.createdAt) - new Date(a.createdAt)
      )
      .slice(0, limit)
      .map((r) => ({
        id: r._id,
        username: r.username || "Guest",
        location: "India",
        rating: r.rating,
        review: r.review,
        reviewImage: r.reviewImage || null,
        propertyName: r.propertyName,
      }));

    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
};

const LIMIT_DEFAULTT = 10;

const getReels = async (req, res) => {
  const { cursor, limit = LIMIT_DEFAULTT } = req.query;

  const cacheKey = `reels:feed:v1:${cursor || "first"}:${limit}`;

  try {
    /* -------------------- 1️⃣ Redis -------------------- */
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        source: "redis",
        ...JSON.parse(cached),
      });
    }

    /* -------------------- 2️⃣ Cursor -------------------- */
    const cursorFilter = cursor
      ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
      : {};

    /* -------------------- 3️⃣ Base pipeline -------------------- */
    const basePipeline = [
      {
        $match: {
          isLive: true,
          deletedAt: null,
          reelVideo: { $exists: true, $ne: "" },
          ...cursorFilter,
        },
      },
      { $sort: { _id: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "locations",
          localField: "location",
          foreignField: "_id",
          as: "locationData",
        },
      },
      {
        $unwind: {
          path: "$locationData",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    /* -------------------- 4️⃣ Property-specific pipelines -------------------- */
    const projectCommon = (type) => ({
      $project: {
        id: "$_id",
        name: "$name",
        videoUrl: "$reelVideo",
        thumbnail: { $arrayElemAt: ["$images", 0] },

        rating: { $ifNull: ["$averageRating", 4.5] },
        reviews: { $ifNull: ["$totalReviews", 0] },

        location: {
          $cond: [
            { $ifNull: ["$locationData.name", false] },
            "$locationData.name",
            "Lonavala",
          ],
        },

        guests: { $ifNull: ["$maxCapacity", 6] },
        price: {
          weekday: "$pricing.weekdayPrice",
          weekend: "$pricing.weekendPrice",
        },
        amenities: { $slice: ["$amenities", 3] },

        propertyType: { $literal: type },
        createdAt: "$createdAt",
      },
    });

    const [villas, cottages, hotels, campings] = await Promise.all([
      Villa.aggregate([...basePipeline, projectCommon("villa")]),
      Cottages.aggregate([...basePipeline, projectCommon("cottage")]),
      Hotels.aggregate([...basePipeline, projectCommon("hotel")]),
      Camping.aggregate([...basePipeline, projectCommon("camping")]),
    ]);

    /* -------------------- 5️⃣ Merge + rank -------------------- */
    const reels = [...villas, ...cottages, ...hotels, ...campings].sort(
      (a, b) => b.createdAt - a.createdAt
    ); // stable

    const nextCursor = reels.at(-1)?.id || null;

    const response = {
      data: reels,
      nextCursor,
    };

    /* -------------------- 6️⃣ Cache -------------------- */
    await redis.setex(cacheKey, 120, JSON.stringify(response));

    res.json({
      success: true,
      source: "mongo",
      ...response,
    });
  } catch (err) {
    console.error("Reels error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reels",
    });
  }
};

module.exports = {
  loginOrRegisterUser,
  updateUser,
  getUserById,
  getAvailableProperties,
  getPropertyById,
  checkVillaAvailability,
  getAvailableThisWeekend,
  getMapProperties,
  getTrendingReels,
  getReviewHighlights,
  getReels,
};
