import React, { useState, useEffect } from 'react';
import {
  X,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Server,
  Layers,
  Info,
  Calendar,
  Building,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { BillData, TallyConfig } from '../types';
import { TallyService } from '../services/tallyService';
import {
  validateBillsForGst,
  generateGstr1Json,
  downloadGstr1JsonFile,
  downloadGstOfflineExcelFile
} from '../utils/gstPortalExporter';
import { validateGSTIN } from '../utils/gstUtils';

interface GstPortalExportModalProps {
  bills: BillData[];
  config: TallyConfig;
  tallyService: TallyService;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const GstPortalExportModal: React.FC<GstPortalExportModalProps> = ({
  bills,
  config,
  tallyService,
  onClose,
  onNotify
}) => {
  // Source selection: 'tally_lens' or 'tally_direct'
  const [source, setSource] = useState<'tally_lens' | 'tally_direct'>('tally_lens');

  // Live Tally fetch state
  const [tallyVouchers, setTallyVouchers] = useState<BillData[]>([]);
  const [isFetchingTally, setIsFetchingTally] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>('2026-11-01');
  const [toDate, setToDate] = useState<string>('2026-11-30');
  const [voucherType, setVoucherType] = useState<string>('Sales');

  // Return period parameters
  const [selectedMonth, setSelectedMonth] = useState<string>('11');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [companyGstin, setCompanyGstin] = useState<string>('27AABCS1429B1ZB');
  const [grossTurnover, setGrossTurnover] = useState<number>(0);

  // Preview & View state
  const [activeTab, setActiveTab] = useState<'b2b' | 'b2cs' | 'hsn' | 'json_preview'>('b2b');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Selected bills depending on source
  const activeBills = source === 'tally_lens' ? bills : tallyVouchers;

  // Validation report
  const validationReport = validateBillsForGst(activeBills);

  // Computed return period MMYYYY
  const returnPeriod = `${selectedMonth.padStart(2, '0')}${selectedYear}`;

  // Automatically fetch from Tally when switching to tally_direct tab
  const handleFetchFromTally = async () => {
    setIsFetchingTally(true);
    try {
      const fetched = await tallyService.fetchVouchers(fromDate, toDate, voucherType);
      setTallyVouchers(fetched);
      onNotify('success', `Fetched ${fetched.length} ${voucherType} voucher(s) from Tally!`);
    } catch (e: any) {
      onNotify('error', `Failed to fetch from Tally: ${e.message}`);
    } finally {
      setIsFetchingTally(false);
    }
  };

  useEffect(() => {
    if (source === 'tally_direct' && tallyVouchers.length === 0) {
      handleFetchFromTally();
    }
  }, [source]);

  // JSON download
  const handleDownloadJson = () => {
    if (activeBills.length === 0) {
      onNotify('error', 'No bills available to export.');
      return;
    }
    downloadGstr1JsonFile(activeBills, {
      companyGstin,
      returnPeriod,
      grossTurnover
    });
    onNotify('success', `Downloaded GSTR-1 JSON for period ${returnPeriod}!`);
  };

  // Excel download
  const handleDownloadExcel = () => {
    if (activeBills.length === 0) {
      onNotify('error', 'No bills available to export.');
      return;
    }
    downloadGstOfflineExcelFile(activeBills, {
      companyGstin,
      returnPeriod
    });
    onNotify('success', `Downloaded GST Offline Tool Excel workbook for period ${returnPeriod}!`);
  };

  // Copy JSON string
  const handleCopyJson = () => {
    const payload = generateGstr1Json(activeBills, {
      companyGstin,
      returnPeriod,
      grossTurnover
    });
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    onNotify('info', 'GSTR-1 JSON copied to clipboard.');
  };

  const jsonPayloadString = JSON.stringify(
    generateGstr1Json(activeBills, { companyGstin, returnPeriod, grossTurnover }),
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 font-bold shadow-lg shadow-emerald-900/20">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  GST Portal Export Utility
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  GSTR-1 / GSTR-2B Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate official government JSON & Excel for direct offline upload to <span className="text-teal-400 font-mono">gst.gov.in</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Options Bar: Source & Filing Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Data Source Selection */}
            <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Data Source</span>
              </label>
              <div className="flex rounded-lg bg-slate-900 p-1 text-xs">
                <button
                  onClick={() => setSource('tally_lens')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                    source === 'tally_lens'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TallyLens Bills ({bills.length})
                </button>
                <button
                  onClick={() => setSource('tally_direct')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                    source === 'tally_direct'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fetch from Tally (:9000)
                </button>
              </div>
            </div>

            {/* 2. Return Period (Month & Year) */}
            <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Return Period (FP: {returnPeriod})</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="01">01 - January</option>
                  <option value="02">02 - February</option>
                  <option value="03">03 - March</option>
                  <option value="04">04 - April</option>
                  <option value="05">05 - May</option>
                  <option value="06">06 - June</option>
                  <option value="07">07 - July</option>
                  <option value="08">08 - August</option>
                  <option value="09">09 - September</option>
                  <option value="10">10 - October</option>
                  <option value="11">11 - November</option>
                  <option value="12">12 - December</option>
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            {/* 3. Company GSTIN */}
            <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-purple-400" />
                  <span>Filer GSTIN</span>
                </span>
                {validateGSTIN(companyGstin) && (
                  <span className="text-[10px] text-emerald-400 font-mono">Valid</span>
                )}
              </label>
              <input
                type="text"
                value={companyGstin}
                onChange={(e) => setCompanyGstin(e.target.value.toUpperCase())}
                placeholder="27AABCS1429B1ZB"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* If Tally Live Source is selected: Date Range Controls */}
          {source === 'tally_direct' && (
            <div className="bg-slate-800/60 border border-teal-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-slate-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Voucher Type</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="Sales">Sales (GSTR-1)</option>
                    <option value="Purchase">Purchase (GSTR-2B Recon)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleFetchFromTally}
                disabled={isFetchingTally}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTally ? 'animate-spin' : ''}`} />
                <span>{isFetchingTally ? 'Fetching from Tally...' : 'Fetch Vouchers from Tally'}</span>
              </button>
            </div>
          )}

          {/* Validation & Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-800/40 border border-slate-750 p-4 rounded-xl">
              <span className="text-slate-400">Total Vouchers:</span>
              <p className="text-lg font-bold text-white mt-1">
                {validationReport.totalInvoices}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {validationReport.b2bInvoicesCount} B2B (with GSTIN) • {validationReport.b2csInvoicesCount} B2C
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-750 p-4 rounded-xl">
              <span className="text-slate-400">Total Taxable Value:</span>
              <p className="text-lg font-bold text-slate-200 font-mono mt-1">
                ₹{validationReport.totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-teal-400 mt-0.5">
                {validationReport.uniqueHsnCount} Unique HSN codes
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-750 p-4 rounded-xl">
              <span className="text-slate-400">Total Taxes (CGST+SGST+IGST):</span>
              <p className="text-lg font-bold text-teal-300 font-mono mt-1">
                ₹{(validationReport.totalCgst + validationReport.totalSgst + validationReport.totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                CGST: ₹{validationReport.totalCgst.toFixed(0)} | SGST: ₹{validationReport.totalSgst.toFixed(0)} | IGST: ₹{validationReport.totalIgst.toFixed(0)}
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-750 p-4 rounded-xl">
              <span className="text-slate-400">Total Gross Invoice Value:</span>
              <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
                ₹{validationReport.totalInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-300 mt-0.5">
                Matches GSTR-1 Table 4 & 7
              </p>
            </div>
          </div>

          {/* GSTIN Health Check Alert */}
          {validationReport.invalidGstinCount > 0 ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> {validationReport.invalidGstinCount} transaction(s) have unregistered or invalid GSTINs. These will automatically be classified into **B2CS (B2C Small)** as per GST filing guidelines.
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Validation Passed:</strong> All B2B counterparties have valid 15-character GSTINs conforming to state codes.
              </span>
            </div>
          )}

          {/* Preview Tabs & Table */}
          <div className="bg-slate-800/40 border border-slate-750 rounded-xl overflow-hidden">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-750 bg-slate-900/60 px-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('b2b')}
                className={`py-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'b2b'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Table 4: B2B Invoices ({validationReport.b2bInvoicesCount})
              </button>
              <button
                onClick={() => setActiveTab('b2cs')}
                className={`py-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'b2cs'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Table 7: B2CS Retail Supplies
              </button>
              <button
                onClick={() => setActiveTab('hsn')}
                className={`py-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'hsn'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Table 12: HSN Summary ({validationReport.uniqueHsnCount})
              </button>
              <button
                onClick={() => setActiveTab('json_preview')}
                className={`py-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'json_preview'
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                JSON Payload Preview
              </button>
            </div>

            {/* Tab 1: B2B Table */}
            {activeTab === 'b2b' && (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Counterparty GSTIN</th>
                      <th className="py-2.5 px-3">Receiver Name</th>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 text-center">POS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeBills
                      .filter(b => validateGSTIN(b.supplierGstin))
                      .map((b, i) => (
                        <tr key={b.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-2 px-3 font-mono font-medium text-emerald-400">
                            {b.supplierGstin}
                          </td>
                          <td className="py-2 px-3 text-slate-200">{b.supplierName}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{b.invoiceNumber}</td>
                          <td className="py-2 px-3 text-slate-400">{b.invoiceDate}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            ₹{b.taxableSubtotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">
                            ₹{b.grandTotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-300">
                            {b.supplierStateCode || '27'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: B2CS Retail Table */}
            {activeTab === 'b2cs' && (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Place Of Supply</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeBills
                      .filter(b => !validateGSTIN(b.supplierGstin))
                      .map((b, i) => (
                        <tr key={b.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-400">OE (Other)</td>
                          <td className="py-2 px-3 text-slate-200">
                            {b.supplierStateCode || '27'}-{b.supplierState || 'State'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">18%</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            ₹{b.taxableSubtotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            ₹{b.cgstTotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            ₹{b.sgstTotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            ₹{b.igstTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    {activeBills.filter(b => !validateGSTIN(b.supplierGstin)).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          No unregistered / B2C invoices in this selection.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: HSN Summary */}
            {activeTab === 'hsn' && (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700">
                      <th className="py-2.5 px-3">HSN/SAC</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">UQC</th>
                      <th className="py-2.5 px-3 text-center">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Taxes (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {generateGstr1Json(activeBills, { companyGstin, returnPeriod }).hsn.data.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-mono font-medium text-teal-400">{h.hsn_sc}</td>
                        <td className="py-2 px-3 text-slate-200">{h.desc}</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{h.uqc}</td>
                        <td className="py-2 px-3 text-center font-mono">{h.qty}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-200">
                          ₹{h.txval.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          ₹{(h.camt + h.samt + h.iamt).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white">
                          ₹{h.val.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: JSON Raw Preview */}
            {activeTab === 'json_preview' && (
              <div className="relative">
                <button
                  onClick={handleCopyJson}
                  className="absolute top-3 right-3 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] max-h-64 overflow-y-auto whitespace-pre-wrap select-text">
                  {jsonPayloadString}
                </pre>
              </div>
            )}
          </div>

          {/* Quick Guide on Uploading to gst.gov.in */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Info className="w-4 h-4" />
              <span>How to Upload to the Government GST Portal (gst.gov.in):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-200">1. Log in</span>
                <p className="mt-1 text-slate-400">Log in to <span className="font-mono text-teal-400">gst.gov.in</span> with your credentials.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-200">2. Returns Dashboard</span>
                <p className="mt-1 text-slate-400">Go to **Services &gt; Returns &gt; Returns Dashboard** and pick your Month.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-200">3. Prepare Offline</span>
                <p className="mt-1 text-slate-400">Under **GSTR-1**, click the **Prepare Offline** button.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-200">4. Choose JSON</span>
                <p className="mt-1 text-slate-400">Click **Upload**, select the exported `.json` file, and submit!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Selected: <strong className="text-white">{activeBills.length}</strong> invoices for period <strong className="text-teal-400 font-mono">{returnPeriod}</strong>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadExcel}
              disabled={activeBills.length === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold text-xs border border-blue-500/30 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Export GST Offline Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadJson}
              disabled={activeBills.length === 0}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download GST Portal JSON (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
