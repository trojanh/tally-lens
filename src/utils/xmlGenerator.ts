import { BillData, TallyConfig } from '../types';

/**
 * Converts a Date string (YYYY-MM-DD or DD-MM-YYYY) to Tally's internal format: YYYYMMDD
 */
export function formatTallyDate(dateStr: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
  const clean = dateStr.replace(/[\/\-\.]/g, '');
  if (clean.length === 8) {
    // If it's already YYYYMMDD
    if (parseInt(clean.substring(0, 4), 10) > 1900) {
      return clean;
    }
    // If it's DDMMYYYY
    const day = clean.substring(0, 2);
    const month = clean.substring(2, 4);
    const year = clean.substring(4, 8);
    return `${year}${month}${day}`;
  }
  // Fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
  return clean;
}

/**
 * Escapes special XML characters
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds the inner <VOUCHER> XML block for a BillData object
 */
export function buildVoucherXml(bill: BillData): string {
  const tallyDate = formatTallyDate(bill.invoiceDate);
  const vchNumber = escapeXml(bill.invoiceNumber);
  const partyName = escapeXml(bill.partyLedgerName || bill.supplierName || 'Cash Supplier');
  const purchaseLedger = escapeXml(bill.purchaseLedgerName || 'Purchases Local');
  const narration = escapeXml(bill.narration || `Purchase from ${bill.supplierName}`);

  // Tally convention:
  // Credit: Party ledger is credited with Grand Total (Positive amount)
  // Debit: Purchase ledger is debited with Taxable Subtotal (Negative amount)
  // Debit: Tax ledgers are debited with tax amounts (Negative amounts)
  // Debit/Credit: Round off
  const grandTotal = Number(bill.grandTotal).toFixed(2);
  const taxableSubtotal = Number(bill.taxableSubtotal).toFixed(2);
  const cgst = Number(bill.cgstTotal || 0).toFixed(2);
  const sgst = Number(bill.sgstTotal || 0).toFixed(2);
  const igst = Number(bill.igstTotal || 0).toFixed(2);
  const roundOff = Number(bill.roundOff || 0).toFixed(2);

  let ledgersXml = `
            <!-- Credit Party Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${grandTotal}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${vchNumber}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>${grandTotal}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>

            <!-- Debit Purchase Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${purchaseLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${taxableSubtotal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;

  // Add CGST Ledger if > 0
  if (parseFloat(cgst) > 0) {
    const cgstLedger = escapeXml(bill.taxLedgerCgst || 'Input CGST');
    ledgersXml += `
            <!-- Debit CGST Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${cgstLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${cgst}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  }

  // Add SGST Ledger if > 0
  if (parseFloat(sgst) > 0) {
    const sgstLedger = escapeXml(bill.taxLedgerSgst || 'Input SGST');
    ledgersXml += `
            <!-- Debit SGST Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${sgstLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${sgst}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  }

  // Add IGST Ledger if > 0
  if (parseFloat(igst) > 0) {
    const igstLedger = escapeXml(bill.taxLedgerIgst || 'Input IGST');
    ledgersXml += `
            <!-- Debit IGST Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${igstLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${igst}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  }

  // Add Round Off if non-zero
  const rOffVal = parseFloat(roundOff);
  if (rOffVal !== 0) {
    const roundOffLedger = escapeXml(bill.roundOffLedger || 'Round Off');
    // If roundoff is positive (e.g. +0.40 added to round up to total), deemed positive is Yes and amount is -0.40
    // If roundoff is negative (e.g. -0.30 to round down), deemed positive is No and amount is +0.30
    const isDeemedPos = rOffVal > 0 ? 'Yes' : 'No';
    const rOffAmount = rOffVal > 0 ? `-${rOffVal.toFixed(2)}` : Math.abs(rOffVal).toFixed(2);
    ledgersXml += `
            <!-- Round Off Ledger -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${roundOffLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isDeemedPos}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>${rOffAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  }

  return `
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${tallyDate}</DATE>
            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <REFERENCE>${vchNumber}</REFERENCE>
            <REFERENCEDATE>${tallyDate}</REFERENCEDATE>
            <VOUCHERNUMBER>${vchNumber}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <PARTYNAME>${partyName}</PARTYNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <BASICBUYERNAME>${partyName}</BASICBUYERNAME>
            <PARTYGSTIN>${escapeXml(bill.supplierGstin || '')}</PARTYGSTIN>
            <STATENAME>${escapeXml(bill.supplierState || '')}</STATENAME>
            <NARRATION>${narration}</NARRATION>
            ${ledgersXml}
          </VOUCHER>`;
}

/**
 * Builds the full Envelope XML for single or multiple bills, ready to be POSTed
 * directly to Tally or saved as an XML file.
 */
export function generateTallyEnvelopeXml(
  bills: BillData[],
  companyName?: string
): string {
  const companyBlock = companyName
    ? `
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>`
    : '';

  const messagesXml = bills
    .map(b => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${buildVoucherXml(b)}
        </TALLYMESSAGE>`)
    .join('\n');

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>${companyBlock}
      </REQUESTDESC>
      <REQUESTDATA>${messagesXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML payload to create a new Sundry Creditor Ledger in Tally
 */
export function generateCreateLedgerXml(
  ledgerName: string,
  gstin: string = '',
  state: string = '',
  companyName?: string
): string {
  const companyBlock = companyName
    ? `
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>`
    : '';

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>${companyBlock}
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(ledgerName)}" ACTION="Create">
            <NAME>${escapeXml(ledgerName)}</NAME>
            <PARENT>Sundry Creditors</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <PARTYGSTIN>${escapeXml(gstin)}</PARTYGSTIN>
            <LEDSTATENAME>${escapeXml(state)}</LEDSTATENAME>
            <COUNTRYNAME>India</COUNTRYNAME>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML payload to query Tally for list of Ledgers
 */
export function generateExportLedgersXml(companyName?: string): string {
  const companyBlock = companyName
    ? `
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>`
    : '';

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Ledgers</REPORTNAME>${companyBlock}
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML payload to test connection and list open companies
 */
export function generatePingCompanyXml(): string {
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Companies</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML payload to query Tally for transactions / vouchers (e.g. Sales or Purchase vouchers)
 */
export function generateExportVouchersXml(
  fromDate: string,
  toDate: string,
  voucherType: string = 'Sales',
  companyName?: string
): string {
  const companyBlock = companyName
    ? `
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>`
    : '';

  const fDate = formatTallyDate(fromDate);
  const tDate = formatTallyDate(toDate);

  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVFROMDATE>${fDate}</SVFROMDATE>
          <SVTODATE>${tDate}</SVTODATE>
          <VCHTYPE>${escapeXml(voucherType)}</VCHTYPE>${companyBlock}
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}
