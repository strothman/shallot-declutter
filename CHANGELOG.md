# 📜 Shallot Declutter — Changelog

All notable changes to the **Shallot Declutter** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), written in clear, plain English so anyone—even a complete beginner—can understand what was added, changed, or fixed in each version.

---

## 📌 How to Update This File (Rule for Every Revision)

> **Golden Rule**: Every time you update the code, add a new feature, or fix a bug, make an entry in this file before finishing!

### Quick Steps to Add a Revision:
1. If your changes are still in progress or unreleased, add bullet points under `## [Unreleased]`.
2. When completing a revision/version, change `## [Unreleased]` to `## [vX.Y.Z] - YYYY-MM-DD`.
3. Use the following simple categories for your notes:
   - `### ✨ Added`: For brand new features or capabilities.
   - `### 🔄 Changed`: For updates to existing features or screens.
   - `### 🐛 Fixed`: For bug fixes or corrections to broken behavior.
   - `### 🔒 Security`: For privacy, token handling, or safety improvements.

---

## 📋 Next Revision Template (Copy & Paste For New Releases)

```markdown
## [vX.Y.Z] - YYYY-MM-DD
### ✨ Added
- [Feature 1 in plain English]
- [Feature 2 in plain English]

### 🔄 Changed
- [What changed and why it helps]

### 🐛 Fixed
- [What bug or problem was fixed]
```

---

## 🚀 Version History

### [Unreleased]
- Ongoing refinements to mobile camera auto-focus handling.
- Planned addition of offline OCR fallback.

---

### [v0.1.1] - 2026-09-04 — GitHub Pages Deployment & PWA Configuration
- ✨ **Added**: Automated GitHub Actions deployment workflow (`.github/workflows/deploy.yml`) matching the Shallot suite.
- 🔄 **Changed**: Configured `base: './'` in `vite.config.ts` and relative asset links in `index.html` and `manifest.json` for seamless GitHub Pages hosting.
- 🚀 **Deployed**: Live web app published at `https://strothman.github.io/shallot-declutter/`.
- 📱 **Mobile**: Enabled full PWA standalone "Add to Home Screen" support with secure HTTPS camera access for iOS.

---

### [v0.1.0] - 2026-09-04 — Initial Release (Working MVP)

This is the initial working release of Shallot Declutter, creating a complete end-to-end pipeline from physical paper scanning to AI document analysis, PDF generation, and Google Drive organization.

#### ✨ Added
- **Live Camera Scanner**:
  - Direct webcam/phone camera streaming right in the web browser.
  - Multi-page capture support: scan 1 page or 20 pages into a single document bundle.
  - Page preview strip with delete and re-order buttons.
  - File upload button fallback for devices without camera access.
  - High-contrast document enhancement filter (binarization/contrast boost) to make faint receipts and bills readable.

- **Multimodal AI Analysis (Google Gemini)**:
  - Integration with `gemini-2.5-flash` and `gemini-2.5-pro` models via the Google Generative Language API.
  - Automated structured JSON extraction for document type (EOBs, Medical Bills, Rx, Receipts, Taxes, etc.).
  - Automatic identification of the issuer (vendor/clinic/insurer), statement date, patient or account number, and amount due.
  - Smart filename generation following standard convention (`YYYY-MM-DD_[Type]_[Issuer]_[Topic].pdf`).
  - Target folder suggestion (e.g. `Shallot-Declutter/Medical/EOBs/2026`).
  - Intelligent simulated Demo Mode: works out of the box with realistic extraction even when no API key is provided.

- **Client-Side PDF Generation**:
  - High-resolution, multi-page PDF generation in the browser using `jsPDF`.
  - Automatic orientation and aspect ratio calculation per page.
  - One-click local PDF download if offline or if cloud upload is not connected.

- **Google Drive Integration**:
  - Secure Google OAuth 2.0 authentication using Google Identity Services (GIS).
  - Restricted scope (`drive.file`) ensuring the app only touches documents it creates.
  - Automatic nested folder path creation (e.g. creating `Medical`, `EOBs`, and `2026` subfolders automatically).
  - Multipart file upload directly to the user's personal Google Drive.

- **Interactive Review & Filing Workflow**:
  - Document Review Sheet modal allowing users to inspect and edit AI-extracted data before filing.
  - Optional "Auto-File" switch in settings to automatically file documents without waiting for manual confirmation.

- **Local Vault Ledger**:
  - Local browser storage (`localStorage`) of all scanned documents with dates, amounts, and tags.
  - Direct clickable links to view and share filed documents in Google Drive.
  - Document deletion from the local ledger.

- **Settings & Preferences**:
  - Modal dialog to configure Gemini API Key, Gemini model selection, and Google OAuth Client ID.
  - Customizable root Drive folder name (defaults to `Shallot-Declutter`).
  - Global toggle for document contrast enhancement.

- **Design & User Experience**:
  - Dark-mode glassmorphic aesthetic built with clean CSS tokens and animations.
  - Mobile-first layout with top status bar and bottom navigation bar (Scan, Vault, Settings).
  - Responsive toast notification system for instant feedback on saves and errors.
