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

### [v0.2.5] - 2026-09-12 — Fullscreen Document Preview & Interactive Zoom in Triage Studio
- ✨ **Added**: **`Preview & Zoom` Toolbar Button**: Added a dedicated high-visibility action button directly in the Triage Studio page manipulation toolbar to inspect paperwork up close before approving and filing.
- ✨ **Added**: **In-Window Floating Zoom Controls**: Added a floating translucent zoom bar in the top-right corner of the viewer with **Zoom In** (`+`), **Zoom Out** (`-`), **Reset** (`100%`), and **Expand** buttons (supporting smooth zoom scaling from `50%` up to `350%`).
- ✨ **Added**: **1-Click Image Zoom Toggle**: Clicking directly on the scanned page instantly toggles between 100% overview and 175% detailed zoom with auto-scrolling pan support.
- ✨ **Added**: **Fullscreen High-Resolution Lightbox**: Opens a dedicated full-bleed inspection modal with dark glass backdrop, multi-level zoom controls, previous/next page navigation arrows, keyboard shortcuts (`ESC` to close, `Left`/`Right` arrow keys to flip pages), and an **Open in Tab** button to view the uncompressed raw image or PDF directly in a native browser tab.

---

### [v0.2.4] - 2026-09-12 — Social Security & SSA-1099 Extraction & Custom Document Types
- ✨ **Added**: **Social Security & Form SSA-1099 Deep Extraction**: Added first-class multimodal extraction rules for Social Security paperwork (Form SSA-1099, SSA-1042S, Notice 703, and Benefit Verification letters). Accurately distinguishes Box 1 beneficiary (`Logan C Strothman`) from Box 7 representative payee / address (`Richard Strothman for Logan C Strothman`), extracts SSA Claim Number (`Box 8`), SSN last 4 (`Box 2`), and isolates all IRS tax reporting totals (`Box 3` benefits paid, `Box 4` repayments, `Box 5` net benefits, and `Box 6` federal tax withholding).
- ✨ **Added**: **Standard 'Social Security Statement' Document Type & Category**: Automatically routes filed SSA paperwork into `Outbox\Social Security Statement\YYYY\MM\` with rich metadata sidecars and clean filenames. Added `Social Security` to canonical category resolution and vault filter ribbons.
- ✨ **Added**: **Custom Document Types**: Added a `+ Custom Type` creation button and inline creator in the Document Type dropdown on the Inbox Triage screen. Users can create any custom folder type on the fly (e.g. `Bank Statement`, `Paystub`, `Auto Insurance`, `Veterinary Bill`), with automatic Windows filename sanitization and persistent saving to `AppSettings.customDocTypes` across sessions.

---

### [v0.2.3] - 2026-09-12 — Client-Side Vault Pagination & Scale Guard
- ✨ **Added**: **Client-Side Pagination for Document Vault**: Added high-performance pagination to `VaultHistory.tsx` to keep the DOM lean, responsive, and stutter-free when scanning in hundreds or thousands of documents.
- ✨ **Added**: **Items-Per-Page Selector**: Added a quick switcher allowing users to choose `12`, `24` (default), `48`, or `All` documents per page.
- ✨ **Added**: **Jump & Boundary Page Controls**: First (`⏮`), Previous (`◀`), individual page pills with ellipsis for large libraries, Next (`▶`), and Last (`⏭`) buttons.
- ✨ **Added**: **Range & Total Document Counter**: Real-time counter displaying `Showing X–Y of Z documents`.
- ✨ **Added**: **Smooth Scroll Transition**: Changing pages automatically scrolls the user smoothly to the top of the vault catalog view.
- ⚡ **Performance**: Full-text search, category filters, store dropdowns, financial spending metrics, and CSV export continue to operate across the entire master library instantly; pagination partitions only the rendered DOM nodes.

---

### [v0.2.2] - 2026-09-12 — Receipts Section, Store Filter & User Customizable Categories
- ✨ **Added**: **Dedicated Receipts Category & Metrics**: Added first-class 'Receipts' filter pill to the Vault History ribbon. When viewing Receipts or selecting a store, the top metrics cards dynamically shift into financial reporting mode: displaying **Receipts Filtered**, **Total Spent ($)**, and **Total Savings & Discounts ($)**.
- ✨ **Added**: **Dynamic Store & Place Dropdown Filter**: Dynamic dropdown in the filter bar listing every unique merchant/store (e.g. Kroger, Walmart, Trader Joe's) with real-time document counts.
- ✨ **Added**: **User-Customizable Category Ribbon**: Interactive **Customize** modal (`⚙️ Customize`) allowing users to pin or unpin quick-filter pills (Receipts, Recipes, Medical, Bills & Utilities, Insurance, Taxes) and create personalized custom categories (e.g. `Vehicle Maintenance`, `Work Expenses`).
- ✨ **Added**: **Smart Vault Discovery & Document Count Badges**: The category ribbon automatically detects non-empty categories present in the vault and displays real-time document count badges on each filter pill.
- ✨ **Added**: **Deep Receipt Line-Item Search**: The Vault live search now matches not only document titles, issuers, and summaries, but also individual line-item groceries and items within itemized receipts (e.g. searching "Goldfish" or "Romaine" immediately locates the exact receipt).
- ✨ **Added**: Persisted user preferences for `pinnedCategories` and `customCategories` in `AppSettings` via browser LocalStorage.
- ✨ **Added**: **Chronological Sort (`📅 Sort Chronology`)**: Instantly sorts all pages in a bundle by their photo creation / arrival timestamp. Clicking toggles between Oldest First and Newest First.
- ✨ **Added**: **Instant 1-Click Page Flip (`🔄 Flip Order`)**: Flips the entire document sequence (Page 1 ⇄ Page N) in 1 millisecond. Perfectly addresses cases where phone cameras or Google Drive upload sheets transfer multi-page documents in reverse order (Page 8 to Page 1).
- ✨ **Added**: **AI Auto-Sort by Page # (`🪄 AI Auto-Sort`)**: Reads printed page numbers across pages with automatic downscaling and strict 7-second timeout protection to prevent hanging.
- ✨ **Added**: **Quick Jump-to-First (⏮) & Jump-to-Last (⏭) Buttons**: Added instant 1-click controls in the Triage toolbar to shift any selected photo directly to the front (`Page 1`) or back of a multi-page document bundle.
- 🔄 **Removed**: **PC Webcam "Quick Scan / Upload" Tab**: Removed the computer camera viewfinder and header nav tab to streamline the desktop interface into two clean workspaces: **Inbox Triage** (for phone-scanned documents) and **Document Vault** (for master catalog history). Empty vault CTA now links directly to Inbox.

---

### [v0.2.1] - 2026-09-12 — Rich Retail & Kroger Receipt Itemization (Money App Ready)
- ✨ **Added**: Full item-level receipt basket extraction (`lineItems`) with clean product names, original prices, unit quantities, promotional discounts (e.g. Kroger Mega Event, Buy-2-Get-1), food/beverage tax classification (`F`/`B`), and automatic grocery categories (Pantry, Produce, Dairy, Beverages, Snacks).
- ✨ **Added**: Structured retail metadata nodes (`store`, `transaction`, `financials`, `rewards`) capturing store address, register/lane, card last 4, auth codes, subtotal, sales tax, total savings ($ and %), fuel points earned, month-to-date fuel points, and community rewards partners.
- ✨ **Added**: Unique receipt lookup and deduplication anchoring: captures Kroger Entry ID / survey barcode (`Entry ID: 024-802-98-785-502-600`) as the `referenceNumber` to trigger Shallot's Pre-Filing Duplicate Guard if the same receipt is rescanned.
- ✨ **Added**: Interactive **Receipt Itemization & Basket Drawer** in Triage Studio displaying expandable line items with discount tags, tax badges, and financial breakdown totals.
- ✨ **Added**: **Recipe Auto-Understanding & Classification**: Dedicated first-class `'Recipe'` document type and `'Recipes & Cooking'` category. Gemini automatically detects recipes, cookbooks, and culinary guides, capturing source/publisher, dish name, key ingredients, oven temperatures, and prep/bake times into `Outbox\Recipe\YYYY\MM\`.
- ✨ **Added**: Added `'Recipe'` to Triage Studio and Document Review Sheet doctype selector dropdowns, and `'Recipes & Cooking'` to Vault History filters.

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
