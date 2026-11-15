import { describe, it, expect } from 'vitest';
import {
  formatTallyDate,
  buildVoucherXml,
  generateTallyEnvelopeXml,
  generateCreateLedgerXml
} from '../src/utils/xmlGenerator';
import { BillData } from '../src/types';

describe('Tally XML Generator', () => {
  const dummyBill: BillData = {
    id: 'test-1',
    fileName: 'invoice.png',
    imageUrl: '',
    voucherType: 'Purchase',
    invoiceNumber: 'INV-9901',
    invoiceDate: '2026-11-15',
    supplierName: 'Reliable Components Pvt Ltd',
    supplierGstin: '27AAPFU0939F1ZV',
    supplierState: 'Maharashtra',
    supplierStateCode: '27',
    partyLedgerName: 'Reliable Components Pvt Ltd',
    purchaseLedgerName: 'Purchases Local',
    taxLedgerCgst: 'Input CGST',
    taxLedgerSgst: 'Input SGST',
    taxLedgerIgst: 'Input IGST',
    roundOffLedger: 'Round Off',
    lineItems: [
      {
        id: '1',
        description: 'Test Item',
        hsnCode: '8471',
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
    narration: 'Purchase test',
    status: 'verified',
    createdAt: new Date().toISOString()
  };

  it('formats dates into Tally YYYYMMDD format', () => {
    expect(formatTallyDate('2026-11-15')).toBe('20261115');
    expect(formatTallyDate('15/11/2026')).toBe('20261115');
  });

  it('builds voucher XML with correct credit and debit ledger allocations', () => {
    const voucherXml = buildVoucherXml(dummyBill);
    expect(voucherXml).toContain('<VOUCHER VCHTYPE="Purchase" ACTION="Create"');
    expect(voucherXml).toContain('<VOUCHERNUMBER>INV-9901</VOUCHERNUMBER>');
    expect(voucherXml).toContain('<DATE>20261115</DATE>');
    // Credit Party Ledger (positive in Tally XML)
    expect(voucherXml).toContain('<LEDGERNAME>Reliable Components Pvt Ltd</LEDGERNAME>');
    expect(voucherXml).toContain('<AMOUNT>1180.00</AMOUNT>');
    // Debit Purchase Ledger (negative in Tally XML)
    expect(voucherXml).toContain('<LEDGERNAME>Purchases Local</LEDGERNAME>');
    expect(voucherXml).toContain('<AMOUNT>-1000.00</AMOUNT>');
    // Debit Taxes
    expect(voucherXml).toContain('<LEDGERNAME>Input CGST</LEDGERNAME>');
    expect(voucherXml).toContain('<AMOUNT>-90.00</AMOUNT>');
    expect(voucherXml).toContain('<LEDGERNAME>Input SGST</LEDGERNAME>');
    expect(voucherXml).toContain('<AMOUNT>-90.00</AMOUNT>');
  });

  it('generates full envelope with company variables', () => {
    const envelope = generateTallyEnvelopeXml([dummyBill], 'My Test Company');
    expect(envelope).toContain('<ENVELOPE>');
    expect(envelope).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    expect(envelope).toContain('<SVCURRENTCOMPANY>My Test Company</SVCURRENTCOMPANY>');
    expect(envelope).toContain('<REPORTNAME>Vouchers</REPORTNAME>');
    expect(envelope).toContain('INV-9901');
  });

  it('generates ledger creation XML under Sundry Creditors', () => {
    const ledgerXml = generateCreateLedgerXml('Apex Electronics', '27AAPFU0939F1ZV', 'Maharashtra');
    expect(ledgerXml).toContain('<PARENT>Sundry Creditors</PARENT>');
    expect(ledgerXml).toContain('<PARTYGSTIN>27AAPFU0939F1ZV</PARTYGSTIN>');
    expect(ledgerXml).toContain('<NAME>Apex Electronics</NAME>');
  });
});
