const Payout = require("../Model/PayoutSchema");
const mongoose = require("mongoose");

// GET Monthly revenue for owner
const getOwnerMonthlyRevenue = async (req, res) => {
  try {
    const { ownerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({ success: false, message: "Invalid ownerId" });
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
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$financials.netPayout" }
        }
      }
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
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$financials.netPayout" }
        }
      }
    ]);

    const lastRevenue = lastMonthData[0]?.totalRevenue || 0;

    // Growth %
    const growth =
      lastRevenue === 0 ? 100 : ((currentRevenue - lastRevenue) / lastRevenue) * 100;

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

module.exports={
 getOwnerMonthlyRevenue   
}