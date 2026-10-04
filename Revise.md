# Firebase FCM — Push Notifications

## 1. What is FCM?

**Firebase Cloud Messaging (FCM)** is Firebase's service for sending push notifications/messages from a backend to mobile devices.

---

## 2. FCM Basic Flow

```text
React Native App
      ↓
Request notification permission
      ↓
Get FCM Device Token
      ↓
Send token to Backend
      ↓
Store token in Database
      ↓
Backend uses Firebase Admin SDK
      ↓
FCM
      ↓
Android Device
      ↓
Notification
```

---

## 3. Important Components

### React Native / Expo

Responsible for:

* Requesting notification permission
* Getting the device FCM token
* Handling received notifications
* Handling notification taps

### Node.js Backend

Responsible for:

* Receiving device tokens
* Storing device registrations
* Selecting active devices
* Sending notification requests to Firebase

### Firebase Admin SDK

Used by the backend to securely communicate with Firebase services.

### FCM

Handles delivery of the notification to the target device.

---

## 4. Permission vs Token

These are different:

```text
Permission
→ Can the app show notifications?

FCM Token
→ Where should Firebase send the notification?
```

Permission being granted does **not** mean the token itself is the permission.

---

## 5. FCM Token

Example:

```js
const token =
    (await Notifications.getDevicePushTokenAsync()).data;
```

The token identifies a specific app installation/device registration for push delivery.

**Important:** FCM tokens can change, so the app should sync a new token with the backend.

---

## 6. Database Device Registration

Instead of storing only one token:

```text
user → token
```

use:

```text
user → device registration → FCM token
```

Example:

```text
Vignesh
├── Phone  → TOKEN_A
└── Tablet → TOKEN_B
```

Typical table:

```text
device_registrations
--------------------------------
id
user_id
device_id
fcm_token
platform
is_active
created_at
updated_at
```

---

## 7. Upsert

When the same user + device registers again:

```text
Existing device
      ↓
Update token
      ↓
Keep same device record
```

This prevents duplicate device records.

```sql
ON DUPLICATE KEY UPDATE
    fcm_token = ...,
    is_active = TRUE
```

---

## 8. Multiple Devices

Backend retrieves active tokens:

```js
const [devices] = await db.query(
    `SELECT fcm_token
     FROM device_registrations
     WHERE user_id = ?
     AND is_active = TRUE`,
    [userId]
);
```

Convert DB rows into tokens:

```js
const tokens = devices.map(
    device => device.fcm_token
);
```

Then send to multiple devices:

```js
await messaging.sendEachForMulticast({
    tokens,
    notification: {
        title: "Order Approved",
        body: "Your order has been approved!",
    },
});
```

---

## 9. Logout

Logout should normally deactivate **that device**, not every device.

```sql
UPDATE device_registrations
SET is_active = FALSE
WHERE user_id = ?
AND device_id = ?
```

Example:

```text
Vignesh
├── Phone  → inactive
└── Tablet → active
```

---

## 10. Notification Payload

```js
{
    notification: {
        title: "Order Approved",
        body: "Your order has been approved!",
    },

    data: {
        route: "/order",
        orderId: "123",
    }
}
```

### `notification`

User-facing notification content.

### `data`

Application-specific information.

For example:

```text
route → which screen to open
orderId → which order to display
```

---

## 11. Notification States

### Foreground

App is open.

React Native notification handler controls how the notification is displayed.

### Background

App is running in the background.

FCM/Android can display the notification.

When the user taps it, the app receives the notification response.

### Closed

App is not running.

Android/FCM can display the notification.

When the user taps it, the app launches and the app can read the initial notification.

---

## 12. Notification Tap → Navigation

```text
Notification
      ↓
data.route
      ↓
Expo Router
      ↓
Specific Screen
```

Example:

```js
const route =
    response.notification.request.content.data.route;

router.push(route);
```

For a closed app, use:

```js
Notifications.getLastNotificationResponseAsync();
```

to check whether the app was opened from a notification.

---

## 13. Token Lifecycle

FCM tokens are **not permanent**.

```text
TOKEN_A
   ↓
Token changes
   ↓
TOKEN_B
   ↓
Send updated token to Backend
   ↓
Update DB
```

The backend should always keep the latest token for that device registration.

---

## 14. Invalid Token

A token can become invalid/expired.

Basic production idea:

```text
FCM send
   ↓
Token invalid
   ↓
Deactivate that token/device registration
```

Do **not** deactivate all devices belonging to the user.

---

## 15. Notification Channel — Android

Notification channels control **how Android presents notifications**.

Example:

```js
await Notifications.setNotificationChannelAsync(
    "orders",
    {
        name: "Order Notifications",
        importance: Notifications.AndroidImportance.HIGH,
    }
);
```

Remember:

```text
FCM Token
→ WHERE to send

Notification Channel
→ HOW Android presents it
```

Channels are Android-specific.

---

## 16. Direct FCM vs Expo Push Service

### Direct FCM — our project

```text
RN
 ↓
FCM Token
 ↓
Node.js
 ↓
Firebase Admin SDK
 ↓
FCM
 ↓
Device
```

### Expo Push Service

```text
RN
 ↓
Expo Push Token
 ↓
Expo Push Service
 ↓
FCM / APNs
 ↓
Device
```

Our project uses **Direct FCM**.

---

## 17. Security

Firebase Admin credentials such as:

```text
serviceAccountKey.json
```

must stay on the **backend**.

Never put the service account key inside the React Native app.

Add it to `.gitignore`.

---

# FCM Mental Model

```text
USER
 ↓
DEVICE REGISTRATION
 ↓
FCM TOKEN
 ↓
NODE.JS BACKEND
 ↓
FIREBASE ADMIN SDK
 ↓
FCM
 ↓
ANDROID DEVICE
 ↓
NOTIFICATION
 ↓
USER ACTION
 ↓
APP / SCREEN
```

### Key Points to Remember

* **FCM = push messaging service**
* **FCM token = destination for push delivery**
* **Permission ≠ token**
* Store tokens in the backend/database
* One user can have multiple device registrations
* Logout should deactivate the specific device
* Tokens can change
* Invalid tokens should be deactivated
* `notification` = display content
* `data` = app-specific information
* Notification tap can trigger navigation
* Android notification channels control presentation
* Firebase Admin SDK is used on the backend
* Never expose service-account credentials in the mobile app
