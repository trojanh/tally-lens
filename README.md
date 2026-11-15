# TallyLens 🔍⚡

> **Windows Desktop Application for Extracting Image Bills via 100% Offline Local OCR & Syncing directly into TallyPrime / Tally.ERP 9.**

[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://github.com)
[![Engine: Electron](https://img.shields.io/badge/Engine-Electron%2033-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Target: TallyPrime](https://img.shields.io/badge/Accounting-TallyPrime%20%2F%20ERP%209-15803D)](https://tallysolutions.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Overview

Entering purchase bills, expense receipts, and vendor cash memos into **Tally** is notoriously slow, repetitive, and error-prone. 

**TallyLens** eliminates manual data entry by extracting receipt data directly from images using **100% offline local OCR**. It verifies GSTINs, splits CGST/SGST vs IGST based on place of supply, verifies mathematical balances, and syncs the voucher directly into Tally's active company with **one click** — or exports standard Tally XML and Excel files.

---

## 🌟 Key Features

- **100% Offline Local OCR (Air-Gapped):**
  - Powered by local Tesseract.js WebAssembly.
  - Zero financial or bill data ever leaves your computer. No cloud fees, API rate limits, or external privacy risks.
- **Image Enhancement & Preprocessing:**
  - Automated contrast normalization and binarization for low-quality photos.
  - Interactive split-screen viewer with **Zoom**, **Pan**, **90° Rotation**, **High Contrast Mode**, and **Inverted / Negative Mode** (specifically tuned to read faded thermal cash receipts).
- **Intelligent Indian GST & Invoice Engine:**
  - **GSTIN & State Lookup:** Validates 15-character GST numbers and extracts 2-digit state codes (e.g. `27` Maharashtra, `29` Karnataka, `07` Delhi).
  - **Intra-State vs Inter-State Auto-Routing:** Compares vendor state against your company state to route taxes into **CGST + SGST** (50/50) or **IGST** (100%).
  - **Line Items & HSN/SAC Extraction:** Detects item description, HSN codes, quantity, unit rate, and tax slabs (0%, 5%, 12%, 18%, 28%).
  - **Live Arithmetic Balancing:** Continuously validates `Taxable Subtotal + Taxes + Round Off == Grand Total` with 1-click auto-balancing.
- **Dual Tally Integration:**
  - **1-Click Direct HTTP Sync:** Pushes vouchers directly into your active open company in TallyPrime / Tally.ERP 9 on `http://127.0.0.1:9000`.
  - **Live Ledger Autocomplete & 1-Click Creation:** Queries Tally for existing Sundry Creditors and Purchase ledgers. If a supplier does not exist in Tally, create it with 1 click including their GSTIN and State.
  - **Tally XML File Export (`.xml`):** Generates standard Tally envelope XML ready for manual import via `Import > Transactions`.
  - **Tally Excel Export (`.xlsx`):** Formatted spreadsheet ready for TallyPrime 4.0's native Excel import engine.
- **Batch Processing Queue:**
  - Upload 10+ bills at once, run OCR in the background, review balances, and batch push all vouchers into Tally in one single transaction.
- **Built-in Realistic Sample Invoices & Mock Mode:**
  - Includes ready-to-test Intra-State, Inter-State, and Retail Cash Memo bills.
  - Toggle **Mock Mode** in Settings to test the entire application even when Tally is offline!

---

## 🛠️ How to Enable Tally XML Server on Windows

To use 1-Click Direct Sync, TallyPrime needs its built-in XML Server active:

1. Open **TallyPrime** (or Tally.ERP 9) on your Windows computer.
2. In TallyPrime:
   - Click **F1 (Help)** > **Settings** > **Connectivity**.
   - Set **TallyPrime Act As:** to **Server** (or **Both**).
   - Set **Port:** to `9000` (default).
3. In Tally.ERP 9:
   - Press **F12: Configure** > **Advanced Configuration**.
   - Set **Tally is acting as:** to **Server**.
   - Set **Port:** to `9000`.
4. Accept changes (`Ctrl + A`) and restart Tally.
5. Open your company in Tally.
6. In **TallyLens**, click **Test Connection** in the top bar. A green badge will confirm your active company!

---

## 🚀 Installation & Usage

### Prerequisites
- Windows 10 / 11 (or macOS / Linux for development)
- Node.js (v18.0.0 or higher) & npm

### Method 1: Download Windows Executable (.exe)
Download the latest `TallyLens-Setup-x.x.x.exe` from the [GitHub Releases](https://github.com) page and double-click to install.

### Method 2: Run via npx / npm CLI
If published to npm, you can launch the app directly from your terminal:
```bash
npx @engineeringechoes/tally-lens
```

### Method 3: Clone & Run from Source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/tally-lens.git
   cd tally-lens
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application in Development Mode:**
   ```bash
   npm run dev
   ```

4. **Run Automated Unit Tests:**
   ```bash
   npm test
   ```

---

## 📦 Building the Windows Standalone Installer (.exe)

To build a standalone Windows Installer (`.exe` NSIS setup) and Portable executable on Windows:

```bash
npm run build:win
```

The output executables will be created in the `release/` folder:
- `release/TallyLens-Setup-1.0.0.exe` (Windows NSIS Setup installer)
- `release/TallyLens 1.0.0.exe` (Portable executable - runs without installation)

---

## 🚀 Publishing to npm & GitHub Releases

### 1. Automated GitHub Releases (Windows .exe)
A GitHub Action workflow (`.github/workflows/build-and-release.yml`) is included. Whenever you push a git version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions will automatically spin up a `windows-latest` runner, compile the Windows `.exe` installer, and attach it to a new GitHub Release.

### 2. Publishing to npm from GitHub
An npm publishing workflow (`.github/workflows/npm-publish.yml`) is also included.

1. Go to [npm](https://www.npmjs.com) > **Access Tokens** > Generate a **Publish Token** (Automation).
2. In your GitHub repository:
   - Go to **Settings** > **Secrets and variables** > **Actions**.
   - Click **New repository secret**.
   - Name: `NPM_TOKEN`
   - Value: `<your npm token>`
3. Whenever you create a Release on GitHub (or run the workflow manually), GitHub Actions will automatically publish the package to the npm registry!

---

## 📁 Architecture & File Layout

```
tally-lens/
├── .github/workflows/
│   ├── ci.yml                 # Automated test & build verification on push/PR
│   ├── build-and-release.yml  # Windows .exe builder and GitHub Releases publisher
│   └── npm-publish.yml        # Automated npm registry publisher
├── bin/
│   └── cli.js                 # CLI launcher for `npx tally-lens`
├── electron/
│   ├── main.ts                # Electron window lifecycle, native dialogs, Tally HTTP proxy
│   └── preload.ts             # Secure contextBridge API for IPC
├── src/
│   ├── components/
│   │   ├── Header.tsx         # Connection status pill & quick export buttons
│   │   ├── Sidebar.tsx        # Bill inbox, status badges, and file uploader
│   │   ├── ImageViewer.tsx    # Zoomable/rotatable preview with contrast filters
│   │   ├── BillEditor.tsx     # Split-screen verification, line items, ledger mapping
│   │   ├── BatchProcessor.tsx # Batch OCR queue & bulk Tally export modal
│   │   ├── SettingsModal.tsx  # Tally port, company, and default ledger settings
│   │   └── SampleBillsModal.tsx # Built-in realistic Indian GST invoices
│   ├── services/
│   │   ├── ocrService.ts      # 100% offline Tesseract OCR & canvas preprocessor
│   │   └── tallyService.ts    # Tally XML HTTP client & ledger synchronizer
│   ├── utils/
│   │   ├── billParser.ts      # Rule-based regex parser for Indian bills & receipts
│   │   ├── gstUtils.ts        # GST state codes, GSTIN check & tax computation
│   │   ├── xmlGenerator.ts    # Tally XML envelope & voucher generator
│   │   ├── excelExporter.ts   # TallyPrime Excel import generator
│   │   └── sampleBills.ts     # Built-in SVG vector invoice mockups
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces & definitions
│   ├── App.tsx                # Main split-screen application shell
│   └── main.tsx               # React DOM entry point
├── tests/                     # 18 passing automated unit tests
├── electron-builder.yml       # Windows build & packaging configuration
├── vite.config.ts             # Vite configuration
└── package.json
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
