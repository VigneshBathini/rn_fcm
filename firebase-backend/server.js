import express from "express";
import cors from "cors";

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

let deviceToken = null;

app.post("/device-token", (req, res) => {
    const { token } = req.body;

    deviceToken = token;

    console.log("FCM token received:", deviceToken);

    res.json({
        success: true,
        message: "FCM token saved",
    });
});

app.post("/send-notification", async (req, res) => {
    try {
        if (!deviceToken) {
            return res.status(400).json({
                success: false,
                message: "No device token available",
            });
        }

        const message = {
            token: deviceToken,

            notification: {
                title: "Order Approved",
                body: "Your order has been approved!",
            },

            data: {
                route: "/order",
            },
        };
        const response = await messaging.send(message);

        console.log("Notification sent:", response);

        res.json({
            success: true,
            messageId: response,
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