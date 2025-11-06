const express = require("express");
const {
  getNotifications,
  getUnread,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../Controller/Notification");

const NotificationRouter = express.Router();

// ✅ Get all notifications for user/owner/admin
NotificationRouter.get("/:recipientType/:recipientId", getNotifications);

// ✅ Get only unread
NotificationRouter.get("/:recipientType/:recipientId/unread", getUnread);

// ✅ Mark one as read
NotificationRouter.patch("/read/:id", markAsRead);

// ✅ Mark all as read
NotificationRouter.patch("/read-all/:recipientId", markAllAsRead);

// ✅ Delete notification (soft delete)
NotificationRouter.delete("/:id", deleteNotification);

// ✅ Unread count
NotificationRouter.get("/count/unread/:recipientId", getUnreadCount);

module.exports = { NotificationRouter };
