import * as XLSX from 'xlsx';
import { BillData } from '../types';

/**
 * Exports single or multiple bills into an Excel workbook compatible with TallyPrime Excel Import.
 */
export function exportBillsToExcel(bills: BillData[], filename: string = 'Tally_Purchase_Bills.xlsx') {
  const rows = bills.map((bill, index) => {
    return {
      'S.No': index + 1,
      'Voucher Type': bill.voucherType || 'Purchase',
      'Voucher Date': bill.invoiceDate,
      'Voucher No': bill.invoiceNumber,
      'Supplier Invoice No': bill.invoiceNumber,
      'Supplier Invoice Date': bill.invoiceDate,
      'Party Name (Sundry Creditors)': bill.partyLedgerName || bill.supplierName,
      'Party GSTIN': bill.supplierGstin || '',
      'State': bill.supplierState || '',
      'Purchase Ledger': bill.purchaseLedgerName || 'Purchases Local',
      'Taxable Amount': Number(bill.taxableSubtotal.toFixed(2)),
      'CGST Ledger': bill.cgstTotal > 0 ? (bill.taxLedgerCgst || 'Input CGST') : '',
      'CGST Amount': Number((bill.cgstTotal || 0).toFixed(2)),
      'SGST Ledger': bill.sgstTotal > 0 ? (bill.taxLedgerSgst || 'Input SGST') : '',
      'SGST Amount': Number((bill.sgstTotal || 0).toFixed(2)),
      'IGST Ledger': bill.igstTotal > 0 ? (bill.taxLedgerIgst || 'Input IGST') : '',
      'IGST Amount': Number((bill.igstTotal || 0).toFixed(2)),
      'Round Off Ledger': bill.roundOff !== 0 ? (bill.roundOffLedger || 'Round Off') : '',
      'Round Off Amount': Number((bill.roundOff || 0).toFixed(2)),
      'Total Amount': Number(bill.grandTotal.toFixed(2)),
      'Narration': bill.narration || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for better visual readability
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 14 }, // Voucher Type
    { wch: 14 }, // Voucher Date
    { wch: 16 }, // Voucher No
    { wch: 20 }, // Supplier Invoice No
    { wch: 18 }, // Supplier Invoice Date
    { wch: 28 }, // Party Name
    { wch: 18 }, // GSTIN
    { wch: 16 }, // State
    { wch: 22 }, // Purchase Ledger
    { wch: 14 }, // Taxable Amount
    { wch: 16 }, // CGST Ledger
    { wch: 12 }, // CGST Amount
    { wch: 16 }, // SGST Ledger
    { wch: 12 }, // SGST Amount
    { wch: 16 }, // IGST Ledger
    { wch: 12 }, // IGST Amount
    { wch: 16 }, // Round Off Ledger
    { wch: 14 }, // Round Off Amount
    { wch: 14 }, // Total Amount
    { wch: 40 }  // Narration
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase_Vouchers');

  // Trigger browser/electron file download
  XLSX.writeFile(workbook, filename);
}
