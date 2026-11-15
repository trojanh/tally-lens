import React, { useState } from 'react';
import {
  X,
  Send,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  RotateCw
} from 'lucide-react';
import { BillData } from '../types';

interface BatchProcessorProps {
  bills: BillData[];
  onClose: () => void;
  onBatchPushToTally: (selectedBills: BillData[]) => void;
  onBatchExportXml: (selectedBills: BillData[]) => void;
  onBatchExportExcel: (selectedBills: BillData[]) => void;
  onBatchOcr: (selectedBills: BillData[]) => void;
  isPushing: boolean;
  isOcrRunning: boolean;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  bills,
  onClose,
  onBatchPushToTally,
  onBatchExportXml,
  onBatchExportExcel,
  onBatchOcr,
  isPushing,
  isOcrRunning,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(bills.map(b => b.id));

  const toggleSelectAll = () => {
    if (selectedIds.length === bills.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bills.map(b => b.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedBills = bills.filter(b => selectedIds.includes(b.id));

  const totalAmount = selectedBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);
  const totalTaxable = selectedBills.reduce((sum, b) => sum + (Number(b.taxableSubtotal) || 0), 0);
  const totalTaxes = selectedBills.reduce(
    (sum, b) => sum + ((b.cgstTotal || 0) + (b.sgstTotal || 0) + (b.igstTotal || 0)),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Batch Bills Processor</h2>
              <p className="text-xs text-slate-400">
                Bulk OCR, combined Tally XML generation, and 1-click batch import
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Stats Bar */}
        <div className="grid grid-cols-4 gap-4 px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Selected Bills:</span>
            <p className="font-bold text-white text-sm">
              {selectedBills.length} of {bills.length}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Total Taxable:</span>
            <p className="font-bold text-slate-200 text-sm font-mono">
              ₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Total Taxes (GST):</span>
            <p className="font-bold text-teal-400 text-sm font-mono">
              ₹{totalTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Total Value:</span>
            <p className="font-bold text-emerald-400 text-sm font-mono">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Bills Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === bills.length && bills.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                </th>
                <th className="py-2 px-3">Invoice No</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Supplier Name</th>
                <th className="py-2 px-3">GSTIN</th>
                <th className="py-2 px-3 text-right">Taxable (₹)</th>
                <th className="py-2 px-3 text-right">Total (₹)</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bills.map((bill) => {
                const isChecked = selectedIds.includes(bill.id);
                return (
                  <tr
                    key={bill.id}
                    onClick={() => toggleSelect(bill.id)}
                    className={`cursor-pointer hover:bg-slate-800/40 ${
                      isChecked ? 'bg-slate-800/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(bill.id)}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                      {bill.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{bill.invoiceDate}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      {bill.supplierName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {bill.supplierGstin || 'Unregistered'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      ₹{bill.taxableSubtotal.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      ₹{bill.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {bill.status === 'synced' ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Synced</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onBatchOcr(selectedBills)}
              disabled={selectedBills.length === 0 || isOcrRunning}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isOcrRunning ? 'animate-spin' : ''}`} />
              <span>Batch OCR</span>
            </button>

            <button
              onClick={() => onBatchExportXml(selectedBills)}
              disabled={selectedBills.length === 0}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Export Combined XML</span>
            </button>

            <button
              onClick={() => onBatchExportExcel(selectedBills)}
              disabled={selectedBills.length === 0}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>

          <button
            onClick={() => onBatchPushToTally(selectedBills)}
            disabled={selectedBills.length === 0 || isPushing}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Push All {selectedBills.length} to Tally</span>
          </button>
        </div>
      </div>
    </div>
  );
};
