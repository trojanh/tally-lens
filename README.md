# TallyBillSync 🧾⚡

**TallyBillSync** is a modern Windows desktop application designed for Indian accountants, tax practitioners, and business owners. It automates capturing image bills (receipts, cash memos, tax invoices) using **100% offline local OCR**, verifies line items and GST calculations, and syncs the vouchers directly back into **TallyPrime** and **Tally.ERP 9** or exports them as Tally-compliant XML/Excel files.

---

## 🌟 Key Features

### 1. 100% Offline Local OCR Engine
- **Air-Gapped & Private:** Uses local Tesseract.js WebAssembly OCR running directly on your Windows PC. No invoice images or sensitive financial data are ever sent to third-party cloud servers.
- **Image Preprocessing:** Automatic contrast boosting, luminance thresholding, and grayscale conversion for low-quality photos and thermal paper receipts.
- **Visual Enhancement Filters:** Built-in viewer with Pan, Zoom, 90° Rotation, High Contrast mode, and Inverted/Negative mode to read faint or faded cash receipts.

### 2. Smart Indian GST & Invoice Parser
- **GSTIN Extraction & Validation:** Detects 15-character GST numbers and extracts 2-digit state codes (e.g. `27` for Maharashtra, `29` for Karnataka, `07` for Delhi).
- **Intra-State vs Inter-State Logic:** Compares the supplier's state code against your company's state code to automatically determine tax routing:
  - Same state: **CGST + SGST** (split 50/50)
  - Different state: **IGST**
- **Line Items & HSN/SAC:** Extracts descriptions, quantities, unit prices, HSN codes, and GST rates (0%, 5%, 12%, 18%, 28%).
- **Live Arithmetic Balancing:** Continuously validates `Taxable Subtotal + Taxes + Round Off == Grand Total` and offers 1-click auto-balancing.

### 3. Dual Tally Integration (1-Click Push + File Export)
- **Direct 1-Click HTTP Sync:** Posts vouchers directly into your active open company in TallyPrime / Tally.ERP 9 via Tally's built-in XML server on `http://127.0.0.1:9000`.
- **Live Ledger Discovery:** Fetches real Sundry Creditors, Purchase Ledgers, and Tax Ledgers from Tally with instant auto-completion.
- **1-Click Ledger Creation:** If a supplier ledger doesn't exist in Tally, create it in Tally with one click including their GSTIN and state!
- **Tally XML Export (`.xml`):** Generates standard Tally envelope XML ready for manual import via `Import > Transactions`.
- **Tally Excel Export (`.xlsx`):** Formatted spreadsheet ready for TallyPrime 4.0's native Excel import engine.
- **Batch Processing:** Upload 10+ bills, run batch OCR in the background, and push all vouchers into Tally with a single click.

---

## 🛠️ How to Enable Tally XML Server on Windows

To enable 1-Click Direct Sync, TallyPrime needs its built-in XML Server active:

1. Open **TallyPrime** on your Windows PC.
2. Press **F1 (Help)** > **Settings** > **Connectivity** (or in Tally.ERP 9: press **F12: Configure** > **Advanced Configuration**).
3. Set **TallyPrime Act As:** to **Server** (or **Both**).
4. Set **Port:** to `9000` (default).
5. Accept changes and restart TallyPrime.
6. Open your company in TallyPrime.
7. In **TallyBillSync**, click **Test Connection** in the top bar. You'll see a green badge indicating connection!

> **Note:** If Tally is not running on your computer, **TallyBillSync** includes a **Mock Mode** toggle in Settings, allowing you to simulate and test all workflows seamlessly.

---

## 🚀 Getting Started (Development & Running)

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
To start the React frontend dev server:
```bash
npm run dev
```

### 3. Run Unit Tests
To verify GST calculations, OCR text parsing, and Tally XML generation:
```bash
npm test
```

---

## 📦 Building the Windows Application (.exe)

To build a standalone Windows Installer (`.exe` NSIS installer) and Portable executable:

```bash
npm run build:win
```

The compiled installer will be located in the `release/` directory:
- `release/TallyBillSync-Setup-1.0.0.exe` (Windows NSIS Setup installer)
- `release/TallyBillSync 1.0.0.exe` (Portable executable)

---

## 📁 Project Structure

```
quick-lavoisier-tally-importer/
├── electron/
│   ├── main.ts              # Electron main process (IPC, native dialogs, Tally HTTP proxy)
│   └── preload.ts           # Context bridge exposing native methods
├── src/
│   ├── components/
│   │   ├── Header.tsx       # Tally connection status pill & quick export buttons
│   │   ├── Sidebar.tsx      # Bill inbox, status badges, and file uploader
│   │   ├── ImageViewer.tsx  # Zoomable/rotatable preview with contrast filters
│   │   ├── BillEditor.tsx   # Split-screen verification, line items, ledger mapping
│   │   ├── BatchProcessor.tsx # Batch OCR queue & bulk Tally export modal
│   │   ├── SettingsModal.tsx # Tally port, company, and default ledger settings
│   │   └── SampleBillsModal.tsx # Built-in realistic Indian GST invoices
│   ├── services/
│   │   ├── ocrService.ts    # 100% offline Tesseract OCR & canvas preprocessor
│   │   └── tallyService.ts  # Tally XML HTTP client & ledger synchronizer
│   ├── utils/
│   │   ├── billParser.ts    # Rule-based regex parser for Indian bills & receipts
│   │   ├── gstUtils.ts      # GST state codes, GSTIN check & tax computation
│   │   ├── xmlGenerator.ts  # Tally XML envelope & voucher generator
│   │   ├── excelExporter.ts # TallyPrime Excel import generator
│   │   └── sampleBills.ts   # Built-in SVG vector invoice mockups
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   ├── App.tsx              # Main application shell
│   └── main.tsx             # React entry point
├── tests/                   # Automated Vitest unit test suite
├── electron-builder.yml     # Windows build & packaging configuration
├── vite.config.ts           # Vite configuration
└── package.json
```

---

## 📄 License
MIT
