const Notification = require("../Model/Notificationschema");
const AppErr = require("../Services/AppErr");

// ✅ Get notifications for any recipient (user/owner/admin)
exports.getNotifications = async (req, res, next) => {
  try {
    const { recipientId, recipientType } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      recipientId,
      recipientType,
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      recipientId,
      recipientType,
      status: { $ne: "deleted" },
    });

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

// ✅ Get unread notifications
exports.getUnread = async (req, res, next) => {
  try {
    const { recipientId, recipientType } = req.params;

    const notifications = await Notification.find({
      recipientId,
      recipientType,
      isRead: false,
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

// ✅ Mark a notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) return next(new AppErr("Notification not found", 404));

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

// ✅ Mark all as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const { recipientId } = req.params;

    await Notification.markAllAsRead(recipientId);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

// ✅ Delete (soft delete)
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) return next(new AppErr("Notification not found", 404));

    await notification.softDelete();

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};

// ✅ Unread Count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const { recipientId } = req.params;

    const count = await Notification.getUnreadCount(recipientId);

    res.status(200).json({
      success: true,
      unread: count,
    });
  } catch (err) {
    next(new AppErr(err.message, 500));
  }
};
