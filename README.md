<div align="center">

# 🧅 Shallot Declutter — AI Document Organizer

**Turn messy physical paperwork into neatly organized, searchable digital files in seconds.**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/Platform-iPhone%20%7C%20Android%20%7C%20Web-orange.svg?style=flat-square)](#-iphone--mobile-app-guide)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-success.svg?style=flat-square)](public/manifest.json)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-teal.svg?style=flat-square)](.github/workflows/deploy.yml)

<p align="center">
  <a href="https://strothman.github.io/shallot-declutter/"><strong>📱 Open the Live Web App</strong></a> •
  <a href="#-what-does-shallot-declutter-do">What is Declutter?</a> •
  <a href="#-iphone--mobile-app-guide">iPhone Setup</a> •
  <a href="#-key-features-explained-in-plain-english">Features</a> •
  <a href="#-quick-start-guide-for-beginners">Quick Start</a>
</p>

</div>

---

Welcome to **Shallot Declutter**! If you have ever felt overwhelmed by stacks of medical bills, Explanation of Benefits (EOB) forms, tax notices, receipts, or insurance statements, this app was made for you.

Shallot Declutter uses your camera or uploaded photos, reads the text using Google's Gemini AI, automatically names the file in a standardized format, creates a multi-page PDF, and saves it directly to your Google Drive in the right folder.

---

## 🌟 What Does Shallot Declutter Do?

Imagine you just received a complicated 4-page medical bill or dental insurance letter:

1. 📸 **Snap or Upload**: Point your phone camera or upload photos of each page.
2. 🤖 **AI Reads It**: Google Gemini AI examines the pages to figure out:
   - What kind of document it is (e.g., Medical Bill, Insurance EOB, Receipt, Tax Form).
   - Who sent it (the issuer/clinic/vendor, e.g., Quest Diagnostics, Aetna, IRS).
   - Crucial dates, patient or account numbers, and any amount due.
   - A 1-sentence plain-English summary.
3. ✏️ **Quick Review**: You get an instant preview card where you can tweak anything before it gets saved.
4. 📁 **One-Tap Filing**: With one click, it creates a clean multi-page PDF and files it straight into your Google Drive (e.g., `Shallot-Declutter/Medical/EOBs/2026/`) or downloads it straight to your computer!

---

## ✨ Key Features (Explained in Plain English)

- **Works Immediately Out of the Box (Demo Mode)**: Don't have API keys yet? No problem! The app includes an intelligent demo simulation mode so you can test the entire workflow right away.
- **Multi-Page Scanning**: Add 1 page, 2 pages, or 10 pages into a single document bundle.
- **High-Contrast Document Filter**: Toggle enhanced contrast to make faint ink and receipts crisp and legible.
- **Standardized Smart Filenames**: Goodbye `IMG_4920.jpg`! Hello `2026-03-15_EOB_Aetna_AnnualPhysical.pdf`.
- **Automatic Folder Routing**: Files automatically sort into category and year folders (like `Medical/Bills/2026` or `Taxes/2026`).
- **Private & Client-Side**: Your documents and API keys never touch any middleman servers—everything runs right inside your web browser.
- **Local Vault Ledger**: Keep track of everything you've scanned, with quick links to open the files in Google Drive.
- **Mobile Friendly (PWA Ready)**: Designed with large tap targets and bottom navigation, making it feel like a native app on your phone.

---

## 📱 iPhone & Mobile App Guide

Shallot Declutter is built as a **Progressive Web App (PWA)**, which means you can install it onto your iPhone without needing the Apple App Store!

### How to Install on Your iPhone:
1. Open **Safari** on your iPhone.
2. Navigate to your live app link:  
   👉 **`https://strothman.github.io/shallot-declutter/`**
3. Tap the **Share** button (the square icon with an arrow pointing up at the bottom of Safari).
4. Scroll down and tap **"Add to Home Screen"** 📲.
5. Tap **Add** in the top-right corner.

### Why Running on iPhone via GitHub Pages Works Great:
- 🔒 **Camera Access Enabled (HTTPS)**: Apple Safari strictly requires a secure `https://` connection to access your iPhone camera. Because GitHub Pages provides HTTPS, camera scanning works directly without any error!
- 🗂️ **Full-Screen App Feel**: When launched from your home screen, the Safari address bar disappears, giving you a full-screen experience.
- 💾 **Local Settings**: Your Gemini API Key and settings are securely remembered on your phone's browser storage.

---

## 🚀 Quick Start Guide (For Beginners)

You don't need to be a software engineer to run this project! Follow these simple step-by-step instructions.

### Step 1: Make Sure You Have Node.js Installed
Node.js is a free tool that runs JavaScript on your computer.
- Check if you have it: Open your terminal (PowerShell, Command Prompt, or Terminal on Mac) and type:
  ```bash
  node -v
  ```
- If it shows a version number like `v20.x` or `v22.x`, you're good!
- If not, download and install the LTS version from [nodejs.org](https://nodejs.org).

### Step 2: Open the Project Folder
Open your terminal and navigate to this project folder:
```bash
cd "path/to/Shallot-DECLUTTER"
```

### Step 3: Install Dependencies
Run this command once to download the required libraries (like React and icons):
```bash
npm install
```

### Step 4: Start the App
Start the local development server:
```bash
npm run dev
```

You will see a message in the terminal like:
```text
  VITE v8.2.2  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Hold `Ctrl` and click the `http://localhost:5173/` link (or copy and paste it into your browser) to open Shallot Declutter!

---

## ⚙️ Setting Up Real AI & Google Drive (Optional)

By default, the app works in **Demo Mode** with simulated AI extraction. When you are ready to connect real AI and real Google Drive uploads, follow these two optional setups.

### 1. Google Gemini AI Key (For Real Document Reading)
Gemini AI is the brain that reads the text on your paperwork.
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **"Get API key"**.
3. Create a free API key and copy it.
4. In Shallot Declutter, click the **Settings ⚙️** icon in the top-right corner.
5. Paste your key into the **Gemini API Key** field and select your preferred model (e.g., `Gemini 2.5 Flash`).
6. Click **Save Settings**.

### 2. Google Drive Connection (For Direct Cloud Filing)
If you want the app to save PDFs directly to your Google Drive account:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "My Shallot Organizer").
3. Enable the **Google Drive API** under **APIs & Services**.
4. Configure the **OAuth Consent Screen** (User Type: External, add your email as a test user).
5. Go to **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
6. Choose **Web application** and add `http://localhost:5173` to **Authorized JavaScript origins**.
7. Copy the **Client ID** (it ends with `.apps.googleusercontent.com`).
8. Open **Settings ⚙️** in Shallot Declutter, paste your Client ID, and click **Connect Google Account**.

> 💡 *Note: If you don't connect Google Drive, the app will simply save documents to your browser's local Vault and automatically download the PDF directly to your computer!*

---

## 📂 Project Structure Overview

Here is a friendly roadmap of how the code is organized:

```text
Shallot-DECLUTTER/
├── index.html                 # Main webpage entry and web fonts
├── package.json               # Project dependencies and script shortcuts
├── README.md                  # This guide!
├── PROJECT_STATE.md           # Current health, status, and roadmap of the project
├── CHANGELOG.md               # History of all updates and revisions
│
├── src/
│   ├── main.tsx               # App startup code
│   ├── App.tsx                # Master screen coordinator (nav, review modal, tabs)
│   ├── index.css              # Global styles, dark theme, and typography
│   │
│   ├── components/            # Visual parts of the interface
│   │   ├── Header.tsx         # Top bar with status pill and settings button
│   │   ├── BottomNav.tsx      # Bottom bar with Scan, Vault, and Settings tabs
│   │   ├── CameraCapture.tsx  # Viewfinder, multi-page strip, contrast filter
│   │   ├── DocumentReviewSheet.tsx # Card where you review AI extracted info
│   │   ├── VaultHistory.tsx   # History list of all processed paperwork
│   │   └── SettingsModal.tsx  # Configuration dialog for API keys & Drive
│   │
│   ├── services/              # Behind-the-scenes helpers
│   │   ├── geminiService.ts   # Sends scans to Gemini AI (with smart fallback)
│   │   ├── driveService.ts    # Creates folders and uploads files to Google Drive
│   │   ├── pdfService.ts      # Stitches multiple image pages into a PDF
│   │   └── storageService.ts  # Saves settings and history to your browser
│   │
│   └── types/                 # Blueprint definitions for data (TypeScript)
│       └── index.ts
```

---

## ❓ Common Questions & Troubleshooting

<details>
<summary><b>Why is my camera not opening?</b></summary>
Browsers require a secure connection (`https://` or `localhost`) to access webcams. Also, ensure you have granted camera permissions when prompted by your browser. If testing on a desktop without a webcam, use the <b>Upload File</b> button instead!
</details>

<details>
<summary><b>Are my medical documents safe and private?</b></summary>
Yes! The app runs 100% in your browser. Documents are never uploaded to any custom servers. When you connect Gemini and Google Drive, your browser talks directly to Google's official endpoints over encrypted HTTPS connections using your own credentials.
</details>

<details>
<summary><b>Can I use this on my phone?</b></summary>
Yes! The interface is built mobile-first. If you host the project on a local network or deploy it to a platform like Vercel or Netlify (with HTTPS), you can open it in Safari or Chrome and use "Add to Home Screen" for a full-screen app experience.
</details>

---

## 📜 Revisions & Keeping This Project Updated

Whenever changes or updates are made to this project, please update **`CHANGELOG.md`** and review **`PROJECT_STATE.md`**! See both files for guidelines and templates.
