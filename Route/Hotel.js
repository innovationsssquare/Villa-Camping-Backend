const express = require("express");
const {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  softDeleteHotel,
  getHotelByProperty,
  addHotelReview,
  approveAndUpdateHotel,
  updateHotelPricingByType,
} = require("../Controller/Hotel");

const HotelRouter = express.Router();

HotelRouter.post("/create/hotel", createHotel);
HotelRouter.get("/get/hotels", getAllHotels);
HotelRouter.get("/get/hotel/:id", getHotelById);
HotelRouter.put("/update/hotel/:id", updateHotel);
HotelRouter.delete("/delete/hotel/:id", softDeleteHotel);
HotelRouter.get("/get/hotels/property/:propertyId", getHotelByProperty);
HotelRouter.post("/add/review/:hotelId", addHotelReview);
HotelRouter.put("/approve-reject/:id", approveAndUpdateHotel);
HotelRouter.put("/update-hotel-pricing/:hotelId", updateHotelPricingByType);

module.exports = { HotelRouter };
