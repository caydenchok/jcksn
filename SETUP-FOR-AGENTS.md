# JCKSN WhatsApp Assistant — Setup

One-time setup takes about 5 minutes. After that, starting JCKSN is one double-click.

## Mac

1. **Install Node.js** (one time): go to <https://nodejs.org>, download the **LTS** version, install it.
2. **Double-click `JCKSN.app`** (or `JCKSN.command`) in this folder.
   - The first run installs everything and builds the app — give it a few minutes.
   - Your browser opens the dashboard automatically when it's ready.
3. **Keep the Terminal window open** (minimize it). Closing it stops the WhatsApp bot.

> If macOS blocks the app the first time: right-click `JCKSN.app` → **Open** → **Open**.

## Windows

1. **Install Node.js** (one time): go to <https://nodejs.org>, download the **LTS** version, install it.
2. **Double-click `JCKSN.bat`** in this folder.
   - The first run installs everything and builds the app — give it a few minutes.
   - Your browser opens the dashboard automatically when it's ready.
3. **Keep the black window open** (minimize it). Closing it stops the WhatsApp bot.

## First steps in the dashboard

1. **Settings** → fill in your name, phone, email, REN number, and photo → **Save Profile**.
2. **WhatsApp** → **Connect WhatsApp** → scan the QR code with your phone
   (WhatsApp → Settings → Linked Devices → Link a Device).
3. **Listings** → **Add Property** → add your real listings with photos.

Your public listings page is at **http://localhost:3000/p**.

## Daily use

- Start: double-click the JCKSN icon. Stop: close the Terminal/black window.
- WhatsApp stays connected between restarts — no need to re-scan the QR.
- Everything (listings, chats, leads) is stored locally in this folder — back it up by copying the folder.

## About the AI (automatic — nothing to do)

The assistant answers customers using an online AI. As a backup, the launcher also
sets up a **local AI (Ollama)** so replies keep working even if the online AI is down:

- **Windows**: installed automatically on first launch (a few minutes, one time).
- **Mac**: installed automatically if you have Homebrew; otherwise it's optional —
  grab it from <https://ollama.com/download> if you want the offline backup.

The backup AI model (~2GB) downloads in the background on first run.
