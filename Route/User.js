const express = require("express");
const {
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
  getReels
} = require("../Controller/User");

const UserRouter = express.Router();

UserRouter.post("/user/login", loginOrRegisterUser);
UserRouter.put("/user/update/:id", updateUser);
UserRouter.get("/user/:id", getUserById);
UserRouter.get("/properties/available", getAvailableProperties);
UserRouter.get("/property/:categoryId/:propertyId", getPropertyById);
UserRouter.get("/villa/check-availability", checkVillaAvailability);
UserRouter.get("/available-this-weekend", getAvailableThisWeekend);
UserRouter.get("/map/properties", getMapProperties);
UserRouter.get("/reels/trending", getTrendingReels);
UserRouter.get("/reviews/highlights", getReviewHighlights);
UserRouter.get("/api/reels", getReels);

module.exports = { UserRouter };
