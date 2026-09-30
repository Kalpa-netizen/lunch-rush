# How to Install Lunch Rush on Samsung Smart TV Using a USB Pen Drive

Yes! Samsung Smart TVs support sideloading apps directly from a **USB Pen Drive** when Developer Mode is enabled.

---

## 📁 Step 1: Prepare Your USB Pen Drive

1. Take any standard USB Pen Drive / Flash Drive.
2. Format the USB drive as **FAT32** (or exFAT). *(FAT32 is recommended for 100% Samsung TV compatibility).*
3. Copy the **`userwidget`** folder from:
   - [`files-pasted-by-the-user-i/outputs/userwidget/`](file:///Users/kalpa/Documents/Codex/2026-09-27/files-pasted-by-the-user-i/outputs/userwidget)
4. Paste the `userwidget` folder directly into the **root** of your USB drive:
   ```text
   USB Drive (D:/ or /Volumes/PENDRIVE)/
   └── userwidget/
       ├── lunch-rush.wgt
       └── lunch-rush.zip
   ```

---

## 📺 Step 2: Enable Developer Mode on Your Samsung TV

*(This tells the TV to allow app installation from USB)*

1. Turn on your Samsung TV.
2. Press the **Home** button on the TV remote and navigate to **Apps**.
3. While inside the Apps section, press: **`1` `2` `3` `4` `5`** on your remote number pad.
4. A popup titled **Developer Mode Configuration** will appear.
5. Switch **Developer Mode** to **ON**.
6. In the **Host PC IP** box, type your computer's IP address (e.g., `192.168.1.50`).
7. Click **OK**.
8. **Restart the TV**: Hold down the **Power** button on your remote for 5 seconds until the TV turns off and reboots (or unplug the power cord for 10 seconds).

---

## 🔌 Step 3: Plug in the USB Pen Drive & Install

1. Plug your USB Pen Drive into any **USB port** on the back or side of your Samsung TV.
2. Wait 5–10 seconds. The Samsung TV will detect the `userwidget` folder and automatically install **Lunch Rush**.
3. You will see a notification on the top right: *"Installing Lunch Rush from USB..."* or *"App installation completed"*.
4. Open the **Apps** screen on your TV — **Lunch Rush** will now be listed under your installed apps!
5. You can now safely remove the USB drive; the app remains permanently installed on the TV.

---

## 🏎️ Step 4: Play the Game

1. On your Mac/PC, start the game server:
   ```bash
   cd files-pasted-by-the-user-i/outputs/lunch-rush
   npm start
   ```
2. Open **Lunch Rush** on your Samsung TV.
3. If prompted, confirm your computer's LAN IP.
4. Players scan the QR code on the TV screen with their mobile phones and start racing!
