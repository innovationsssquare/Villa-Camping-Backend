const { Hotels, Room } = require("../Model/Hotel");
const AppErr = require("../Services/AppErr");

// Create Hotel
const createHotel = async (req, res, next) => {
  try {
    const hotel = await Hotels.create(req.body);
    res.status(201).json({ success: true, message: "Hotel created", data: hotel });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to create hotel", 500));
  }
};

// Get All Hotels
const getAllHotels = async (req, res, next) => {
  try {
    const hotels = await Hotels.find({ deletedAt: null }).populate("rooms property");
    res.status(200).json({ success: true, data: hotels });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch hotels", 500));
  }
};

// Get Hotel by ID
const getHotelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hotel = await Hotels.findById(id).populate("rooms property");

    if (!hotel || hotel.deletedAt) {
      return next(new AppErr("Hotel not found", 404));
    }

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
    const updated = await Hotels.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ success: true, message: "Hotel updated", data: updated });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to update hotel", 500));
  }
};

// Soft Delete Hotel
const deleteHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Hotels.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
    res.status(200).json({ success: true, message: "Hotel soft deleted", data: deleted });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to delete hotel", 500));
  }
};

// Add Room to Hotel
const addRoomToHotel = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const roomData = req.body;

    const room = await Room.create(roomData);

    const updatedHotel = await Hotels.findByIdAndUpdate(
      hotelId,
      { $push: { rooms: room._id } },
      { new: true }
    );

    res.status(201).json({ success: true, message: "Room added", data: { room, updatedHotel } });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to add room", 500));
  }
};

module.exports = {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  addRoomToHotel,
};
