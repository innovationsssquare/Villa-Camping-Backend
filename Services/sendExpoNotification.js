// utils/sendExpoNotification.js
const { Expo } = require('expo-server-sdk');

// Create Expo SDK client
let expo = new Expo();

module.exports.sendPushNotification = async (expoToken, messageData) => {
  if (!Expo.isExpoPushToken(expoToken)) {
    console.log("❌ Invalid Expo push token:", expoToken);
    return;
  }

  const messages = [
    {
      to: expoToken,
      sound: "default",
      title: messageData.title,
      body: messageData.body,
      data: messageData.data || {},  
      priority: "high",
    },
  ];

  try {
    let chunks = expo.chunkPushNotifications(messages);

    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    console.log("✅ Push Notification sent:", messageData.title);
  } catch (error) {
    console.log("❌ Error sending notification:", error);
  }
};
