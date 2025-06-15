const User = require("../Model/User");
const AppErr = require("../Services/AppErr");

// Login or Register
const loginOrRegisterUser = async (req, res, next) => {
  try {
    const { firebaseUID, email, fullName, profilePic } = req.body;

    let user = await User.findOne({ firebaseUID });

    if (!user) {
      user = await User.create({ firebaseUID, email, fullName, profilePic });
      return res.status(201).json({ success: true, message: "User registered", data: user });
    }

    res.status(200).json({ success: true, message: "Login successful", data: user });
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

    res.status(200).json({ success: true, message: "User updated", data: updatedUser });
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

module.exports = {
  loginOrRegisterUser,
  updateUser,
  getUserById,
};
