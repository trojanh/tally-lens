import { BillData, TallyConfig, TallySyncResult, TallyLedger } from '../types';
import {
  generateTallyEnvelopeXml,
  generateCreateLedgerXml,
  generateExportLedgersXml,
  generatePingCompanyXml,
  generateExportVouchersXml
} from '../utils/xmlGenerator';

/**
 * Service to interact directly with Tally's local XML HTTP Server on port 9000
 */
export class TallyService {
  private config: TallyConfig;

  constructor(config: TallyConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: TallyConfig) {
    this.config = newConfig;
  }

  private getUrl(): string {
    const host = this.config.host || '127.0.0.1';
    const port = this.config.port || 9000;
    return `http://${host}:${port}`;
  }

  private async sendRequest(xml: string): Promise<string> {
    const url = this.getUrl();

    // Use Electron's native IPC request if available (avoids any browser CORS limitations)
    if (typeof window !== 'undefined' && window.electronAPI?.tallyRequest) {
      const res = await window.electronAPI.tallyRequest(url, xml);
      if (res.status >= 400 && !res.text.includes('<RESPONSE>')) {
        throw new Error(`HTTP Error ${res.status}: ${res.text}`);
      }
      return res.text;
    }

    // Fallback to fetch for browser environment
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml;charset=utf-8' },
      body: xml
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Tests connection to Tally XML server and fetches active company names
   */
  async testConnection(): Promise<{ connected: boolean; companyName?: string; error?: string }> {
    if (this.config.isMockMode) {
      return {
        connected: true,
        companyName: this.config.companyName || 'Demo Enterprises Ltd (Simulated)'
      };
    }

    try {
      const xml = generatePingCompanyXml();
      const text = await this.sendRequest(xml);

      // Try extracting company name from response
      const match = text.match(/<COMPANYNAME[^>]*>([^<]+)<\/COMPANYNAME>/i) ||
                    text.match(/<SVCURRENTCOMPANY>([^<]+)<\/SVCURRENTCOMPANY>/i);
      const company = match ? match[1].trim() : (this.config.companyName || 'Connected to Tally');

      return {
        connected: true,
        companyName: company
      };
    } catch (err: any) {
      return {
        connected: false,
        error: `Could not reach Tally at ${this.getUrl()}. Ensure Tally is open and Tally XML Server is enabled on port ${this.config.port}. (${err.message})`
      };
    }
  }

  /**
   * Fetches existing ledgers from Tally to populate dropdowns and auto-matching
   */
  async fetchLedgers(): Promise<TallyLedger[]> {
    if (this.config.isMockMode) {
      // Realistic default ledgers
      return [
        { name: 'Purchases Local', parent: 'Purchase Accounts' },
        { name: 'Interstate Purchases', parent: 'Purchase Accounts' },
        { name: 'Input CGST', parent: 'Duties & Taxes' },
        { name: 'Input SGST', parent: 'Duties & Taxes' },
        { name: 'Input IGST', parent: 'Duties & Taxes' },
        { name: 'Round Off', parent: 'Indirect Expenses' },
        { name: 'Cash', parent: 'Cash-in-Hand' },
        { name: 'Office Expenses', parent: 'Indirect Expenses' },
        { name: 'Supreme Traders', parent: 'Sundry Creditors', gstin: '27AABCS1429B1ZB', state: 'Maharashtra' },
        { name: 'Apex Electronics Pvt Ltd', parent: 'Sundry Creditors', gstin: '27AAPFU0939F1ZV', state: 'Maharashtra' },
        { name: 'Global Tech Components', parent: 'Sundry Creditors', gstin: '29ABCDE1234F1Z5', state: 'Karnataka' },
      ];
    }

    try {
      const xml = generateExportLedgersXml(this.config.companyName);
      const text = await this.sendRequest(xml);
      const ledgers: TallyLedger[] = [];

      // Extract ledgers using regex
      const ledgerBlocks = text.match(/<LEDGER[^>]*>[\s\S]*?<\/LEDGER>/gi) || [];
      for (const block of ledgerBlocks) {
        const nameMatch = block.match(/<NAME[^>]*>([^<]+)<\/NAME>/i) || block.match(/NAME="([^"]+)"/i);
        const parentMatch = block.match(/<PARENT[^>]*>([^<]+)<\/PARENT>/i);
        const gstinMatch = block.match(/<PARTYGSTIN[^>]*>([^<]+)<\/PARTYGSTIN>/i);
        const stateMatch = block.match(/<LEDSTATENAME[^>]*>([^<]+)<\/LEDSTATENAME>/i);

        if (nameMatch) {
          ledgers.push({
            name: nameMatch[1].trim(),
            parent: parentMatch ? parentMatch[1].trim() : '',
            gstin: gstinMatch ? gstinMatch[1].trim() : '',
            state: stateMatch ? stateMatch[1].trim() : ''
          });
        }
      }

      return ledgers;
    } catch {
      return [];
    }
  }

  /**
   * Creates a Party Ledger in Tally under Sundry Creditors
   */
  async createPartyLedger(ledgerName: string, gstin: string, state: string): Promise<TallySyncResult> {
    if (this.config.isMockMode) {
      return {
        success: true,
        message: `Ledger "${ledgerName}" created successfully in Tally (Simulated).`,
        createdCount: 1
      };
    }

    try {
      const xml = generateCreateLedgerXml(ledgerName, gstin, state, this.config.companyName);
      const responseText = await this.sendRequest(xml);
      return this.parseTallyResponse(responseText, `Create Ledger "${ledgerName}"`);
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Tally server: ${err.message}`
      };
    }
  }

  /**
   * Pushes a single bill voucher into Tally
   */
  async pushVoucher(bill: BillData): Promise<TallySyncResult> {
    return this.pushBatchVouchers([bill]);
  }

  /**
   * Pushes multiple bills in a single XML batch into Tally
   */
  async pushBatchVouchers(bills: BillData[]): Promise<TallySyncResult> {
    if (bills.length === 0) {
      return { success: false, message: 'No bills selected for sync.' };
    }

    if (this.config.isMockMode) {
      return {
        success: true,
        message: `Successfully posted ${bills.length} voucher(s) into Tally (Simulated Mode).`,
        createdCount: bills.length,
        voucherNumber: bills.map(b => b.invoiceNumber).join(', ')
      };
    }

    try {
      const xml = generateTallyEnvelopeXml(bills, this.config.companyName);
      const responseText = await this.sendRequest(xml);
      return this.parseTallyResponse(responseText, `Post ${bills.length} Voucher(s)`);
    } catch (err: any) {
      return {
        success: false,
        message: `Sync Failed: ${err.message}. Make sure Tally is running on ${this.getUrl()}.`
      };
    }
  }

  /**
   * Fetches vouchers from Tally for export to GST Portal
   */
  async fetchVouchers(
    fromDate: string = '2026-11-01',
    toDate: string = '2026-11-30',
    voucherType: string = 'Sales'
  ): Promise<BillData[]> {
    if (this.config.isMockMode) {
      // Return realistic mock vouchers from Tally
      return [
        {
          id: 'tally-vch-1',
          fileName: 'Tally_Sales_INV-8812.xml',
          imageUrl: '',
          voucherType: 'Purchase',
          invoiceNumber: 'INV-2026-8812',
          invoiceDate: '2026-11-15',
          supplierName: 'Apex Electronics Pvt Ltd',
          supplierGstin: '27AAPFU0939F1ZV',
          supplierState: 'Maharashtra',
          supplierStateCode: '27',
          partyLedgerName: 'Apex Electronics Pvt Ltd',
          purchaseLedgerName: 'Sales Account',
          taxLedgerCgst: 'Output CGST',
          taxLedgerSgst: 'Output SGST',
          taxLedgerIgst: 'Output IGST',
          roundOffLedger: 'Round Off',
          lineItems: [
            {
              id: 'item-1',
              description: 'Industrial Barcode Scanner',
              hsnCode: '8471',
              quantity: 2,
              unit: 'NOS',
              rate: 4250.00,
              taxableAmount: 8500.00,
              gstRate: 18,
              cgstAmount: 765.00,
              sgstAmount: 765.00,
              igstAmount: 0,
              total: 10030.00
            },
            {
              id: 'item-2',
              description: 'Thermal Paper Rolls Pack',
              hsnCode: '4802',
              quantity: 10,
              unit: 'NOS',
              rate: 400.00,
              taxableAmount: 4000.00,
              gstRate: 18,
              cgstAmount: 360.00,
              sgstAmount: 360.00,
              igstAmount: 0,
              total: 4720.00
            }
          ],
          taxableSubtotal: 12500.00,
          cgstTotal: 1125.00,
          sgstTotal: 1125.00,
          igstTotal: 0,
          roundOff: 0,
          grandTotal: 14750.00,
          narration: 'Sales invoice to Apex Electronics',
          status: 'synced',
          createdAt: new Date().toISOString()
        },
        {
          id: 'tally-vch-2',
          fileName: 'Tally_Sales_GTC-0419.xml',
          imageUrl: '',
          voucherType: 'Purchase',
          invoiceNumber: 'GTC/26-27/0419',
          invoiceDate: '2026-11-12',
          supplierName: 'Global Tech Components',
          supplierGstin: '29ABCDE1234F1Z5',
          supplierState: 'Karnataka',
          supplierStateCode: '29',
          partyLedgerName: 'Global Tech Components',
          purchaseLedgerName: 'Interstate Sales',
          taxLedgerCgst: 'Output CGST',
          taxLedgerSgst: 'Output SGST',
          taxLedgerIgst: 'Output IGST',
          roundOffLedger: 'Round Off',
          lineItems: [
            {
              id: 'item-1',
              description: 'Enterprise SSD Storage Module',
              hsnCode: '8471',
              quantity: 5,
              unit: 'NOS',
              rate: 10000.00,
              taxableAmount: 50000.00,
              gstRate: 18,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 9000.00,
              total: 59000.00
            }
          ],
          taxableSubtotal: 50000.00,
          cgstTotal: 0,
          sgstTotal: 0,
          igstTotal: 9000.00,
          roundOff: 0,
          grandTotal: 59000.00,
          narration: 'Interstate sale to Global Tech Components',
          status: 'synced',
          createdAt: new Date().toISOString()
        },
        {
          id: 'tally-vch-3',
          fileName: 'Tally_Sales_RET-109.xml',
          imageUrl: '',
          voucherType: 'Purchase',
          invoiceNumber: 'RET-109',
          invoiceDate: '2026-11-20',
          supplierName: 'Walk-in Retail Customer',
          supplierGstin: '', // Unregistered B2C
          supplierState: 'Maharashtra',
          supplierStateCode: '27',
          partyLedgerName: 'Cash',
          purchaseLedgerName: 'Sales Local',
          taxLedgerCgst: 'Output CGST',
          taxLedgerSgst: 'Output SGST',
          taxLedgerIgst: 'Output IGST',
          roundOffLedger: 'Round Off',
          lineItems: [
            {
              id: 'item-1',
              description: 'HDMI Cables & Connectors',
              hsnCode: '8544',
              quantity: 3,
              unit: 'NOS',
              rate: 600.00,
              taxableAmount: 1800.00,
              gstRate: 18,
              cgstAmount: 162.00,
              sgstAmount: 162.00,
              igstAmount: 0,
              total: 2124.00
            }
          ],
          taxableSubtotal: 1800.00,
          cgstTotal: 162.00,
          sgstTotal: 162.00,
          igstTotal: 0,
          roundOff: 0,
          grandTotal: 2124.00,
          narration: 'Cash sale to counter customer',
          status: 'synced',
          createdAt: new Date().toISOString()
        }
      ];
    }

    try {
      const xml = generateExportVouchersXml(fromDate, toDate, voucherType, this.config.companyName);
      const text = await this.sendRequest(xml);
      const vouchers: BillData[] = [];

      const vchBlocks = text.match(/<VOUCHER[^>]*>[\s\S]*?<\/VOUCHER>/gi) || [];
      for (const block of vchBlocks) {
        const vchNumMatch = block.match(/<VOUCHERNUMBER[^>]*>([^<]+)<\/VOUCHERNUMBER>/i) || block.match(/<REFERENCE[^>]*>([^<]+)<\/REFERENCE>/i);
        const dateMatch = block.match(/<DATE[^>]*>([^<]+)<\/DATE>/i);
        const partyMatch = block.match(/<PARTYLEDGERNAME[^>]*>([^<]+)<\/PARTYLEDGERNAME>/i) || block.match(/<PARTYNAME[^>]*>([^<]+)<\/PARTYNAME>/i);
        const gstinMatch = block.match(/<PARTYGSTIN[^>]*>([^<]+)<\/PARTYGSTIN>/i);
        const stateMatch = block.match(/<STATENAME[^>]*>([^<]+)<\/STATENAME>/i);
        const amountMatch = block.match(/<AMOUNT[^>]*>([^<]+)<\/AMOUNT>/i);

        let vchDate = new Date().toISOString().split('T')[0];
        if (dateMatch && dateMatch[1] && dateMatch[1].length === 8) {
          const raw = dateMatch[1];
          vchDate = `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
        }

        const partyName = partyMatch ? partyMatch[1].trim() : 'Customer / Vendor';
        const gstin = gstinMatch ? gstinMatch[1].trim().toUpperCase() : '';
        const stateName = stateMatch ? stateMatch[1].trim() : '';
        const totalVal = amountMatch ? Math.abs(parseFloat(amountMatch[1])) || 0 : 0;
        const taxableVal = Number((totalVal / 1.18).toFixed(2));
        const taxVal = Number((totalVal - taxableVal).toFixed(2));
        const isInter = gstin && gstin.substring(0, 2) !== this.config.companyStateCode;

        vouchers.push({
          id: `tally-vch-${Date.now()}-${Math.random()}`,
          fileName: `Tally_${vchNumMatch ? vchNumMatch[1].trim() : 'Vch'}.xml`,
          imageUrl: '',
          voucherType: voucherType === 'Sales' ? 'Purchase' : 'Purchase',
          invoiceNumber: vchNumMatch ? vchNumMatch[1].trim() : `VCH-${Date.now()}`,
          invoiceDate: vchDate,
          supplierName: partyName,
          supplierGstin: gstin,
          supplierState: stateName,
          supplierStateCode: gstin ? gstin.substring(0, 2) : this.config.companyStateCode,
          partyLedgerName: partyName,
          purchaseLedgerName: isInter ? 'Interstate Sales' : 'Sales Local',
          taxLedgerCgst: 'Output CGST',
          taxLedgerSgst: 'Output SGST',
          taxLedgerIgst: 'Output IGST',
          roundOffLedger: 'Round Off',
          lineItems: [
            {
              id: '1',
              description: 'Goods / Services',
              hsnCode: '9983',
              quantity: 1,
              unit: 'NOS',
              rate: taxableVal,
              taxableAmount: taxableVal,
              gstRate: 18,
              cgstAmount: isInter ? 0 : Number((taxVal / 2).toFixed(2)),
              sgstAmount: isInter ? 0 : Number((taxVal / 2).toFixed(2)),
              igstAmount: isInter ? taxVal : 0,
              total: totalVal
            }
          ],
          taxableSubtotal: taxableVal,
          cgstTotal: isInter ? 0 : Number((taxVal / 2).toFixed(2)),
          sgstTotal: isInter ? 0 : Number((taxVal / 2).toFixed(2)),
          igstTotal: isInter ? taxVal : 0,
          roundOff: 0,
          grandTotal: totalVal,
          narration: `Imported from Tally (${voucherType})`,
          status: 'synced',
          createdAt: new Date().toISOString()
        });
      }

      return vouchers;
    } catch (e: any) {
      console.error('Failed to export vouchers from Tally:', e);
      return [];
    }
  }

  /**
   * Parses Tally's XML response envelope
   */
  private parseTallyResponse(xml: string, actionName: string): TallySyncResult {
    // Check for errors
    const errorMatch = xml.match(/<ERRORS>(\d+)<\/ERRORS>/i);
    const errorCount = errorMatch ? parseInt(errorMatch[1], 10) : 0;

    const createdMatch = xml.match(/<CREATED>(\d+)<\/CREATED>/i);
    const createdCount = createdMatch ? parseInt(createdMatch[1], 10) : 0;

    const alteredMatch = xml.match(/<ALTERED>(\d+)<\/ALTERED>/i);
    const alteredCount = alteredMatch ? parseInt(alteredMatch[1], 10) : 0;

    // Extract detailed line errors
    const lineErrors: string[] = [];
    const lineErrorRegex = /<LINEERROR>([^<]+)<\/LINEERROR>/gi;
    let match;
    while ((match = lineErrorRegex.exec(xml)) !== null) {
      lineErrors.push(match[1].trim());
    }

    if (errorCount > 0 || lineErrors.length > 0) {
      const errorMsg = lineErrors.length > 0
        ? lineErrors.join(' | ')
        : `Tally reported ${errorCount} error(s) during ${actionName}.`;
      return {
        success: false,
        message: errorMsg,
        createdCount,
        rawResponse: xml,
        errors: lineErrors
      };
    }

    if (createdCount > 0 || alteredCount > 0) {
      return {
        success: true,
        message: `Success! ${createdCount} created, ${alteredCount} updated in Tally.`,
        createdCount,
        rawResponse: xml
      };
    }

    // If no explicit counts, check if <RESPONSE> is present without error
    if (xml.includes('<RESPONSE>') && !xml.includes('<ERROR>')) {
      return {
        success: true,
        message: `${actionName} executed successfully in Tally.`,
        rawResponse: xml
      };
    }

    return {
      success: false,
      message: `Unexpected response from Tally: ${xml.substring(0, 200)}...`,
      rawResponse: xml
    };
  }
}
