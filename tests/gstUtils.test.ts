import { describe, it, expect } from 'vitest';
import {
  validateGSTIN,
  getStateFromGSTIN,
  isInterStateTransaction,
  calculateItemTaxes
} from '../src/utils/gstUtils';

describe('GST Utilities', () => {
  it('validates correct and incorrect GSTINs', () => {
    expect(validateGSTIN('27AAPFU0939F1ZV')).toBe(true);
    expect(validateGSTIN('29ABCDE1234F1Z5')).toBe(true);
    expect(validateGSTIN('INVALID_GSTIN')).toBe(false);
    expect(validateGSTIN('')).toBe(false);
  });

  it('extracts correct state name and code from GSTIN', () => {
    const mh = getStateFromGSTIN('27AAPFU0939F1ZV');
    expect(mh.stateCode).toBe('27');
    expect(mh.stateName).toBe('Maharashtra');

    const ka = getStateFromGSTIN('29ABCDE1234F1Z5');
    expect(ka.stateCode).toBe('29');
    expect(ka.stateName).toBe('Karnataka');

    const dl = getStateFromGSTIN('07AAAAA0000A1Z5');
    expect(dl.stateCode).toBe('07');
    expect(dl.stateName).toBe('Delhi');
  });

  it('determines inter-state vs intra-state transactions correctly', () => {
    // Both in Maharashtra (27) -> Intra-state
    expect(isInterStateTransaction('27', '27')).toBe(false);
    // Karnataka (29) to Maharashtra (27) -> Inter-state
    expect(isInterStateTransaction('29', '27')).toBe(true);
    // Delhi (07) to Maharashtra (27) -> Inter-state
    expect(isInterStateTransaction('07', '27')).toBe(true);
  });

  it('calculates intra-state taxes (CGST + SGST)', () => {
    const res = calculateItemTaxes(1000, 18, false);
    expect(res.cgst).toBe(90);
    expect(res.sgst).toBe(90);
    expect(res.igst).toBe(0);
    expect(res.total).toBe(1180);
  });

  it('calculates inter-state taxes (IGST)', () => {
    const res = calculateItemTaxes(1000, 18, true);
    expect(res.cgst).toBe(0);
    expect(res.sgst).toBe(0);
    expect(res.igst).toBe(180);
    expect(res.total).toBe(1180);
  });
});
