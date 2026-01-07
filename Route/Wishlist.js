const express = require("express");
const {
  toggleWishlist,
  getMyWishlist,
  getWishlistIds,
  removeFromWishlist,
  getTrendingWishlist,
} = require("../Controller/Wishlist");
const socketMiddleware = require("../MiddleWare/socketMiddleware");

const WishlistRouter = express.Router();

WishlistRouter.post("/wishlist/toggle", socketMiddleware, toggleWishlist);
WishlistRouter.get("/wishlist", getMyWishlist);
WishlistRouter.get("/wishlist/ids", getWishlistIds);
WishlistRouter.delete(
  "/wishlist/:propertyType/:propertyId",
  removeFromWishlist
);
WishlistRouter.delete(
  "/wishlist/trendingwishlist",
  getTrendingWishlist
);

module.exports = { WishlistRouter };
