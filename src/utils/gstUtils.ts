export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory'
};

export const GSTIN_REGEX = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z|z][0-9A-Z]{1}/;

export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toUpperCase();
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);
}

export function getStateFromGSTIN(gstin: string): { stateCode: string; stateName: string } {
  if (!gstin || gstin.length < 2) return { stateCode: '', stateName: '' };
  const code = gstin.substring(0, 2);
  return {
    stateCode: code,
    stateName: GST_STATE_CODES[code] || 'Unknown State'
  };
}

export function isInterStateTransaction(supplierStateCode: string, companyStateCode: string): boolean {
  if (!supplierStateCode || !companyStateCode) return false;
  return supplierStateCode.trim() !== companyStateCode.trim();
}

export function calculateItemTaxes(
  taxableAmount: number,
  gstRate: number,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number; total: number } {
  const taxable = Number(taxableAmount) || 0;
  const rate = Number(gstRate) || 0;
  
  if (isInterState) {
    const igst = Number(((taxable * rate) / 100).toFixed(2));
    return {
      cgst: 0,
      sgst: 0,
      igst,
      total: Number((taxable + igst).toFixed(2))
    };
  } else {
    const halfRate = rate / 2;
    const cgst = Number(((taxable * halfRate) / 100).toFixed(2));
    const sgst = Number(((taxable * halfRate) / 100).toFixed(2));
    return {
      cgst,
      sgst,
      igst: 0,
      total: Number((taxable + cgst + sgst).toFixed(2))
    };
  }
}
