import { BillData, LineItem, TallyConfig } from '../types';
import { GSTIN_REGEX, getStateFromGSTIN, isInterStateTransaction, calculateItemTaxes } from './gstUtils';

/**
 * Intelligent rule-based parser for Indian Tax Invoices, Retail Bills & Receipts.
 * Works 100% offline on raw OCR text.
 */
export function parseInvoiceText(
  rawText: string,
  fileName: string = 'bill.jpg',
  config?: Partial<TallyConfig>
): Partial<BillData> {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 1. Extract GSTIN
  let supplierGstin = '';
  let supplierState = '';
  let supplierStateCode = '';

  const gstinMatch = rawText.match(GSTIN_REGEX);
  if (gstinMatch) {
    supplierGstin = gstinMatch[0].toUpperCase();
    const st = getStateFromGSTIN(supplierGstin);
    supplierState = st.stateName;
    supplierStateCode = st.stateCode;
  }

  // 2. Extract Supplier Name
  let supplierName = '';
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    // Skip common document headers
    if (
      /tax\s*invoice/i.test(line) ||
      /invoice/i.test(line) ||
      /bill\s*of\s*supply/i.test(line) ||
      /retail\s*invoice/i.test(line) ||
      /cash\s*memo/i.test(line) ||
      /original\s*for\s*recipient/i.test(line) ||
      /gstin/i.test(line)
    ) {
      continue;
    }

    // Look for lines that look like company names
    if (
      /^(M\/s|Messrs|Shree|Sri|M\/S)\s+/i.test(line) ||
      line.includes('Pvt Ltd') ||
      line.includes('Private Limited') ||
      line.includes('Enterprises') ||
      line.includes('Traders') ||
      line.includes('Solutions') ||
      line.includes('Store') ||
      line.includes('Agency') ||
      line.includes('Technologies')
    ) {
      supplierName = line.replace(/^(M\/s|Messrs|M\/S)\s+/i, '').trim();
      break;
    }

    // If no explicit keyword, take the very first non-empty, reasonably long header line
    if (!supplierName && line.length > 3 && !/^\d+$/.test(line) && !line.includes(':')) {
      supplierName = line;
    }
  }

  if (!supplierName) {
    supplierName = 'Cash Supplier';
  }

  // 3. Extract Invoice Number
  let invoiceNumber = '';
  const invNumberRegexes = [
    /(?:invoice\s*no|inv\s*no|bill\s*no|tax\s*invoice\s*no|voucher\s*no)[\s:.\-#]*([A-Za-z0-9\-\/]+)/i,
    /(?:inv|invoice|bill)\s*#[\s:.\-]*([A-Za-z0-9\-\/]+)/i,
    /(?:no\.|number)[\s:]*([A-Za-z0-9\-\/]{4,20})/i
  ];

  for (const regex of invNumberRegexes) {
    const match = rawText.match(regex);
    if (match && match[1] && match[1].length >= 2 && !/^(date|dated|gstin)$/i.test(match[1])) {
      invoiceNumber = match[1].trim();
      break;
    }
  }

  if (!invoiceNumber) {
    // Generate a fallback bill identifier with timestamp
    const now = new Date();
    invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;
  }

  // 4. Extract Invoice Date
  let invoiceDate = new Date().toISOString().split('T')[0];
  const dateRegexes = [
    /(?:date|dated|inv\s*date)[\s:.\-]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:date|dated)[\s:.\-]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
    /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\b)/,
    /(\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b)/
  ];

  for (const regex of dateRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const parsed = normalizeDate(match[1]);
      if (parsed) {
        invoiceDate = parsed;
        break;
      }
    }
  }

  // 5. Determine Inter-state vs Intra-state
  const companyStateCode = config?.companyStateCode || '27';
  const isInterState = isInterStateTransaction(supplierStateCode, companyStateCode);

  // 6. Extract Line Items
  const lineItems: LineItem[] = [];
  let detectedSubtotal = 0;
  let detectedTotal = 0;

  // Regex patterns for invoice amounts and tables
  const linesWithNumbers = lines.filter(l => /\d+\.?\d*/.test(l));

  // Try extracting line items from table-like rows
  let itemIdCounter = 1;
  for (const line of linesWithNumbers) {
    // Skip totals lines
    if (
      /total/i.test(line) ||
      /sub\s*total/i.test(line) ||
      /cgst/i.test(line) ||
      /sgst/i.test(line) ||
      /igst/i.test(line) ||
      /round\s*off/i.test(line) ||
      /invoice\s*no/i.test(line) ||
      /gstin/i.test(line) ||
      /date/i.test(line)
    ) {
      continue;
    }

    // Pattern: [Description] [HSN] [Qty] [Rate] [Amount]
    // Or: [Description] [Qty] [Rate] [Amount]
    const numbers = line.match(/\d+(?:\.\d{1,2})?/g);
    if (numbers && numbers.length >= 2) {
      const validNumbers = numbers.map(n => parseFloat(n)).filter(n => !isNaN(n) && n > 0);
      if (validNumbers.length >= 2) {
        // Last number is likely Amount
        const amount = validNumbers[validNumbers.length - 1];
        let rate = validNumbers.length >= 3 ? validNumbers[validNumbers.length - 2] : amount;
        let qty = validNumbers.length >= 4 ? validNumbers[validNumbers.length - 3] : 1;

        // If rate * qty doesn't equal amount roughly, adjust
        if (Math.abs(qty * rate - amount) > (amount * 0.2)) {
          qty = 1;
          rate = amount;
        }

        // HSN search in line
        const hsnMatch = line.match(/\b([0-9]{4,8})\b/);
        const hsnCode = hsnMatch ? hsnMatch[1] : '';

        // Extract description
        const descMatch = line.replace(/[0-9\.,₹\$]+/g, ' ').replace(/\s+/g, ' ').trim();
        const description = descMatch.length > 2 ? descMatch : `Item ${itemIdCounter}`;

        // Default GST rate 18% or detect from line
        let gstRate = 18;
        const gstMatch = line.match(/(5|12|18|28)\s*%/);
        if (gstMatch) {
          gstRate = parseInt(gstMatch[1], 10);
        }

        const taxes = calculateItemTaxes(amount, gstRate, isInterState);

        lineItems.push({
          id: `item-${itemIdCounter++}`,
          description,
          hsnCode,
          quantity: qty || 1,
          unit: 'NOS',
          rate: rate || amount,
          taxableAmount: amount,
          gstRate,
          cgstAmount: taxes.cgst,
          sgstAmount: taxes.sgst,
          igstAmount: taxes.igst,
          total: taxes.total
        });
      }
    }
  }

  // 7. Extract Totals (Grand Total, Taxable Subtotal, Taxes)
  // Check specific Grand Total indicators first, avoiding 'Sub Total' or 'Taxable Subtotal'
  const totalRegexes = [
    /(?:grand\s*total|net\s*payable|invoice\s*total|amount\s*payable|total\s*amount)[\s:.\-₹Rs]*([\d,]+\.?\d*)/i,
    /(?:balance\s*due)[\s:.\-₹Rs]*([\d,]+\.?\d*)/i,
    /(?<!sub\s*|sub-)total[\s:.\-₹Rs]*([\d,]+\.?\d*)/i
  ];

  for (const regex of totalRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        detectedTotal = val;
        break;
      }
    }
  }

  // Taxable subtotal regex
  const subtotalRegexes = [
    /(?:sub\s*total|taxable\s*value|taxable\s*amount)[\s:.\-₹Rs]*([\d,]+\.?\d*)/i
  ];
  for (const regex of subtotalRegexes) {
    const match = rawText.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        detectedSubtotal = val;
        break;
      }
    }
  }

  // CGST / SGST / IGST explicit extraction
  let detectedCgst = 0;
  let detectedSgst = 0;
  let detectedIgst = 0;

  const cgstMatch = rawText.match(/(?:central\s*gst|cgst)\s*(?:@\s*\d+(?:\.\d+)?%?)?[\s:.\-₹Rs]*([\d,]+(?:\.\d{1,2})?)/i);
  if (cgstMatch && cgstMatch[1]) {
    detectedCgst = parseFloat(cgstMatch[1].replace(/,/g, '')) || 0;
  }

  const sgstMatch = rawText.match(/(?:state\s*gst|sgst)\s*(?:@\s*\d+(?:\.\d+)?%?)?[\s:.\-₹Rs]*([\d,]+(?:\.\d{1,2})?)/i);
  if (sgstMatch && sgstMatch[1]) {
    detectedSgst = parseFloat(sgstMatch[1].replace(/,/g, '')) || 0;
  }

  const igstMatch = rawText.match(/(?:integrated\s*gst|igst)\s*(?:@\s*\d+(?:\.\d+)?%?)?[\s:.\-₹Rs]*([\d,]+(?:\.\d{1,2})?)/i);
  if (igstMatch && igstMatch[1]) {
    detectedIgst = parseFloat(igstMatch[1].replace(/,/g, '')) || 0;
  }

  // If no line items were detected from table rows, construct a fallback single line item
  if (lineItems.length === 0) {
    const fallbackTaxable = detectedSubtotal > 0 ? detectedSubtotal : (detectedTotal > 0 ? Number((detectedTotal / 1.18).toFixed(2)) : 1000);
    const taxes = calculateItemTaxes(fallbackTaxable, 18, isInterState);
    lineItems.push({
      id: 'item-1',
      description: 'Purchased Goods / Materials',
      hsnCode: '9983',
      quantity: 1,
      unit: 'NOS',
      rate: fallbackTaxable,
      taxableAmount: fallbackTaxable,
      gstRate: 18,
      cgstAmount: taxes.cgst,
      sgstAmount: taxes.sgst,
      igstAmount: taxes.igst,
      total: taxes.total
    });
  }

  // Calculate aggregated totals
  const calcTaxable = Number(lineItems.reduce((acc, i) => acc + (Number(i.taxableAmount) || 0), 0).toFixed(2));
  const calcCgst = detectedCgst > 0 ? detectedCgst : Number(lineItems.reduce((acc, i) => acc + (Number(i.cgstAmount) || 0), 0).toFixed(2));
  const calcSgst = detectedSgst > 0 ? detectedSgst : Number(lineItems.reduce((acc, i) => acc + (Number(i.sgstAmount) || 0), 0).toFixed(2));
  const calcIgst = detectedIgst > 0 ? detectedIgst : Number(lineItems.reduce((acc, i) => acc + (Number(i.igstAmount) || 0), 0).toFixed(2));

  let finalGrandTotal = detectedTotal > 0 ? detectedTotal : Number((calcTaxable + calcCgst + calcSgst + calcIgst).toFixed(2));
  const exactCalculatedTotal = Number((calcTaxable + calcCgst + calcSgst + calcIgst).toFixed(2));
  const roundOff = Number((finalGrandTotal - exactCalculatedTotal).toFixed(2));

  // Suggest Tally Ledgers
  const partyLedgerName = supplierName;
  const purchaseLedgerName = isInterState ? 'Interstate Purchases' : (config?.defaultPurchaseLedger || 'Purchases Local');
  const taxLedgerCgst = config?.defaultCgstLedger || 'Input CGST';
  const taxLedgerSgst = config?.defaultSgstLedger || 'Input SGST';
  const taxLedgerIgst = config?.defaultIgstLedger || 'Input IGST';
  const roundOffLedger = config?.defaultRoundOffLedger || 'Round Off';

  return {
    fileName,
    voucherType: 'Purchase',
    invoiceNumber,
    invoiceDate,
    supplierName,
    supplierGstin,
    supplierState,
    supplierStateCode,
    partyLedgerName,
    purchaseLedgerName,
    taxLedgerCgst,
    taxLedgerSgst,
    taxLedgerIgst,
    roundOffLedger,
    lineItems,
    taxableSubtotal: calcTaxable,
    cgstTotal: calcCgst,
    sgstTotal: calcSgst,
    igstTotal: calcIgst,
    roundOff,
    grandTotal: finalGrandTotal,
    narration: `Being purchase bill no ${invoiceNumber} dated ${invoiceDate} from ${supplierName} (GSTIN: ${supplierGstin || 'Unregistered'})`,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
}

/**
 * Normalizes varied invoice date strings into YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    
    // Check if month and day might be flipped if day > 12
    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try text month e.g. 15-Nov-2026 or 15 Nov 2026
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const textMatch = cleaned.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3})[a-z]*[\s\-]+(\d{2,4})$/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const mStr = textMatch[2].toLowerCase();
    let year = parseInt(textMatch[3], 10);
    if (year < 100) year += 2000;
    const month = months[mStr];
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}
