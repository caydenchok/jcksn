# Property AI - WhatsApp Assistant

## How to Build .exe for Your Father

### Step 1: Set Your API Key
Edit the `.env` file and add your DeepSeek API key:
```
DEEPSEEK_API_KEY=your_key_here
```

### Step 2: Build the App
```bash
cd whatsapp-property-ai
npm run build
```

### Step 3: Build the .exe
```bash
npm run electron:build
```

The .exe will be in the `dist-electron` folder.

### Step 4: Give to Your Father
1. Copy the entire `dist-electron/Property AI WhatsApp Setup.exe` to your father's computer
2. Run the installer
3. Scan WhatsApp QR code
4. Done! The API key is already built into the app.

---

## Features
- AI auto-reply to customers in English, Malay, Chinese, Tamil
- Property listings management (rent & buy)
- Booking system (viewings & callbacks)
- Send property photos automatically
- Beautiful dark dashboard (Palantir-style)

## First Time Setup (Father)
1. Open the app
2. Go to WhatsApp page → Scan QR code
3. Add property listings
4. Done! AI handles customer replies automatically
