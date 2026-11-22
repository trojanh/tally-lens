import { describe, it, expect } from 'vitest';
import {
  formatGstPortalDate,
  validateBillsForGst,
  generateGstr1Json,
  generateGstOfflineExcel
} from '../src/utils/gstPortalExporter';
import { BillData } from '../src/types';

describe('GST Portal Exporter Utility', () => {
  const dummyB2bBill: BillData = {
    id: 'b-1',
    fileName: 'Apex_Invoice.png',
    imageUrl: '',
    voucherType: 'Purchase',
    invoiceNumber: 'INV-2026-8812',
    invoiceDate: '2026-11-15',
    supplierName: 'Apex Electronics Pvt Ltd',
    supplierGstin: '27AAPFU0939F1ZV',
    supplierState: 'Maharashtra',
    supplierStateCode: '27',
    partyLedgerName: 'Apex Electronics Pvt Ltd',
    purchaseLedgerName: 'Purchases Local',
    taxLedgerCgst: 'Input CGST',
    taxLedgerSgst: 'Input SGST',
    taxLedgerIgst: 'Input IGST',
    roundOffLedger: 'Round Off',
    lineItems: [
      {
        id: 'item-1',
        description: 'Barcode Scanner',
        hsnCode: '8471',
        quantity: 2,
        unit: 'NOS',
        rate: 4250,
        taxableAmount: 8500,
        gstRate: 18,
        cgstAmount: 765,
        sgstAmount: 765,
        igstAmount: 0,
        total: 10030
      },
      {
        id: 'item-2',
        description: 'Thermal Paper Rolls',
        hsnCode: '4802',
        quantity: 10,
        unit: 'NOS',
        rate: 400,
        taxableAmount: 4000,
        gstRate: 18,
        cgstAmount: 360,
        sgstAmount: 360,
        igstAmount: 0,
        total: 4720
      }
    ],
    taxableSubtotal: 12500,
    cgstTotal: 1125,
    sgstTotal: 1125,
    igstTotal: 0,
    roundOff: 0,
    grandTotal: 14750,
    narration: 'Apex bill',
    status: 'verified',
    createdAt: new Date().toISOString()
  };

  const dummyB2csBill: BillData = {
    id: 'b-2',
    fileName: 'Cash_Receipt.png',
    imageUrl: '',
    voucherType: 'Purchase',
    invoiceNumber: 'CSH-104',
    invoiceDate: '2026-11-18',
    supplierName: 'Local Retailer',
    supplierGstin: '', // Unregistered B2C
    supplierState: 'Maharashtra',
    supplierStateCode: '27',
    partyLedgerName: 'Cash',
    purchaseLedgerName: 'Purchases Local',
    taxLedgerCgst: 'Input CGST',
    taxLedgerSgst: 'Input SGST',
    taxLedgerIgst: 'Input IGST',
    roundOffLedger: 'Round Off',
    lineItems: [
      {
        id: 'item-1',
        description: 'Office Cables',
        hsnCode: '8544',
        quantity: 1,
        unit: 'NOS',
        rate: 1000,
        taxableAmount: 1000,
        gstRate: 18,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        total: 1180
      }
    ],
    taxableSubtotal: 1000,
    cgstTotal: 90,
    sgstTotal: 90,
    igstTotal: 0,
    roundOff: 0,
    grandTotal: 1180,
    narration: 'Cash expense',
    status: 'verified',
    createdAt: new Date().toISOString()
  };

  it('normalizes dates into DD-MM-YYYY for GST Portal', () => {
    expect(formatGstPortalDate('2026-11-15')).toBe('15-11-2026');
    expect(formatGstPortalDate('15/11/2026')).toBe('15-11-2026');
    expect(formatGstPortalDate('15-11-2026')).toBe('15-11-2026');
  });

  it('validates bills and generates accurate GST analytical report', () => {
    const report = validateBillsForGst([dummyB2bBill, dummyB2csBill]);
    expect(report.totalInvoices).toBe(2);
    expect(report.b2bInvoicesCount).toBe(1);
    expect(report.b2csInvoicesCount).toBe(1);
    expect(report.validGstinCount).toBe(1);
    expect(report.totalTaxableValue).toBe(13500);
    expect(report.totalInvoiceValue).toBe(15930);
    expect(report.totalCgst).toBe(1215);
    expect(report.totalSgst).toBe(1215);
    expect(report.uniqueHsnCount).toBe(3); // 8471, 4802, 8544
  });

  it('generates compliant GSTR-1 JSON schema matching government specification', () => {
    const json = generateGstr1Json([dummyB2bBill, dummyB2csBill], {
      companyGstin: '27AABCS1429B1ZB',
      returnPeriod: '112026',
      grossTurnover: 500000
    });

    // Root fields
    expect(json.gstin).toBe('27AABCS1429B1ZB');
    expect(json.fp).toBe('112026');
    expect(json.gt).toBe(500000);

    // B2B Section
    expect(json.b2b.length).toBe(1);
    expect(json.b2b[0].ctin).toBe('27AAPFU0939F1ZV');
    expect(json.b2b[0].inv.length).toBe(1);

    const inv = json.b2b[0].inv[0];
    expect(inv.inum).toBe('INV-2026-8812');
    expect(inv.idt).toBe('15-11-2026');
    expect(inv.val).toBe(14750);
    expect(inv.pos).toBe('27');
    expect(inv.rchrg).toBe('N');
    expect(inv.inv_typ).toBe('R');
    expect(inv.itms.length).toBe(2);
    expect(inv.itms[0].itm_det.txval).toBe(8500);
    expect(inv.itms[0].itm_det.rt).toBe(18);
    expect(inv.itms[0].itm_det.camt).toBe(765);
    expect(inv.itms[0].itm_det.samt).toBe(765);

    // B2CS Section
    expect(json.b2cs.length).toBe(1);
    expect(json.b2cs[0].pos).toBe('27');
    expect(json.b2cs[0].txval).toBe(1000);
    expect(json.b2cs[0].camt).toBe(90);

    // HSN Section
    expect(json.hsn.data.length).toBe(3);
    const hsnCodes = json.hsn.data.map(h => h.hsn_sc);
    expect(hsnCodes).toContain('8471');
    expect(hsnCodes).toContain('4802');
    expect(hsnCodes).toContain('8544');

    // Document issue
    expect(json.doc_issue.doc_det.length).toBe(1);
    expect(json.doc_issue.doc_det[0].docs[0].totnum).toBe(2);
  });

  it('generates multi-sheet GST offline Excel workbook', () => {
    const wb = generateGstOfflineExcel([dummyB2bBill, dummyB2csBill], {
      companyGstin: '27AABCS1429B1ZB',
      returnPeriod: '112026'
    });

    expect(wb.SheetNames).toContain('b2b');
    expect(wb.SheetNames).toContain('b2cl');
    expect(wb.SheetNames).toContain('b2cs');
    expect(wb.SheetNames).toContain('hsn');
    expect(wb.SheetNames).toContain('docs');
  });
});
