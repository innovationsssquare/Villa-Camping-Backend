const { Hotels, Room } = require("../Model/Hotelschema");
const AppErr = require("../Services/AppErr");
const Owner = require("../Model/Ownerschema");

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
    const hotel = await Hotels.findOne({ _id: id, deletedAt: null }).populate("rooms");

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
      return next(new AppErr("Hotel ID, User ID, and Rating are required", 400));
    }

    const hotel = await Hotels.findById(hotelId);
    if (!hotel || hotel.deletedAt) {
      return next(new AppErr("Hotel not found or has been deleted", 404));
    }

    hotel.reviews.push({ userId, rating, comment, images });

    const totalRatings = hotel.reviews.reduce((sum, review) => sum + review.rating, 0);
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

module.exports = {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  softDeleteHotel,
  getHotelByProperty,
  addHotelReview,
};
