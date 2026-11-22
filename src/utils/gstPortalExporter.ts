import * as XLSX from 'xlsx';
import {
  BillData,
  GSTR1Payload,
  GSTR1B2BCounterparty,
  GSTR1B2CSItem,
  GSTR1HSNItem,
  GSTR1Invoice,
  GSTValidationReport
} from '../types';
import { validateGSTIN, getStateFromGSTIN } from './gstUtils';

/**
 * Normalizes date to the GST Portal format: DD-MM-YYYY
 */
export function formatGstPortalDate(dateStr: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }

  const clean = dateStr.trim();
  // If YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) {
    return `${String(ymd[3]).padStart(2, '0')}-${String(ymd[2]).padStart(2, '0')}-${ymd[1]}`;
  }

  // If DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    return `${String(dmy[1]).padStart(2, '0')}-${String(dmy[2]).padStart(2, '0')}-${year}`;
  }

  return clean;
}

/**
 * Validates bills and generates an analytical health report for GST filing
 */
export function validateBillsForGst(bills: BillData[]): GSTValidationReport {
  let b2bCount = 0;
  let b2csCount = 0;
  let validGstinCount = 0;
  const invalidGstins: string[] = [];
  const uniqueHsns = new Set<string>();

  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalInvoiceValue = 0;

  for (const bill of bills) {
    const gstin = bill.supplierGstin ? bill.supplierGstin.trim().toUpperCase() : '';
    const hasValidGstin = validateGSTIN(gstin);

    if (hasValidGstin) {
      b2bCount++;
      validGstinCount++;
    } else {
      b2csCount++;
      if (gstin && !hasValidGstin) {
        invalidGstins.push(`${bill.supplierName} (${gstin}) - Inv: ${bill.invoiceNumber}`);
      }
    }

    totalTaxableValue += Number(bill.taxableSubtotal) || 0;
    totalCgst += Number(bill.cgstTotal) || 0;
    totalSgst += Number(bill.sgstTotal) || 0;
    totalIgst += Number(bill.igstTotal) || 0;
    totalInvoiceValue += Number(bill.grandTotal) || 0;

    for (const item of bill.lineItems) {
      if (item.hsnCode && item.hsnCode.trim()) {
        uniqueHsns.add(item.hsnCode.trim());
      }
    }
  }

  return {
    totalInvoices: bills.length,
    b2bInvoicesCount: b2bCount,
    b2csInvoicesCount: b2csCount,
    validGstinCount,
    invalidGstinCount: invalidGstins.length,
    invalidGstins,
    totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    totalIgst: Number(totalIgst.toFixed(2)),
    totalInvoiceValue: Number(totalInvoiceValue.toFixed(2)),
    uniqueHsnCount: uniqueHsns.size
  };
}

/**
 * Generates an official GSTR-1 JSON schema payload compatible with GST Portal offline upload.
 */
export function generateGstr1Json(
  bills: BillData[],
  options: {
    companyGstin: string;
    returnPeriod: string; // e.g. "112026" (MMYYYY)
    grossTurnover?: number;
    currentTurnover?: number;
  }
): GSTR1Payload {
  const gstin = options.companyGstin || '27AABCS1429B1ZB';
  const fp = options.returnPeriod || '112026';
  const myStateCode = gstin.substring(0, 2) || '27';

  // 1. Group B2B invoices by Counterparty GSTIN (ctin)
  const b2bMap = new Map<string, GSTR1Invoice[]>();
  const b2csMap = new Map<string, GSTR1B2CSItem>();
  const hsnMap = new Map<string, GSTR1HSNItem>();
  const invoiceNumbers: string[] = [];

  for (const bill of bills) {
    const rawGstin = bill.supplierGstin ? bill.supplierGstin.trim().toUpperCase() : '';
    const isValid = validateGSTIN(rawGstin);
    const pos = bill.supplierStateCode || (rawGstin ? getStateFromGSTIN(rawGstin).stateCode : myStateCode) || myStateCode;
    const invDate = formatGstPortalDate(bill.invoiceDate);
    const invNumber = bill.invoiceNumber || `INV-${Date.now()}`;
    invoiceNumbers.push(invNumber);

    // Build items detail for this invoice
    // If lineItems are empty, create synthetic item from bill totals
    const lineItems = bill.lineItems.length > 0 ? bill.lineItems : [
      {
        id: '1',
        description: 'Goods / Services',
        hsnCode: '9983',
        quantity: 1,
        unit: 'NOS',
        rate: bill.taxableSubtotal,
        taxableAmount: bill.taxableSubtotal,
        gstRate: bill.igstTotal > 0 ? 18 : 18,
        cgstAmount: bill.cgstTotal,
        sgstAmount: bill.sgstTotal,
        igstAmount: bill.igstTotal,
        total: bill.grandTotal
      }
    ];

    if (isValid) {
      // B2B Invoice
      const gstr1Invoice: GSTR1Invoice = {
        inum: invNumber,
        idt: invDate,
        val: Number(Number(bill.grandTotal).toFixed(2)),
        pos,
        rchrg: 'N',
        inv_typ: 'R',
        itms: lineItems.map((item, idx) => ({
          num: idx + 1,
          itm_det: {
            txval: Number(Number(item.taxableAmount).toFixed(2)),
            rt: Number(item.gstRate) || 18,
            iamt: Number(Number(item.igstAmount || 0).toFixed(2)),
            camt: Number(Number(item.cgstAmount || 0).toFixed(2)),
            samt: Number(Number(item.sgstAmount || 0).toFixed(2)),
            csamt: 0.0
          }
        }))
      };

      if (!b2bMap.has(rawGstin)) {
        b2bMap.set(rawGstin, []);
      }
      b2bMap.get(rawGstin)!.push(gstr1Invoice);
    } else {
      // B2CS (B2C Small / Unregistered)
      const isInter = pos !== myStateCode;
      const splyTy = isInter ? 'INTER' : 'INTRA';

      for (const item of lineItems) {
        const rate = Number(item.gstRate) || 18;
        const key = `${splyTy}_${pos}_${rate}`;

        if (!b2csMap.has(key)) {
          b2csMap.set(key, {
            sply_ty: splyTy,
            pos,
            typ: 'OE',
            rt: rate,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
          });
        }

        const entry = b2csMap.get(key)!;
        entry.txval = Number((entry.txval + item.taxableAmount).toFixed(2));
        entry.iamt = Number((entry.iamt + (item.igstAmount || 0)).toFixed(2));
        entry.camt = Number((entry.camt + (item.cgstAmount || 0)).toFixed(2));
        entry.samt = Number((entry.samt + (item.sgstAmount || 0)).toFixed(2));
      }
    }

    // 2. Aggregate HSN items
    for (const item of lineItems) {
      const hsnCode = item.hsnCode && item.hsnCode.trim() ? item.hsnCode.trim() : '9983';
      const uqc = item.unit ? item.unit.toUpperCase() : 'NOS';
      const key = `${hsnCode}_${uqc}`;

      if (!hsnMap.has(key)) {
        hsnMap.set(key, {
          num: hsnMap.size + 1,
          hsn_sc: hsnCode,
          desc: item.description || 'Goods/Services',
          uqc,
          qty: 0,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0
        });
      }

      const hsnEntry = hsnMap.get(key)!;
      hsnEntry.qty = Number((hsnEntry.qty + (Number(item.quantity) || 1)).toFixed(2));
      hsnEntry.val = Number((hsnEntry.val + (Number(item.total) || 0)).toFixed(2));
      hsnEntry.txval = Number((hsnEntry.txval + (Number(item.taxableAmount) || 0)).toFixed(2));
      hsnEntry.iamt = Number((hsnEntry.iamt + (Number(item.igstAmount) || 0)).toFixed(2));
      hsnEntry.camt = Number((hsnEntry.camt + (Number(item.cgstAmount) || 0)).toFixed(2));
      hsnEntry.samt = Number((hsnEntry.samt + (Number(item.sgstAmount) || 0)).toFixed(2));
    }
  }

  // Format B2B array
  const b2b: GSTR1B2BCounterparty[] = [];
  b2bMap.forEach((invs, ctin) => {
    b2b.push({
      ctin,
      inv: invs
    });
  });

  // Format B2CS array
  const b2cs: GSTR1B2CSItem[] = Array.from(b2csMap.values());

  // Format HSN array
  const hsnData: GSTR1HSNItem[] = Array.from(hsnMap.values()).map((h, i) => ({
    ...h,
    num: i + 1
  }));

  // Format Document Issue Details
  const sortedInvs = invoiceNumbers.filter(n => Boolean(n)).sort();
  const docIssue = {
    doc_det: [
      {
        doc_num: 1,
        doc_typ: 'Invoices for outward supply',
        docs: [
          {
            num: 1,
            from: sortedInvs[0] || 'INV-001',
            to: sortedInvs[sortedInvs.length - 1] || 'INV-001',
            totnum: bills.length,
            canc: 0,
            net_issue: bills.length
          }
        ]
      }
    ]
  };

  return {
    gstin,
    fp,
    gt: options.grossTurnover || 0.0,
    cur_gt: options.currentTurnover || 0.0,
    b2b,
    b2cs,
    hsn: {
      data: hsnData
    },
    doc_issue: docIssue
  };
}

/**
 * Generates an Excel workbook structured exactly like the Government GST Offline Tool
 * with sheets: b2b, b2cl, b2cs, hsn, docs.
 */
export function generateGstOfflineExcel(
  bills: BillData[],
  options: {
    companyGstin: string;
    returnPeriod: string;
  }
): XLSX.WorkBook {
  const myStateCode = options.companyGstin ? options.companyGstin.substring(0, 2) : '27';

  // 1. Sheet b2b
  const b2bRows: any[] = [];
  // 2. Sheet b2cs
  const b2csRows: any[] = [];
  // 3. Sheet hsn
  const hsnRowsMap = new Map<string, any>();
  const invNumbers: string[] = [];

  for (const bill of bills) {
    const rawGstin = bill.supplierGstin ? bill.supplierGstin.trim().toUpperCase() : '';
    const isValid = validateGSTIN(rawGstin);
    const pos = bill.supplierStateCode || (rawGstin ? getStateFromGSTIN(rawGstin).stateCode : myStateCode) || myStateCode;
    const invDate = formatGstPortalDate(bill.invoiceDate);
    const invNo = bill.invoiceNumber || 'INV-001';
    invNumbers.push(invNo);

    const lineItems = bill.lineItems.length > 0 ? bill.lineItems : [
      {
        id: '1',
        description: 'Goods / Supplies',
        hsnCode: '9983',
        quantity: 1,
        unit: 'NOS',
        rate: bill.taxableSubtotal,
        taxableAmount: bill.taxableSubtotal,
        gstRate: 18,
        cgstAmount: bill.cgstTotal,
        sgstAmount: bill.sgstTotal,
        igstAmount: bill.igstTotal,
        total: bill.grandTotal
      }
    ];

    if (isValid) {
      for (const item of lineItems) {
        b2bRows.push({
          'GSTIN/UIN of Recipient': rawGstin,
          'Receiver Name': bill.supplierName,
          'Invoice Number': invNo,
          'Invoice date': invDate,
          'Invoice Value': Number(bill.grandTotal.toFixed(2)),
          'Place Of Supply': `${pos}-${bill.supplierState || 'State'}`,
          'Reverse Charge': 'N',
          'Applicable % of Tax Rate': '',
          'Invoice Type': 'Regular',
          'E-Commerce GSTIN': '',
          'Rate': Number(item.gstRate) || 18,
          'Taxable Value': Number(item.taxableAmount.toFixed(2)),
          'Cess Amount': 0.0
        });
      }
    } else {
      const isInter = pos !== myStateCode;
      for (const item of lineItems) {
        b2csRows.push({
          'Type': 'OE',
          'Place Of Supply': `${pos}-${bill.supplierState || 'State'}`,
          'Applicable % of Tax Rate': '',
          'Rate': Number(item.gstRate) || 18,
          'Taxable Value': Number(item.taxableAmount.toFixed(2)),
          'Cess Amount': 0.0,
          'E-Commerce GSTIN': ''
        });
      }
    }

    // HSN aggregation
    for (const item of lineItems) {
      const hsn = item.hsnCode ? item.hsnCode.trim() : '9983';
      const uqc = item.unit ? item.unit.toUpperCase() : 'NOS';
      const key = `${hsn}_${uqc}`;

      if (!hsnRowsMap.has(key)) {
        hsnRowsMap.set(key, {
          'HSN': hsn,
          'Description': item.description || 'Supplies',
          'UQC': uqc,
          'Total Quantity': 0,
          'Total Value': 0,
          'Taxable Value': 0,
          'Integrated Tax Amount': 0,
          'Central Tax Amount': 0,
          'State/UT Tax Amount': 0,
          'Cess Amount': 0
        });
      }

      const row = hsnRowsMap.get(key)!;
      row['Total Quantity'] = Number((row['Total Quantity'] + (Number(item.quantity) || 1)).toFixed(2));
      row['Total Value'] = Number((row['Total Value'] + (Number(item.total) || 0)).toFixed(2));
      row['Taxable Value'] = Number((row['Taxable Value'] + (Number(item.taxableAmount) || 0)).toFixed(2));
      row['Integrated Tax Amount'] = Number((row['Integrated Tax Amount'] + (Number(item.igstAmount) || 0)).toFixed(2));
      row['Central Tax Amount'] = Number((row['Central Tax Amount'] + (Number(item.cgstAmount) || 0)).toFixed(2));
      row['State/UT Tax Amount'] = Number((row['State/UT Tax Amount'] + (Number(item.sgstAmount) || 0)).toFixed(2));
    }
  }

  // 4. Docs sheet
  const sortedInvs = invNumbers.filter(Boolean).sort();
  const docsRows = [
    {
      'Nature of Document': 'Invoices for outward supply',
      'Sr. No. From': sortedInvs[0] || 'INV-001',
      'Sr. No. To': sortedInvs[sortedInvs.length - 1] || 'INV-001',
      'Total Number': bills.length,
      'Cancelled': 0,
      'Net Issued': bills.length
    }
  ];

  const workbook = XLSX.utils.book_new();

  // Add sheets
  const b2bSheet = XLSX.utils.json_to_sheet(b2bRows.length > 0 ? b2bRows : [{}]);
  XLSX.utils.book_append_sheet(workbook, b2bSheet, 'b2b');

  const b2clSheet = XLSX.utils.json_to_sheet([{}]);
  XLSX.utils.book_append_sheet(workbook, b2clSheet, 'b2cl');

  const b2csSheet = XLSX.utils.json_to_sheet(b2csRows.length > 0 ? b2csRows : [{}]);
  XLSX.utils.book_append_sheet(workbook, b2csSheet, 'b2cs');

  const hsnSheet = XLSX.utils.json_to_sheet(Array.from(hsnRowsMap.values()));
  XLSX.utils.book_append_sheet(workbook, hsnSheet, 'hsn');

  const docsSheet = XLSX.utils.json_to_sheet(docsRows);
  XLSX.utils.book_append_sheet(workbook, docsSheet, 'docs');

  return workbook;
}

/**
 * Triggers download of the GSTR-1 JSON file for direct upload to gst.gov.in
 */
export function downloadGstr1JsonFile(
  bills: BillData[],
  options: {
    companyGstin: string;
    returnPeriod: string;
    grossTurnover?: number;
    currentTurnover?: number;
  },
  filename?: string
) {
  const payload = generateGstr1Json(bills, options);
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `GSTR1_${options.companyGstin || 'Returns'}_${options.returnPeriod || 'Period'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Triggers download of the multi-sheet GST Offline Excel template
 */
export function downloadGstOfflineExcelFile(
  bills: BillData[],
  options: {
    companyGstin: string;
    returnPeriod: string;
  },
  filename?: string
) {
  const wb = generateGstOfflineExcel(bills, options);
  const fname = filename || `GST_Offline_Utility_${options.companyGstin || 'Returns'}_${options.returnPeriod || 'Period'}.xlsx`;
  XLSX.writeFile(wb, fname);
}
