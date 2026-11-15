import { describe, it, expect } from 'vitest';
import { parseInvoiceText, normalizeDate } from '../src/utils/billParser';
import { SAMPLE_BILLS } from '../src/utils/sampleBills';

describe('Invoice OCR Parser', () => {
  it('normalizes various date formats to YYYY-MM-DD', () => {
    expect(normalizeDate('15/11/2026')).toBe('2026-11-15');
    expect(normalizeDate('15-11-2026')).toBe('2026-11-15');
    expect(normalizeDate('15.11.2026')).toBe('2026-11-15');
    expect(normalizeDate('15-Nov-2026')).toBe('2026-11-15');
    expect(normalizeDate('2026-11-15')).toBe('2026-11-15');
  });

  it('correctly parses Apex Electronics Intra-State bill', () => {
    const sample = SAMPLE_BILLS[0];
    const parsed = parseInvoiceText(sample.sampleText, 'apex.png', { companyStateCode: '27' });

    expect(parsed.supplierGstin).toBe('27AAPFU0939F1ZV');
    expect(parsed.supplierName).toContain('Apex Electronics');
    expect(parsed.invoiceNumber).toBe('INV-2026-8812');
    expect(parsed.invoiceDate).toBe('2026-11-15');
    expect(parsed.grandTotal).toBe(14750.00);
    expect(parsed.cgstTotal).toBe(1125.00);
    expect(parsed.sgstTotal).toBe(1125.00);
    expect(parsed.igstTotal).toBe(0);
    expect(parsed.lineItems?.length).toBeGreaterThan(0);
  });

  it('correctly parses Global Tech Components Inter-State bill with IGST', () => {
    const sample = SAMPLE_BILLS[1];
    const parsed = parseInvoiceText(sample.sampleText, 'global_tech.png', { companyStateCode: '27' });

    expect(parsed.supplierGstin).toBe('29ABCDE1234F1Z5');
    expect(parsed.supplierStateCode).toBe('29');
    expect(parsed.invoiceNumber).toBe('GTC/26-27/0419');
    expect(parsed.grandTotal).toBe(59000.00);
    expect(parsed.igstTotal).toBe(9000.00);
    expect(parsed.cgstTotal).toBe(0);
    expect(parsed.sgstTotal).toBe(0);
  });
});
