import React, { useState } from 'react';
import {
  Send,
  FileCode,
  FileSpreadsheet,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building,
  CreditCard,
  Calculator,
  ChevronDown,
  ChevronUp,
  UserPlus
} from 'lucide-react';
import { BillData, LineItem, TallyConfig, TallyLedger } from '../types';
import { validateGSTIN, calculateItemTaxes, isInterStateTransaction } from '../utils/gstUtils';

interface BillEditorProps {
  bill: BillData;
  config: TallyConfig;
  tallyLedgers: TallyLedger[];
  onUpdateBill: (updated: BillData) => void;
  onPushToTally: (bill: BillData) => void;
  onExportXml: (bill: BillData) => void;
  onExportExcel: (bill: BillData) => void;
  onRerunOcr: (bill: BillData) => void;
  onCreatePartyInTally: (partyName: string, gstin: string, state: string) => void;
  isPushing: boolean;
  isOcrRunning: boolean;
}

export const BillEditor: React.FC<BillEditorProps> = ({
  bill,
  config,
  tallyLedgers,
  onUpdateBill,
  onPushToTally,
  onExportXml,
  onExportExcel,
  onRerunOcr,
  onCreatePartyInTally,
  isPushing,
  isOcrRunning,
}) => {
  const [showRawOcr, setShowRawOcr] = useState(false);

  // Filter available Tally party ledgers (Sundry Creditors or all)
  const sundryCreditors = tallyLedgers.filter(
    (l) => l.parent.toLowerCase().includes('creditor') || l.parent === ''
  );
  const purchaseLedgers = tallyLedgers.filter((l) =>
    l.parent.toLowerCase().includes('purchase')
  );

  const isInterState = isInterStateTransaction(
    bill.supplierStateCode,
    config.companyStateCode
  );

  // Recalculate whole bill amounts when a line item changes
  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const updatedItems = [...bill.lineItems];
    const item = { ...updatedItems[index], [field]: value };

    // Auto calculate if qty or rate or taxable changes
    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const r = field === 'rate' ? Number(value) : item.rate;
      item.taxableAmount = Number((q * r).toFixed(2));
    }

    if (field === 'taxableAmount' || field === 'quantity' || field === 'rate' || field === 'gstRate') {
      const taxes = calculateItemTaxes(item.taxableAmount, item.gstRate, isInterState);
      item.cgstAmount = taxes.cgst;
      item.sgstAmount = taxes.sgst;
      item.igstAmount = taxes.igst;
      item.total = taxes.total;
    }

    updatedItems[index] = item;
    recalculateBillTotals(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: 'New Item',
      hsnCode: '',
      quantity: 1,
      unit: 'NOS',
      rate: 1000,
      taxableAmount: 1000,
      gstRate: 18,
      cgstAmount: isInterState ? 0 : 90,
      sgstAmount: isInterState ? 0 : 90,
      igstAmount: isInterState ? 180 : 0,
      total: 1180
    };
    recalculateBillTotals([...bill.lineItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = bill.lineItems.filter((_, i) => i !== index);
    recalculateBillTotals(updated);
  };

  const recalculateBillTotals = (items: LineItem[]) => {
    const taxableSubtotal = Number(
      items.reduce((sum, i) => sum + (Number(i.taxableAmount) || 0), 0).toFixed(2)
    );
    const cgstTotal = Number(
      items.reduce((sum, i) => sum + (Number(i.cgstAmount) || 0), 0).toFixed(2)
    );
    const sgstTotal = Number(
      items.reduce((sum, i) => sum + (Number(i.sgstAmount) || 0), 0).toFixed(2)
    );
    const igstTotal = Number(
      items.reduce((sum, i) => sum + (Number(i.igstAmount) || 0), 0).toFixed(2)
    );

    const calculatedGrand = Number((taxableSubtotal + cgstTotal + sgstTotal + igstTotal).toFixed(2));
    const roundOff = Number((bill.grandTotal - calculatedGrand).toFixed(2));

    onUpdateBill({
      ...bill,
      lineItems: items,
      taxableSubtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff: Math.abs(roundOff) > 5 ? 0 : roundOff, // keep roundoff modest
      status: 'verified'
    });
  };

  const handleAutoBalanceRoundOff = () => {
    const exactSum = Number(
      (bill.taxableSubtotal + (bill.cgstTotal || 0) + (bill.sgstTotal || 0) + (bill.igstTotal || 0)).toFixed(2)
    );
    const rounded = Math.round(exactSum);
    const diff = Number((rounded - exactSum).toFixed(2));

    onUpdateBill({
      ...bill,
      roundOff: diff,
      grandTotal: rounded,
      status: 'verified'
    });
  };

  // Arithmetic balance check
  const calculatedSum = Number(
    (bill.taxableSubtotal + (bill.cgstTotal || 0) + (bill.sgstTotal || 0) + (bill.igstTotal || 0) + (bill.roundOff || 0)).toFixed(2)
  );
  const isBalanced = Math.abs(calculatedSum - bill.grandTotal) < 0.05;

  const isValidGstin = validateGSTIN(bill.supplierGstin);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto">
      {/* Top Action Bar */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {bill.invoiceNumber || 'Draft Bill'}
            </h2>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {bill.voucherType}
            </span>
            {isInterState ? (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Inter-State (IGST)
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Intra-State (CGST+SGST)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {bill.supplierName} • {bill.invoiceDate}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRerunOcr(bill)}
            disabled={isOcrRunning}
            title="Re-run offline OCR on bill image"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isOcrRunning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isOcrRunning ? 'OCR Running...' : 'Re-run OCR'}</span>
          </button>

          <button
            onClick={() => onExportXml(bill)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium border border-slate-700 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export XML</span>
          </button>

          <button
            onClick={() => onExportExcel(bill)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {/* Direct 1-Click Push to Tally */}
          <button
            onClick={() => onPushToTally(bill)}
            disabled={isPushing}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isPushing ? 'animate-bounce' : ''}`} />
            <span>{isPushing ? 'Pushing...' : 'Push to Tally (1-Click)'}</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Arithmetic Validation Status Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            isBalanced
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {isBalanced ? (
                <>
                  <strong>Voucher Balanced:</strong> Taxable (₹{bill.taxableSubtotal.toFixed(2)}) + Taxes (₹{(bill.cgstTotal + bill.sgstTotal + bill.igstTotal).toFixed(2)}) {bill.roundOff !== 0 ? `+ RoundOff (₹${bill.roundOff.toFixed(2)})` : ''} = <strong>₹{bill.grandTotal.toFixed(2)}</strong>
                </>
              ) : (
                <>
                  <strong>Arithmetic Discrepancy Detected:</strong> Subtotal + Taxes (₹{calculatedSum.toFixed(2)}) != Grand Total (₹{bill.grandTotal.toFixed(2)}). Difference: ₹{(bill.grandTotal - calculatedSum).toFixed(2)}
                </>
              )}
            </span>
          </div>

          {!isBalanced && (
            <button
              onClick={handleAutoBalanceRoundOff}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] border border-amber-500/40 shrink-0"
            >
              Auto-Balance Round Off
            </button>
          )}
        </div>

        {/* Section 1: Voucher & Supplier Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Invoice Details */}
          <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voucher Details</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Voucher Type</label>
                <select
                  value={bill.voucherType}
                  onChange={(e) => onUpdateBill({ ...bill, voucherType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Purchase">Purchase Voucher</option>
                  <option value="Payment">Payment Voucher</option>
                  <option value="Journal">Journal Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Invoice / Bill No</label>
                <input
                  type="text"
                  value={bill.invoiceNumber}
                  onChange={(e) => onUpdateBill({ ...bill, invoiceNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={bill.invoiceDate}
                  onChange={(e) => onUpdateBill({ ...bill, invoiceDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={bill.dueDate || ''}
                  onChange={(e) => onUpdateBill({ ...bill, dueDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Card: Supplier & Party Details */}
          <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5 text-teal-400" />
                <span>Supplier / Party Details</span>
              </h3>
              <button
                onClick={() => onCreatePartyInTally(bill.partyLedgerName || bill.supplierName, bill.supplierGstin, bill.supplierState)}
                title="Create this party ledger in Tally directly"
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center space-x-1 font-medium"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Create in Tally</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={bill.supplierName}
                  onChange={(e) => {
                    const name = e.target.value;
                    onUpdateBill({
                      ...bill,
                      supplierName: name,
                      partyLedgerName: bill.partyLedgerName === bill.supplierName ? name : bill.partyLedgerName
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Supplier GSTIN{' '}
                  <span className={`text-[10px] ${isValidGstin ? 'text-emerald-400' : 'text-slate-400'}`}>
                    ({isValidGstin ? 'Valid' : 'Unregistered'})
                  </span>
                </label>
                <input
                  type="text"
                  value={bill.supplierGstin}
                  onChange={(e) => onUpdateBill({ ...bill, supplierGstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tally Party Ledger</label>
                <input
                  type="text"
                  list="sundry-creditors"
                  value={bill.partyLedgerName}
                  onChange={(e) => onUpdateBill({ ...bill, partyLedgerName: e.target.value })}
                  placeholder="Select or type ledger..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <datalist id="sundry-creditors">
                  {sundryCreditors.map((l) => (
                    <option key={l.name} value={l.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">State & State Code</label>
                <input
                  type="text"
                  value={`${bill.supplierState || 'Not specified'} (${bill.supplierStateCode || '--'})`}
                  disabled
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Purchase Ledger</label>
                <input
                  type="text"
                  list="purchase-ledgers"
                  value={bill.purchaseLedgerName}
                  onChange={(e) => onUpdateBill({ ...bill, purchaseLedgerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <datalist id="purchase-ledgers">
                  {purchaseLedgers.map((l) => (
                    <option key={l.name} value={l.name} />
                  ))}
                  <option value="Purchases Local" />
                  <option value="Interstate Purchases" />
                  <option value="Purchases @ 18%" />
                  <option value="Office Expenses" />
                </datalist>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Line Items Table */}
        <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Line Items & GST Breakdown</span>
            </h3>

            <button
              onClick={handleAddItem}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 font-semibold">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                  <th className="py-2.5 px-3 w-24">HSN/SAC</th>
                  <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-24 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 w-20 text-center">GST %</th>
                  <th className="py-2.5 px-3 w-24 text-right">
                    {isInterState ? 'IGST (₹)' : 'CGST+SGST'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bill.lineItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400 text-center">{index + 1}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full bg-transparent border-0 text-slate-200 focus:ring-1 focus:ring-emerald-500 rounded px-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                        placeholder="e.g. 8471"
                        className="w-full bg-transparent border-0 text-slate-300 font-mono text-xs focus:ring-1 focus:ring-emerald-500 rounded px-1"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-16 bg-transparent text-center border-0 text-slate-200 focus:ring-1 focus:ring-emerald-500 rounded px-1"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-transparent text-right border-0 text-slate-200 focus:ring-1 focus:ring-emerald-500 rounded px-1 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-200 font-mono">
                      ₹{item.taxableAmount.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select
                        value={item.gstRate}
                        onChange={(e) => handleItemChange(index, 'gstRate', parseInt(e.target.value, 10))}
                        className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      ₹{(isInterState ? item.igstAmount : (item.cgstAmount + item.sgstAmount)).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-100 font-mono">
                      ₹{item.total.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        title="Remove row"
                        className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Totals & Tax Summary */}
        <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-5 flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Voucher Narration</label>
            <textarea
              rows={3}
              value={bill.narration}
              onChange={(e) => onUpdateBill({ ...bill, narration: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
            />
          </div>

          <div className="w-full md:w-80 space-y-2.5 text-xs font-medium">
            <div className="flex justify-between text-slate-300">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-semibold">₹{bill.taxableSubtotal.toFixed(2)}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-purple-300">
                <span>Integrated GST (IGST):</span>
                <span className="font-mono font-semibold">₹{bill.igstTotal.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Central GST (CGST):</span>
                  <span className="font-mono font-semibold">₹{bill.cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>State GST (SGST):</span>
                  <span className="font-mono font-semibold">₹{bill.sgstTotal.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
              <span>Round Off:</span>
              <input
                type="number"
                step="0.01"
                value={bill.roundOff}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onUpdateBill({
                    ...bill,
                    roundOff: val,
                    grandTotal: Number((bill.taxableSubtotal + bill.cgstTotal + bill.sgstTotal + bill.igstTotal + val).toFixed(2))
                  });
                }}
                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-200"
              />
            </div>

            <div className="flex justify-between text-base font-bold text-white pt-2 border-t-2 border-slate-700">
              <span>Grand Total:</span>
              <span className="text-emerald-400 font-mono">
                ₹{Number(bill.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Raw OCR Text Inspector (collapsible) */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
          <button
            onClick={() => setShowRawOcr(!showRawOcr)}
            className="w-full px-4 py-3 bg-slate-900/80 hover:bg-slate-900 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
          >
            <span>Inspect Extracted Raw OCR Text</span>
            {showRawOcr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showRawOcr && (
            <div className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto border-t border-slate-800 select-text">
              {bill.rawOcrText || 'No raw OCR text recorded.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
