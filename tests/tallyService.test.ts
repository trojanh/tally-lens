import { describe, it, expect } from 'vitest';
import { TallyService } from '../src/services/tallyService';
import { BillData, TallyConfig } from '../src/types';

describe('Tally Service', () => {
  const config: TallyConfig = {
    host: '127.0.0.1',
    port: 9000,
    companyName: 'Test Company Ltd',
    companyStateCode: '27',
    defaultPurchaseLedger: 'Purchases Local',
    defaultCgstLedger: 'Input CGST',
    defaultSgstLedger: 'Input SGST',
    defaultIgstLedger: 'Input IGST',
    defaultRoundOffLedger: 'Round Off',
    isMockMode: true,
  };

  const dummyBill: BillData = {
    id: 'b-1',
    fileName: 'test.jpg',
    imageUrl: '',
    voucherType: 'Purchase',
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-11-15',
    supplierName: 'ABC Traders',
    supplierGstin: '27AAPFU0939F1ZV',
    supplierState: 'Maharashtra',
    supplierStateCode: '27',
    partyLedgerName: 'ABC Traders',
    purchaseLedgerName: 'Purchases Local',
    taxLedgerCgst: 'Input CGST',
    taxLedgerSgst: 'Input SGST',
    taxLedgerIgst: 'Input IGST',
    roundOffLedger: 'Round Off',
    lineItems: [],
    taxableSubtotal: 1000,
    cgstTotal: 90,
    sgstTotal: 90,
    igstTotal: 0,
    roundOff: 0,
    grandTotal: 1180,
    narration: 'Test Bill',
    status: 'verified',
    createdAt: new Date().toISOString(),
  };

  it('tests connection in mock mode', async () => {
    const service = new TallyService(config);
    const conn = await service.testConnection();
    expect(conn.connected).toBe(true);
    expect(conn.companyName).toBe('Test Company Ltd');
  });

  it('fetches default ledgers in mock mode', async () => {
    const service = new TallyService(config);
    const ledgers = await service.fetchLedgers();
    expect(ledgers.length).toBeGreaterThan(0);
    expect(ledgers.some(l => l.name === 'Purchases Local')).toBe(true);
    expect(ledgers.some(l => l.name === 'Input CGST')).toBe(true);
  });

  it('pushes single voucher successfully in mock mode', async () => {
    const service = new TallyService(config);
    const result = await service.pushVoucher(dummyBill);
    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(1);
    expect(result.voucherNumber).toContain('INV-001');
  });

  it('pushes batch vouchers successfully in mock mode', async () => {
    const service = new TallyService(config);
    const result = await service.pushBatchVouchers([dummyBill, { ...dummyBill, id: 'b-2', invoiceNumber: 'INV-002' }]);
    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(2);
  });

  it('parses Tally real XML success response correctly', () => {
    const service = new TallyService(config);
    const mockTallySuccessXml = `<RESPONSE>
      <CREATED>1</CREATED>
      <ALTERED>0</ALTERED>
      <DELETED>0</DELETED>
      <ERRORS>0</ERRORS>
    </RESPONSE>`;

    // Access private method through typecast
    const parsed = (service as any).parseTallyResponse(mockTallySuccessXml, 'Post Voucher');
    expect(parsed.success).toBe(true);
    expect(parsed.createdCount).toBe(1);
  });

  it('parses Tally real XML line error response correctly', () => {
    const service = new TallyService(config);
    const mockTallyErrorXml = `<RESPONSE>
      <CREATED>0</CREATED>
      <ERRORS>1</ERRORS>
      <LINEERROR>Ledger 'XYZ Supplies' does not exist!</LINEERROR>
    </RESPONSE>`;

    const parsed = (service as any).parseTallyResponse(mockTallyErrorXml, 'Post Voucher');
    expect(parsed.success).toBe(false);
    expect(parsed.message).toContain("Ledger 'XYZ Supplies' does not exist!");
    expect(parsed.errors).toContain("Ledger 'XYZ Supplies' does not exist!");
  });
});
