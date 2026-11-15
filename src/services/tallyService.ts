import { BillData, TallyConfig, TallySyncResult, TallyLedger } from '../types';
import {
  generateTallyEnvelopeXml,
  generateCreateLedgerXml,
  generateExportLedgersXml,
  generatePingCompanyXml
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
