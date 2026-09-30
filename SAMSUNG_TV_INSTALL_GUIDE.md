# Samsung Smart TV (Tizen OS) Installation Guide

**Lunch Rush** has been wrapped as a native Samsung Smart TV web application (`.wgt` Tizen package) with support for the Samsung Smart Remote (D-Pad navigation, action keys, Return button, and on-screen host controls).

---

## 📦 What Was Created

1. **`lunch-rush.wgt`**: The Samsung Smart TV installation package.
2. **`samsung-tv/config.xml`**: Tizen TV manifest configuration (1080p/4K resolution, landscape profile, permissions, TV input device registration).
3. **`samsung-tv/tizen-remote.js`**: TV Remote Control key event handler and spatial D-Pad navigation.
4. **`samsung-tv/tv-setup.js` & `tv-styles.css`**: On-screen remote control legend & server connector for Samsung TV.
5. **`npm run package:tv`**: Automated command to rebuild the `.wgt` package anytime.

---

## 🎮 How the Architecture Works on Samsung TV

- **Samsung TV**: Runs the 3D Big Screen Game Display (renders the 3D race, chase cameras, sound, and QR code for players).
- **Phones / Mobile Devices**: Players scan the QR code on the TV screen to use their phones as touch game controllers.
- **Game Server**: The Node.js / Socket.IO server runs on your local network (e.g., your Mac/PC or home server: `npm start`).

---

## 🚀 Step-by-Step Installation on Samsung Smart TV

### Step 1: Enable Developer Mode on Your Samsung TV

1. Turn on your Samsung Smart TV.
2. Press the **Home** button on your remote and open the **Apps** panel.
3. On your remote, press numbers: **`1` `2` `3` `4` `5`** in sequence.
4. A **Developer Mode Configuration** popup will appear.
5. Toggle **Developer Mode** to **ON**.
6. In the **Host PC IP** field, enter your computer's local IP address (e.g., `192.168.1.50`).
7. Click **OK**, then press and hold the TV Remote's **Power** button for 5 seconds (or unplug and replug the TV) to reboot it.

---

### Step 2: Install the App on Your Samsung TV

You can install `lunch-rush.wgt` onto your TV using either **Tizen CLI / SDB** or **Tizen Studio**:

#### Method A: Using SDB / Tizen CLI (Fastest via Terminal)

1. Make sure your computer and Samsung TV are connected to the same Wi-Fi network.
2. Connect to your TV using `sdb` (Samsung Device Bridge):
   ```bash
   sdb connect <TV_IP_ADDRESS>
   ```
   *(Find your TV's IP in TV Settings → Network → Network Status → IP Settings).*
3. Verify connection:
   ```bash
   sdb devices
   ```
4. Install the package directly to your TV:
   ```bash
   tizen install -n lunch-rush.wgt -t <DEVICE_NAME>
   # or
   sdb install lunch-rush.wgt
   ```

#### Method B: Using Tizen Studio (GUI)

1. Download and install [Samsung Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html).
2. Open **Device Manager** in Tizen Studio, click the **Remote Device Manager** icon, and add your TV's IP address.
3. In Tizen Studio, select **File → Open Projects from File System** and select the `outputs/lunch-rush` folder.
4. Right-click the project → **Run As → Tizen Web Application (Target: Your TV)**.

---

### Step 3: Launching & Playing

1. Start the game server on your computer:
   ```bash
   npm start
   ```
2. Open the **Lunch Rush** app from your Samsung TV Apps list.
3. If prompted on screen, confirm your computer's LAN address (e.g., `http://192.168.1.50:3000`).
4. **Samsung Remote Shortcuts**:
   - **D-Pad (Arrows)**: Navigate buttons & settings.
   - **Enter / OK**: Select / Click.
   - **Red Button**: Toggle Host & Server Settings.
   - **Green Button**: Enable / Mute Audio.
   - **Yellow Button**: Start / Stop AI Demo Riders.
   - **Blue Button**: Toggle Fullscreen.
   - **Return / Back**: Back / Exit App.
5. Have your friends scan the on-screen QR code with their phones and race!

---

### 💡 Alternative Quick Method: Samsung TV Web Browser

If you want to play immediately on your Samsung TV without enabling developer mode:
1. Start the server on your computer: `npm start`.
2. Open the **Internet** (Web Browser) app pre-installed on your Samsung TV.
3. Enter your computer's LAN address (e.g., `http://192.168.1.50:3000`).
4. Click **Enable Sound**, press the fullscreen icon in the browser, and bookmark the page for 1-click access!
