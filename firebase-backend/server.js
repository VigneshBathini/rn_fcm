import express from "express";
import cors from "cors";
import db from "./db.js";

import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

initializeApp({
    credential: cert(serviceAccount),
});

const messaging = getMessaging();

const app = express();

app.use(cors());
app.use(express.json());



// app.post("/device-token", (req, res) => {
//     const { token } = req.body;

//     deviceToken = token;

//     console.log("FCM token received:", deviceToken);

//     res.json({
//         success: true,
//         message: "FCM token saved",
//     });
// });

app.post("/device-token", async (req, res) => {
    try {
        const { userId, deviceId, token, platform } = req.body;

        console.log("Received device:", {
            userId,
            deviceId,
            token,
            platform,
        });

        await db.query(
            `INSERT INTO device_registrations
   (user_id, device_id, fcm_token, platform)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
     fcm_token = VALUES(fcm_token),
     platform = VALUES(platform),
     is_active = TRUE`,
            [userId, deviceId, token, platform]
        );

        res.json({
            success: true,
            message: "Device token saved",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to save device token",
        });
    }
});

app.post("/device-logout", async (req, res) => {
    try {
        const { userId, deviceId } = req.body;

        await db.query(
            `UPDATE device_registrations
       SET is_active = FALSE
       WHERE user_id = ?
       AND device_id = ?`,
            [userId, deviceId]
        );

        res.json({
            success: true,
            message: "Device deactivated",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to deactivate device",
        });
    }
});

app.post("/send-notification", async (req, res) => {
    try {

        const userId = 1;

        const [devices] = await db.query(
            `SELECT fcm_token
     FROM device_registrations
     WHERE user_id = ?
     AND is_active = TRUE`,
            [userId]
        );

        const tokens = devices.map((device) => device.fcm_token);

        console.log("FCM tokens:", tokens);

        if (tokens.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active devices found",
            });
        }

        const message = {
            tokens,

            notification: {
                title: "Order Approved",
                body: "Your order has been approved!",
            },

            data: {
                route: "/order",
            },
        };

        const response = await messaging.sendEachForMulticast(message);

        console.log("FCM response:", response);

        response.responses.forEach((result, index) => {
            console.log("Token:", tokens[index]);
            console.log("Success:", result.success);

            if (!result.success) {
                console.log("Error:", result.error);
            }
        });

        res.json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
    } catch (error) {
        console.error("Notification error:", error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

app.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
});