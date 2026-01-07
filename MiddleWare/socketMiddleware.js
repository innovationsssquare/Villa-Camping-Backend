const { getSocketIO } = require("../Services/Socket");

const socketMiddleware = (req, res, next) => {
  try {
    req.io = getSocketIO();
  } catch (err) {
    req.io = null;
  }
  next();
};

module.exports = socketMiddleware;
