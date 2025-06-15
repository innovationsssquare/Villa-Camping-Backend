const express = require("express");
const {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  addRoomToHotel,
} = require("../Controller/Hotel");

const HotelRouter = express.Router();

HotelRouter.post("/create/hotel", createHotel);
HotelRouter.get("/get/hotels", getAllHotels);
HotelRouter.get("/get/hotel/:id", getHotelById);
HotelRouter.put("/update/hotel/:id", updateHotel);
HotelRouter.delete("/delete/hotel/:id", deleteHotel);

// Room integration
HotelRouter.post("/add/room/:hotelId", addRoomToHotel);

module.exports = { HotelRouter };
