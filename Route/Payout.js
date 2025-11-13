const express = require("express");
const {
  getOwnerMonthlyRevenue,
  getRecentPayouts,
  getPendingPayoutTotal,
  getCompletedPayoutTotal,
  getAdminEarningsTotal,
  getPaginatedPayouts,
  getPayoutHistory,
} = require("../Controller/Payout");

const PayoutRouter = express.Router();

PayoutRouter.get(
  "/payouts/owner/monthly-revenue/:ownerId",
  getOwnerMonthlyRevenue
);

PayoutRouter.get("/recent/:ownerId", getRecentPayouts);

// 🔹 Total pending payout amount

PayoutRouter.get("/total-pending/:ownerId", getPendingPayoutTotal);
PayoutRouter.get("/total-completed/:ownerId", getCompletedPayoutTotal);



// 🔹 Total completed payout amount

// 🔹 Total admin earnings (commission + taxes)
PayoutRouter.get("/total-earnings", getAdminEarningsTotal);

// 🔹 Get payouts by pagination (for listing)
PayoutRouter.get("/list", getPaginatedPayouts);

// 🔹 Get payout history for owner or all
PayoutRouter.get("/history", getPayoutHistory);



module.exports = { PayoutRouter };
