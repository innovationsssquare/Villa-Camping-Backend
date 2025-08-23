const express = require("express");
const {
  loginOrRegisterUser,
  updateUser,
  getUserById,
  getAvailableProperties
} = require("../Controller/User");

const UserRouter = express.Router();

UserRouter.post("/user/login", loginOrRegisterUser);
UserRouter.put("/user/update/:id", updateUser);
UserRouter.get("/user/:id", getUserById);
UserRouter.get("/properties/available", getAvailableProperties);

module.exports = { UserRouter };
