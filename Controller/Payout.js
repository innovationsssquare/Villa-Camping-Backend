const Payout = require("../Model/PayoutSchema");
const mongoose = require("mongoose");

// GET Monthly revenue for owner
const getOwnerMonthlyRevenue = async (req, res) => {
  try {
    const { ownerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ownerId" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // --- Current Month Revenue ---
    const currentMonthData = await Payout.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(ownerId),
          payoutStatus: "completed",
          "payoutTransactions.status": "completed",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$financials.netPayout" },
        },
      },
    ]);

    const currentRevenue = currentMonthData[0]?.totalRevenue || 0;

    // --- Last Month Revenue ---
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const lastMonthData = await Payout.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(ownerId),
          payoutStatus: "completed",
          "payoutTransactions.status": "completed",
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$financials.netPayout" },
        },
      },
    ]);

    const lastRevenue = lastMonthData[0]?.totalRevenue || 0;

    // Growth %
    const growth =
      lastRevenue === 0
        ? 100
        : ((currentRevenue - lastRevenue) / lastRevenue) * 100;

    return res.status(200).json({
      success: true,
      data: {
        currentMonthRevenue: currentRevenue,
        lastMonthRevenue: lastRevenue,
        growthPercentage: parseFloat(growth.toFixed(2)),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch owner revenue",
      error: error.message,
    });
  }
};

const getRecentPayouts = async (req, res, next) => {
  try {
    const payouts = await Payout.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      count: payouts.length,
      data: payouts,
    });
  } catch (err) {
    console.error("getRecentPayouts error:", err);
    next(new AppErr("Failed to fetch recent payouts", 500));
  }
};

// -----------------------------------------------------
// 2. TOTAL PENDING PAYOUT AMOUNT
// -----------------------------------------------------
const getPendingPayoutTotal = async (req, res, next) => {
  try {
    const result = await Payout.aggregate([
      {
        $match: {
          payoutStatus: { $in: ["pending", "eligible", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: "$financials.netPayout" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalPending: result[0]?.totalPending || 0,
    });
  } catch (err) {
    console.error("getPendingPayoutTotal error:", err);
    next(new AppErr("Failed to calculate pending payout total", 500));
  }
};

// -----------------------------------------------------
// 3. TOTAL COMPLETED PAYOUT AMOUNT
// -----------------------------------------------------
const getCompletedPayoutTotal = async (req, res, next) => {
  try {
    const result = await Payout.aggregate([
      { $match: { payoutStatus: "completed" } },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: "$financials.netPayout" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCompleted: result[0]?.totalCompleted || 0,
    });
  } catch (err) {
    console.error("getCompletedPayoutTotal error:", err);
    next(new AppErr("Failed to calculate completed payout total", 500));
  }
};

// -----------------------------------------------------
// 4. TOTAL ADMIN EARNINGS (commission + tax + gateway fee)
// -----------------------------------------------------
const getAdminEarningsTotal = async (req, res, next) => {
  try {
    const result = await Payout.aggregate([
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$financials.adminEarnings.commission" },
          totalTax: { $sum: "$financials.adminEarnings.tax" },
          totalGatewayFee: {
            $sum: "$financials.adminEarnings.gatewayFeeShare",
          },
          totalEarnings: { $sum: "$financials.adminEarnings.total" },
        },
      },
    ]);

    const summary = result[0] || {
      totalCommission: 0,
      totalTax: 0,
      totalGatewayFee: 0,
      totalEarnings: 0,
    };

    res.status(200).json({
      success: true,
      earnings: summary,
    });
  } catch (err) {
    console.error("getAdminEarningsTotal error:", err);
    next(new AppErr("Failed to calculate admin earnings", 500));
  }
};

// -----------------------------------------------------
// 5. PAGINATED PAYOUT LIST
// -----------------------------------------------------
const getPaginatedPayouts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, ownerId } = req.query;

    const filter = {};
    if (status) filter.payoutStatus = status;
    if (ownerId) filter.ownerId = ownerId;

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payout.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: payouts,
    });
  } catch (err) {
    console.error("getPaginatedPayouts error:", err);
    next(new AppErr("Failed to fetch payout list", 500));
  }
};

// -----------------------------------------------------
// 6. PAYOUT HISTORY (grouped by Month-Year)
// -----------------------------------------------------
const getPayoutHistory = async (req, res, next) => {
  try {
    const { ownerId } = req.query;

    const filter = {};
    if (ownerId) filter.ownerId = ownerId;

    const payouts = await Payout.find(filter)
      .select(
        "bookingReference financials.netPayout payoutStatus createdAt payoutTransactions"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Group payouts by Month-Year
    const history = payouts.reduce((acc, payout) => {
      const key = new Date(payout.createdAt).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      });

      if (!acc[key]) acc[key] = [];
      acc[key].push(payout);

      return acc;
    }, {});

    res.status(200).json({
      success: true,
      history,
    });
  } catch (err) {
    console.error("getPayoutHistory error:", err);
    next(new AppErr("Failed to fetch payout history", 500));
  }
};

module.exports = {
  getOwnerMonthlyRevenue,
  getRecentPayouts,
  getPendingPayoutTotal,
  getCompletedPayoutTotal,
  getAdminEarningsTotal,
  getPaginatedPayouts,
  getPayoutHistory,
};
