const express = require("express");
const DbConnection = require("./Services/Db/Connection");
const morgan = require("morgan");
const helmet = require("helmet");
const mongosantize = require("express-mongo-sanitize");
const bodyParser = require("body-parser");
const cors = require("cors");
const globalErrHandler = require("./MiddleWare/GlobalError");
const AppErr = require("./Services/AppErr");
const { CategoryRouter } = require("./Route/Category");
const { OwnerRouter } = require("./Route/Owner");
const { VillaRouter } = require("./Route/Villa");
const { CampingRouter } = require("./Route/Camping");
const { CottageRouter } = require("./Route/Cottage");
const { HotelRouter } = require("./Route/Hotel");
const { AdminRouter } = require("./Route/Admin");
const { UserRouter } = require("./Route/User");
const { BookingRouter } = require("./Route/Booking");
const { LocationRouter } = require("./Route/Location");
const { NotificationRouter } = require("./Route/Notification");

const cron = require("node-cron");
const axios = require("axios");

DbConnection();

const { createServer } = require("http");
const { Server } = require("socket.io");
const { initSocket } = require("./Services/Socket");
const { CouponRouter } = require("./Route/Coupon");

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);

app.use(cors());

//------IN Build Middleware----------/
app.use(morgan("combined"));
app.use(helmet());
// app.use(cors());
app.use(mongosantize());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//--------------- Route Middleware ------------------//

app.use("/api/v1/Category", CategoryRouter);
app.use("/api/v1/Owner", OwnerRouter);
app.use("/api/v1/Villa", VillaRouter);
app.use("/api/v1/Camping", CampingRouter);
app.use("/api/v1/Cottage", CottageRouter);
app.use("/api/v1/Hotel", HotelRouter);
app.use("/api/v1/Admin", AdminRouter);
app.use("/api/v1/User", UserRouter);
app.use("/api/v1/Booking", BookingRouter);
app.use("/api/v1/Location", LocationRouter);
app.use("/api/v1/Coupon", CouponRouter);
app.use("/api/v1/Notification", NotificationRouter);

//--------------Not Found Route-------------------//
app.get("*", (req, res, next) => {
  return next(new AppErr("Route not found ! please try after some time", 404));
});

const PORT = process.env.PORT || 9100;

//----------Global Error -----------//
app.use(globalErrHandler);

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
