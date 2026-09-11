# 📊 Shallot Declutter — Project State & Health

> **Last Updated:** September 11, 2026  
> **Current Version:** `v0.2.0` (Dedicated PC Desktop Utility)  
> **Classification:** **Personal Data Entry Workstation**  
> **Status:** 🟢 Healthy & Ready to Run

---

## 🎯 System Classification: Personal Data Entry

Shallot Declutter is classified as a **Personal Data Entry Desktop Utility**. Its purpose is to eliminate manual data entry by extracting, structuring, validating, and cataloging personal records from messy paperwork and scans into standardized digital assets.

### 🌟 Core Goals:
1. **Zero Manual Transcription**: Seamlessly ingest physical scans, photos, and digital PDFs via Google Drive Inbox and extract high-fidelity structured data using Gemini 3.1 multimodal vision.
2. **Comprehensive Data Point Capture**: Extract every critical field needed for sorting, filtering, and record-keeping:
   - **Entity / Subject**: Patient, account holder, taxpayer, customer name
   - **Provider / Facility**: Clinic, hospital, doctor, physician, utility, or agency
   - **Clinical / Billing Detail**: Specific topic, exam, or procedure (e.g. `MRI Spine Lumbar w/o Contrast`)
   - **Identifiers**: MRN, Accession #, Account #, Claim #, or Invoice #
   - **Financials & Timing**: Statement date, due date, amount due, patient responsibility
   - **Clinical & Diagnostic Notes**: Bulleted key findings, impressions, and diagnoses
   - **Search Metadata**: Auto-generated tags and standardized taxonomy
3. **Dual-Artifact Storage**: For every processed document, persist:
   - A clean, standardized multi-page PDF (`Outbox\<TYPE>\<YYYY>\<MM>\<filename>.pdf`)
   - A self-describing JSON metadata sidecar (`Outbox\<TYPE>\<YYYY>\<MM>\<filename>.json`)
   - An updated master cross-category catalog (`Outbox\index.json`)
4. **Data Isolation & User Privacy**: Process documents directly against Google AI Studio using the user's personal API key, completely decoupled from IDE codebases or consumer chat histories.
5. **Fail-Closed Integrity**: Protect data accuracy by refusing to fabricate mock data if an extraction fails or is incomplete.

---

## 🚦 System Status At A Glance

| Module / Feature | Status | Description |
| :--- | :--- | :--- |
| **Google Drive Inbox & Triage** | 🟢 Fully Working | Monitors `G:\My Drive\IDE\Declutter\Inbox` for phone camera scans with one-click multi-page bundling & triage. |
| **Outbox Routing & Structure** | 🟢 Fully Working | Files PDFs into native Windows paths `Outbox\<DocType>\<YYYY>\<MM>\<filename>.pdf`. |
| **Metadata JSON Sidecars** | 🟢 Fully Working | Automatically writes `<filename>.json` alongside each PDF containing rich extracted metadata. |
| **Outbox Master Catalog** | 🟢 Fully Working | Maintains `Outbox\index.json` catalog for instant cross-category search, filtering, and sorting. |
| **Gemini 3.1 AI Vision Extraction** | 🟢 Fully Working | High-speed multimodal analysis extracting Patient, Doctor, Procedure, MRN, Dates, Amounts, Findings & Tags. |
| **Fail-Closed Safety** | 🟢 Fully Working | Strict protection: never fabricates or guesses mock data on failed extractions; halts and warns user. |
| **Data Isolation & Privacy** | 🟢 Fully Isolated | Uses direct Google AI Studio API key. Zero access to IDE code, workspaces, transcripts, or personal chats. |
| **Multi-Page PDF Generation** | 🟢 Fully Working | Merges captured pages or Inbox files into clean, searchable PDFs. |
| **Desktop Google Drive Integration** | 🟢 Fully Working | Transparent sync through Google Drive for Desktop (`G:\My Drive\`) without requiring OAuth client setup. |
| **Local Vault History** | 🟢 Fully Working | Saves all processed documents to browser LocalStorage with direct links to Google Drive files. |
| **5 High-Visibility Eye Comfort Themes** | 🟢 Fully Working | Instant 1-click theme switcher in Header and Settings: **Shallot Plum** (Kitchen Keeper signature), **High-Contrast Slate**, **Crisp Light Mode**, **Forest Pine**, and **Cyber Midnight**. |
| **Clean Archive Staging** | 🟢 Fully Working | Moves raw processed photos cleanly to `G:\My Drive\IDE\Declutter\Archive` (outside `Inbox`), allowing manual user review and deletion without cluttering the incoming scan folder. |
| **Interactive Page Reordering & 90° Rotation** | 🟢 Fully Working | Visual page rotation, re-sequencing (move left/right), and page pruning directly in the Triage Studio. |
| **Smart "Photo Burst" Auto-Grouping** | 🟢 Fully Working | 1-click detection and bundling of multiple phone camera photos taken within 3 minutes of each other. |
| **Vault Multi-Facet Search & CSV Export** | 🟢 Fully Working | Live search, Category/Person/Year filter pills, and 1-click audit-ready CSV spreadsheet download. |
| **Pre-Filing Duplicate Guard** | 🟢 Fully Working | Checks `Outbox/index.json` for reference number and issuer matches to prevent accidental double-filing. |

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
