export interface LineItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  gstRate: number; // e.g. 18 for 18%
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
}

export type VoucherType = 'Purchase' | 'Payment' | 'Journal';

export interface BillData {
  id: string;
  fileName: string;
  imageUrl: string;
  rawOcrText?: string;
  voucherType: VoucherType;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD or DD-MM-YYYY
  dueDate?: string;
  
  // Supplier / Party details
  supplierName: string;
  supplierGstin: string;
  supplierState: string;
  supplierStateCode: string; // e.g. "27"
  supplierAddress?: string;
  
  // Tally Ledger Mapping
  partyLedgerName: string;
  purchaseLedgerName: string;
  taxLedgerCgst: string;
  taxLedgerSgst: string;
  taxLedgerIgst: string;
  roundOffLedger: string;
  
  // Financial amounts
  lineItems: LineItem[];
  taxableSubtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  
  narration: string;
  status: 'draft' | 'ocr_processing' | 'verified' | 'synced' | 'error';
  syncMessage?: string;
  syncedAt?: string;
  createdAt: string;
}

export interface TallyConfig {
  host: string; // default "127.0.0.1"
  port: number; // default 9000
  companyName: string; // Active company in Tally
  companyStateCode: string; // e.g. "27" (Maharashtra)
  defaultPurchaseLedger: string; // "Purchases Local" or "Purchases 18%"
  defaultCgstLedger: string; // "Input CGST"
  defaultSgstLedger: string; // "Input SGST"
  defaultIgstLedger: string; // "Input IGST"
  defaultRoundOffLedger: string; // "Round Off"
  isMockMode: boolean; // Enables simulated sync when Tally is offline
}

export interface TallySyncResult {
  success: boolean;
  message: string;
  voucherNumber?: string;
  createdCount?: number;
  rawResponse?: string;
  errors?: string[];
}

export interface TallyLedger {
  name: string;
  parent: string;
  gstin?: string;
  state?: string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}

// ==========================================
// GST Portal (gst.gov.in) Export Interfaces
// ==========================================

export interface GSTR1ItemDetail {
  num: number;
  itm_det: {
    txval: number; // Taxable value
    rt: number;    // Tax rate % (e.g. 18)
    iamt: number;  // IGST amount
    camt: number;  // CGST amount
    samt: number;  // SGST amount
    csamt: number; // Cess amount
  };
}

export interface GSTR1Invoice {
  inum: string;    // Invoice number
  idt: string;     // Invoice date in DD-MM-YYYY format
  val: number;     // Invoice total value
  pos: string;     // 2-digit Place of Supply state code
  rchrg: 'Y' | 'N';// Reverse charge
  inv_typ: 'R' | 'DE' | 'SEZWP' | 'SEZWOP'; // Invoice type (Regular default)
  itms: GSTR1ItemDetail[];
}

export interface GSTR1B2BCounterparty {
  ctin: string;    // Counterparty GSTIN
  cpty?: string;
  inv: GSTR1Invoice[];
}

export interface GSTR1B2CSItem {
  sply_ty: 'INTER' | 'INTRA';
  pos: string;
  typ: 'OE';       // Other than e-commerce
  rt: number;      // GST rate
  txval: number;   // Taxable value
  iamt: number;    // IGST
  camt: number;    // CGST
  samt: number;    // SGST
  csamt: number;   // Cess
}

export interface GSTR1HSNItem {
  num: number;
  hsn_sc: string;  // HSN code
  desc: string;    // Description
  uqc: string;     // Unit quantity code e.g. NOS, KGS
  qty: number;     // Total quantity
  val: number;     // Total gross value
  txval: number;   // Taxable value
  iamt: number;    // IGST
  camt: number;    // CGST
  samt: number;    // SGST
  csamt: number;   // Cess
}

export interface GSTR1DocDetail {
  doc_num: number;
  doc_typ: string;
  docs: Array<{
    num: number;
    from: string;
    to: string;
    totnum: number;
    canc: number;
    net_issue: number;
  }>;
}

export interface GSTR1Payload {
  gstin: string;   // Filer's GSTIN
  fp: string;      // Return period MMYYYY e.g. "112026"
  gt: number;      // Gross turnover in preceding financial year
  cur_gt: number;  // Current turnover
  b2b: GSTR1B2BCounterparty[];
  b2cs: GSTR1B2CSItem[];
  hsn: {
    data: GSTR1HSNItem[];
  };
  doc_issue: {
    doc_det: GSTR1DocDetail[];
  };
}

export interface GSTValidationReport {
  totalInvoices: number;
  b2bInvoicesCount: number;
  b2csInvoicesCount: number;
  validGstinCount: number;
  invalidGstinCount: number;
  invalidGstins: string[];
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalInvoiceValue: number;
  uniqueHsnCount: number;
}

export interface ElectronAPI {
  openFileDialog: () => Promise<string[] | null>;
  saveFileDialog: (defaultPath: string, extensions: string[]) => Promise<string | null>;
  saveFile: (filePath: string, content: string | Uint8Array) => Promise<boolean>;
  tallyRequest: (url: string, xmlBody: string) => Promise<{ status: number; text: string }>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
