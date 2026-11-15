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
