# 📊 Shallot Declutter — Project State & Health

> **Last Updated:** September 4, 2026  
> **Current Version:** `v0.1.0` (MVP - Fully Functional Prototype)  
> **Status:** 🟢 Healthy & Ready to Run

---

## 🎯 What is this Document?

If you are new to this project or returning after some time, this document is your **live status dashboard**. It tells you what currently works, how the system fits together, what limitations exist, and what features are coming next—without burying you in complicated engineering jargon.

---

## 🚦 System Status At A Glance

| Module / Feature | Status | Description |
| :--- | :--- | :--- |
| **Camera & Photo Capture** | 🟢 Fully Working | Live webcam viewfinder with multi-page capture strip and manual file upload fallback. |
| **Document Image Enhancement** | 🟢 Fully Working | Real-time high-contrast binarization filter to improve document readability. |
| **Multi-Page PDF Generation** | 🟢 Fully Working | Automatically merges all captured pages into a single downloadable/uploadable PDF via `jsPDF`. |
| **Gemini AI Vision Extraction** | 🟢 Fully Working | Multimodal analysis using `gemini-2.5-flash` or `gemini-2.5-pro` with structured JSON schema output. |
| **Demo Mode / Simulation** | 🟢 Fully Working | Realistic instant extraction mock data when no API keys are entered, allowing immediate testing. |
| **Document Review Card** | 🟢 Fully Working | Interactive bottom review sheet allowing editing of issuer, dates, account #, and folder before filing. |
| **Google Drive OAuth & Upload** | 🟢 Fully Working | Client-side Google Identity Services (GIS) OAuth token flow + nested folder creation and multipart upload. |
| **Local Vault History** | 🟢 Fully Working | Saves all processed documents to browser LocalStorage with direct links to Google Drive files. |
| **Settings Management** | 🟢 Fully Working | Easily configure API keys, models, root Drive folder, and auto-file options. |

---

## 🏗️ Architecture in Plain English

Here is how data flows through the application from the moment a user scans a piece of paper:

```
[Camera or File Upload] 
         │
         ▼
[Page Capture Queue (1..N Pages)]
         │
         ├───▶ [jsPDF Engine] ─────────────▶ [Assembles Clean Multi-Page PDF]
         │                                                    │
         └───▶ [Gemini AI Vision]                             │
                     │                                        │
                     ▼                                        ▼
             [Structured Metadata]  ◀─── [User Review & Edits] ───┘
                     │
                     ▼
           [Execute Filing Action]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 [Google Drive Sync]    [Local Vault Ledger]
  - Creates Folders      - Saved to LocalStorage
  - Uploads PDF          - Keeps history & links
```

### Key Technologies Used:
1. **React 19 & Vite 8**: Modern, ultra-fast web engine for smooth page updates.
2. **TypeScript**: Catches mistakes and typos before code runs.
3. **jsPDF**: Creates crisp PDF files right in the user's browser without external servers.
4. **Google Identity Services (OAuth 2.0)**: Allows users to log in securely with their own Google account using the least-privilege `drive.file` scope.
5. **Vanilla CSS & Glassmorphism**: Tailored dark-mode UI with smooth micro-animations, designed for mobile and desktop screens alike.

---

## 🔒 Security & Privacy Posture

- **Zero Third-Party Backend**: There is no custom backend server listening or storing user data.
- **Client-Side Storage**: API keys and document metadata are stored strictly in the user's own browser (`localStorage`).
- **Restricted Cloud Permissions**: Google Drive authentication uses `https://www.googleapis.com/auth/drive.file`. This permission **only** allows the app to view and modify files that the app itself created—it cannot see or touch other files in the user's Google Drive.

---

## ⚠️ Known Quirks & Considerations

1. **Camera Permissions over HTTP**:
   - Web browsers (Chrome, Safari, Edge) will only allow camera access when running on `localhost` or over a secure `https://` connection. If testing across a local home network on your mobile phone, you must either set up an HTTPS tunnel or use the file upload button.
2. **Google OAuth Authorized Origins**:
   - If using Google Drive upload, the exact address in your browser address bar (e.g. `http://localhost:5173`) must be listed in the Google Cloud Console under "Authorized JavaScript origins".
3. **Large Batches**:
   - Scanning more than 15-20 high-resolution pages in a single document can consume noticeable browser memory when building the PDF.

---

## 🗺️ Roadmap & Upcoming Improvements

- [ ] **Offline Text OCR**: Add client-side text recognition (e.g., Tesseract.js) so basic text reading can happen completely offline without internet access.
- [ ] **Batch Processing**: Scan multiple different receipts or bills at once and let AI split them into separate documents automatically.
- [ ] **Custom Tag & Folder Presets**: Allow users to define their own favorite folder structures and quick tags in Settings.
- [ ] **Alternative Cloud Storage**: Add optional support for OneDrive, Dropbox, or local file system folder export.
- [ ] **PWA Offline Service Worker**: Enable full offline caching so the app shell loads even without an active internet connection.

---

## 📝 Revision & Maintenance Protocol

Whenever you make changes to this codebase:
1. Check off or add relevant items in the **Roadmap** and **System Status** tables above.
2. Update the `Last Updated` date at the top of this document.
3. Add a corresponding entry in **`CHANGELOG.md`** describing what changed.
