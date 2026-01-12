const Wishlist = require("../Model/Wishlistschema");
const AppErr = require("../Services/AppErr");
const redis = require("../Services/redis");

/**
 * ❤️ Toggle Wishlist
 * - MongoDB: source of truth
 * - Redis: counts + trending
 * - Socket.IO: realtime sync
 */
// const toggleWishlist = async (req, res, next) => {
//   try {
//     const { propertyId, propertyType ,userId} = req.body;

//     if (!propertyId || !propertyType) {
//       return next(new AppErr("PropertyId and PropertyType are required", 400));
//     }

//     const redisCountKey = `wishlist:count:${propertyType}:${propertyId}`;
//     const redisTrendingKey = "wishlist:trending";
//     const socketRoom = `user:${userId}`;

//     const existing = await Wishlist.findOne({
//       userId,
//       propertyId,
//       propertyType,
//       deletedAt: null,
//     });

//     /**
//      * ❤️ REMOVE FROM WISHLIST
//      */
//     if (existing) {
//       existing.deletedAt = new Date();
//       await existing.save();

//       // Redis updates
//       await redis.decr(redisCountKey);
//       await redis.zincrby(redisTrendingKey, -1, `${propertyType}:${propertyId}`);

//       // Socket sync (multi-device)
//       req.io?.to(socketRoom).emit("wishlist:update", {
//         propertyId,
//         propertyType,
//         wished: false,
//       });

//       return res.status(200).json({
//         success: true,
//         wished: false,
//         message: "Removed from wishlist",
//       });
//     }

//     /**
//      * ❤️ ADD TO WISHLIST
//      */
//     await Wishlist.create({
//       userId,
//       propertyId,
//       propertyType,
//     });

//     // Redis updates
//     await redis.incr(redisCountKey);
//     await redis.zincrby(redisTrendingKey, 1, `${propertyType}:${propertyId}`);

//     // Socket sync
//     req.io?.to(socketRoom).emit("wishlist:update", {
//       propertyId,
//       propertyType,
//       wished: true,
//     });

//     res.status(200).json({
//       success: true,
//       wished: true,
//       message: "Added to wishlist",
//     });
//   } catch (err) {
//     console.error("Toggle wishlist error:", err);
//     next(new AppErr("Failed to update wishlist", 500));
//   }
// };
const toggleWishlist = async (req, res, next) => {
  try {
    const { propertyId, propertyType, userId } = req.body;

    if (!propertyId || !propertyType || !userId) {
      return next(new AppErr("Missing required fields", 400));
    }

    const redisCountKey = `wishlist:count:${propertyType}:${propertyId}`;
    const redisTrendingKey = "wishlist:trending";
    const socketRoom = `user:${userId}`;

    // 🔍 Find ANY record (deleted or not)
    const wishlist = await Wishlist.findOne({
      userId,
      propertyId,
      propertyType,
    });

    /**
     * ❤️ REMOVE
     */
    if (wishlist && wishlist.deletedAt === null) {
      wishlist.deletedAt = new Date();
      await wishlist.save();

      await redis.decr(redisCountKey);
      await redis.zincrby(redisTrendingKey, -1, `${propertyType}:${propertyId}`);

      req.io?.to(socketRoom).emit("wishlist:update", {
        propertyId,
        propertyType,
        wished: false,
      });

      return res.status(200).json({
        success: true,
        wished: false,
        message: "Removed from wishlist",
      });
    }

    /**
     * ❤️ ADD (REVIVE OR CREATE)
     */
    if (wishlist) {
      // ♻️ revive
      wishlist.deletedAt = null;
      await wishlist.save();
    } else {
      // 🆕 new
      await Wishlist.create({
        userId,
        propertyId,
        propertyType,
      });
    }

    await redis.incr(redisCountKey);
    await redis.zincrby(redisTrendingKey, 1, `${propertyType}:${propertyId}`);

    req.io?.to(socketRoom).emit("wishlist:update", {
      propertyId,
      propertyType,
      wished: true,
    });

    res.status(200).json({
      success: true,
      wished: true,
      message: "Added to wishlist",
    });
  } catch (err) {
    console.error("Toggle wishlist error:", err);
    next(new AppErr("Failed to update wishlist", 500));
  }
};

/**
 * 📦 Get My Wishlist (full list)
 */
const getMyWishlist = async (req, res, next) => {
  try {
    const userId = "6833656360ed0e90157dd2e1";

       const wishlist = await Wishlist.find({
      userId,
      deletedAt: null,
    })
      .populate({
        path: "propertyId",
         select: "name images pricing address",
        match: { deletedAt: null }, 
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: wishlist,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch wishlist", 500));
  }
};

/**
 * 🆔 Get Wishlist IDs (FAST for UI)
 * Returns: ["villa:123", "hotel:456"]
 */
const getWishlistIds = async (req, res, next) => {
  try {
    const userId = "6833656360ed0e90157dd2e1";

    const wishlist = await Wishlist.find(
      { userId, deletedAt: null },
      { propertyId: 1, propertyType: 1 }
    );

    const ids = wishlist.map(
      (w) => `${w.propertyType}:${w.propertyId}`
    );

    res.status(200).json({
      success: true,
      data: ids,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch wishlist ids", 500));
  }
};

/**
 * ❌ Remove From Wishlist (explicit delete)
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { propertyId, propertyType } = req.params;

    const wishlist = await Wishlist.findOne({
      userId,
      propertyId,
      propertyType,
      deletedAt: null,
    });

    if (!wishlist) {
      return next(new AppErr("Wishlist item not found", 404));
    }

    wishlist.deletedAt = new Date();
    await wishlist.save();

    // Redis cleanup
    await redis.decr(`wishlist:count:${propertyType}:${propertyId}`);
    await redis.zincrby(
      "wishlist:trending",
      -1,
      `${propertyType}:${propertyId}`
    );

    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to remove wishlist item", 500));
  }
};

/**
 * 🔥 Trending by Wishlist
 * Uses Redis Sorted Set
 */
const getTrendingWishlist = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const trending = await redis.zrevrange(
      "wishlist:trending",
      0,
      limit - 1,
      "WITHSCORES"
    );

    const formatted = [];
    for (let i = 0; i < trending.length; i += 2) {
      formatted.push({
        key: trending[i], // villa:123
        count: Number(trending[i + 1]),
      });
    }

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    next(new AppErr("Failed to fetch trending wishlist", 500));
  }
};

module.exports = {
  toggleWishlist,
  getMyWishlist,
  getWishlistIds,
  removeFromWishlist,
  getTrendingWishlist,
};
