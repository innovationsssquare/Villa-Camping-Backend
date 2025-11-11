const express = require("express");
const {
 getOwnerMonthlyRevenue
} = require("../Controller/Payout");

const PayoutRouter = express.Router();

PayoutRouter.get("/payouts/owner/monthly-revenue/:ownerId", getOwnerMonthlyRevenue);

module.exports = { PayoutRouter };
