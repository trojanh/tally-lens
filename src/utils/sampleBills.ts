export interface SampleBillTemplate {
  id: string;
  name: string;
  type: string;
  vendor: string;
  gstin: string;
  invoiceNo: string;
  date: string;
  total: number;
  sampleText: string;
  svgDataUrl: string;
}

export function generateSampleInvoiceSvg(
  vendor: string,
  address: string,
  gstin: string,
  state: string,
  invNo: string,
  date: string,
  buyer: string,
  buyerGstin: string,
  items: Array<{ desc: string; hsn: string; qty: number; rate: number; amt: number }>,
  subtotal: number,
  cgst: number,
  sgst: number,
  igst: number,
  roundOff: number,
  total: number
): string {
  const itemRows = items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 8px 6px;">${idx + 1}</td>
      <td style="padding: 8px 6px; font-weight: 500;">${item.desc}</td>
      <td style="padding: 8px 6px;">${item.hsn}</td>
      <td style="padding: 8px 6px; text-align: center;">${item.qty} NOS</td>
      <td style="padding: 8px 6px; text-align: right;">${item.rate.toFixed(2)}</td>
      <td style="padding: 8px 6px; text-align: right; font-weight: 600;">${item.amt.toFixed(2)}</td>
    </tr>
  `).join('');

  const taxRows = igst > 0 ? `
    <tr>
      <td colspan="5" style="text-align: right; padding: 6px; color: #475569;">Integrated GST (IGST @ 18%):</td>
      <td style="text-align: right; padding: 6px; font-weight: 600;">₹${igst.toFixed(2)}</td>
    </tr>
  ` : `
    <tr>
      <td colspan="5" style="text-align: right; padding: 6px; color: #475569;">Central GST (CGST @ 9%):</td>
      <td style="text-align: right; padding: 6px; font-weight: 600;">₹${cgst.toFixed(2)}</td>
    </tr>
    <tr>
      <td colspan="5" style="text-align: right; padding: 6px; color: #475569;">State GST (SGST @ 9%):</td>
      <td style="text-align: right; padding: 6px; font-weight: 600;">₹${sgst.toFixed(2)}</td>
    </tr>
  `;

  const roundOffRow = roundOff !== 0 ? `
    <tr>
      <td colspan="5" style="text-align: right; padding: 6px; color: #475569;">Round Off:</td>
      <td style="text-align: right; padding: 6px; font-weight: 600;">${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
    </tr>
  ` : '';

  const html = `
  <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; background: #ffffff; color: #1e293b; padding: 30px; width: 740px; box-sizing: border-box; border: 1px solid #cbd5e1;">
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">TAX INVOICE</h1>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; text-transform: uppercase;">(Original For Recipient)</p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div style="width: 58%;">
        <h2 style="margin: 0 0 6px 0; font-size: 18px; color: #1e293b; font-weight: bold;">${vendor}</h2>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #475569; line-height: 1.4;">${address}</p>
        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #0f172a;">GSTIN: <span style="font-family: monospace; font-size: 14px;">${gstin}</span></p>
        <p style="margin: 0; font-size: 12px; color: #475569;">State: <strong>${state}</strong></p>
      </div>
      <div style="width: 38%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Invoice No:</td>
            <td style="padding: 3px 0; font-weight: bold; text-align: right; font-family: monospace;">${invNo}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Date:</td>
            <td style="padding: 3px 0; font-weight: bold; text-align: right;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Place of Supply:</td>
            <td style="padding: 3px 0; font-weight: bold; text-align: right;">${state}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 12px;">
      <span style="font-weight: bold; color: #334155;">Billed To:</span> ${buyer} &nbsp;|&nbsp; 
      <span style="font-weight: bold; color: #334155;">GSTIN:</span> ${buyerGstin}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #0f172a; color: #ffffff; font-size: 12px; text-transform: uppercase;">
          <th style="padding: 8px 6px; text-align: left; width: 40px;">#</th>
          <th style="padding: 8px 6px; text-align: left;">Item Description</th>
          <th style="padding: 8px 6px; text-align: left; width: 90px;">HSN/SAC</th>
          <th style="padding: 8px 6px; text-align: center; width: 70px;">Qty</th>
          <th style="padding: 8px 6px; text-align: right; width: 100px;">Rate (₹)</th>
          <th style="padding: 8px 6px; text-align: right; width: 110px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot style="border-top: 2px solid #0f172a; font-size: 13px;">
        <tr>
          <td colspan="5" style="text-align: right; padding: 8px 6px; color: #475569;">Taxable Subtotal:</td>
          <td style="text-align: right; padding: 8px 6px; font-weight: bold;">₹${subtotal.toFixed(2)}</td>
        </tr>
        ${taxRows}
        ${roundOffRow}
        <tr style="background: #e2e8f0; font-size: 15px;">
          <td colspan="5" style="text-align: right; padding: 10px 6px; font-weight: bold; color: #0f172a;">GRAND TOTAL:</td>
          <td style="text-align: right; padding: 10px 6px; font-weight: bold; color: #0f172a;">₹${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
      <div>
        <p style="margin: 0 0 2px 0;">Terms: Payment within 30 days.</p>
        <p style="margin: 0;">Certified that particulars given above are true and correct.</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0 0 30px 0;">For <strong>${vendor}</strong></p>
        <p style="margin: 0; font-weight: bold;">Authorized Signatory</p>
      </div>
    </div>
  </div>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="920">
    <foreignObject width="100%" height="100%">
      ${html}
    </foreignObject>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_BILLS: SampleBillTemplate[] = [
  {
    id: 'sample-1',
    name: 'Apex Electronics (Intra-State GST)',
    type: 'GST Tax Invoice',
    vendor: 'Apex Electronics Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    invoiceNo: 'INV-2026-8812',
    date: '15-11-2026',
    total: 14750.00,
    sampleText: `TAX INVOICE
ORIGINAL FOR RECIPIENT
Apex Electronics Pvt Ltd
Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093
GSTIN: 27AAPFU0939F1ZV
State: Maharashtra
Invoice No: INV-2026-8812
Date: 15-11-2026
Billed To: My Demo Company
GSTIN: 27AABCS1429B1ZB
1 Wireless Industrial Barcode Scanner 8471 2 NOS 4250.00 8500.00
2 Thermal Receipt Paper Rolls Pack 4802 10 NOS 400.00 4000.00
Sub Total: 12500.00
CGST @ 9%: 1125.00
SGST @ 9%: 1125.00
Total Amount: 14750.00
Grand Total: 14750.00`,
    svgDataUrl: generateSampleInvoiceSvg(
      'Apex Electronics Pvt Ltd',
      'Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093',
      '27AAPFU0939F1ZV',
      'Maharashtra (27)',
      'INV-2026-8812',
      '15-11-2026',
      'Demo Enterprises Ltd',
      '27AABCS1429B1ZB',
      [
        { desc: 'Wireless Industrial Barcode Scanner', hsn: '8471', qty: 2, rate: 4250.00, amt: 8500.00 },
        { desc: 'Thermal Receipt Paper Rolls Pack (50 Rolls)', hsn: '4802', qty: 10, rate: 400.00, amt: 4000.00 }
      ],
      12500.00,
      1125.00,
      1125.00,
      0,
      0,
      14750.00
    )
  },
  {
    id: 'sample-2',
    name: 'Global Tech Components (Inter-State IGST)',
    type: 'Inter-State GST Bill',
    vendor: 'Global Tech Components',
    gstin: '29ABCDE1234F1Z5',
    invoiceNo: 'GTC/26-27/0419',
    date: '12-11-2026',
    total: 59000.00,
    sampleText: `TAX INVOICE
Global Tech Components
Outer Ring Road, Electronic City, Bengaluru 560100
GSTIN: 29ABCDE1234F1Z5
State: Karnataka (29)
Invoice No: GTC/26-27/0419
Date: 12-11-2026
Billed To: Demo Enterprises Ltd
GSTIN: 27AABCS1429B1ZB
Place of Supply: Maharashtra (27)
1 Enterprise SSD 2TB Server Storage 8471 5 NOS 10000.00 50000.00
Taxable Subtotal: 50000.00
IGST @ 18%: 9000.00
Grand Total: 59000.00`,
    svgDataUrl: generateSampleInvoiceSvg(
      'Global Tech Components',
      'Outer Ring Road, Electronic City, Bengaluru 560100',
      '29ABCDE1234F1Z5',
      'Karnataka (29)',
      'GTC/26-27/0419',
      '12-11-2026',
      'Demo Enterprises Ltd',
      '27AABCS1429B1ZB',
      [
        { desc: 'Enterprise SSD 2TB Server Storage Module', hsn: '8471', qty: 5, rate: 10000.00, amt: 50000.00 }
      ],
      50000.00,
      0,
      0,
      9000.00,
      0,
      59000.00
    )
  },
  {
    id: 'sample-3',
    name: 'Supreme Hardware & Tools (Retail Cash Memo)',
    type: 'Retail Cash Memo',
    vendor: 'Supreme Traders',
    gstin: '27AABCS1429B1ZB',
    invoiceNo: 'ST-5521',
    date: '14-11-2026',
    total: 3540.00,
    sampleText: `CASH MEMO / RETAIL INVOICE
Supreme Traders
Station Road, Dadar West, Mumbai 400028
GSTIN: 27AABCS1429B1ZB
State: Maharashtra
Bill No: ST-5521
Date: 14-11-2026
1 Electrical Copper Wiring Cable 8544 2 NOS 1200.00 2400.00
2 Heavy Duty Extension Board 8536 2 NOS 300.00 600.00
Taxable Amount: 3000.00
CGST 9%: 270.00
SGST 9%: 270.00
Total: 3540.00`,
    svgDataUrl: generateSampleInvoiceSvg(
      'Supreme Traders',
      'Station Road, Dadar West, Mumbai 400028',
      '27AABCS1429B1ZB',
      'Maharashtra (27)',
      'ST-5521',
      '14-11-2026',
      'Demo Enterprises Ltd',
      '27AABCS1429B1ZB',
      [
        { desc: 'Electrical Copper Wiring Cable (90m)', hsn: '8544', qty: 2, rate: 1200.00, amt: 2400.00 },
        { desc: 'Heavy Duty 6-Way Extension Board', hsn: '8536', qty: 2, rate: 300.00, amt: 600.00 }
      ],
      3000.00,
      270.00,
      270.00,
      0,
      0,
      3540.00
    )
  }
];
