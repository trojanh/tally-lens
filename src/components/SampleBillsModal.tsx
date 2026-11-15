import React from 'react';
import { X, Sparkles, ArrowRight, FileCheck } from 'lucide-react';
import { SAMPLE_BILLS, SampleBillTemplate } from '../utils/sampleBills';

interface SampleBillsModalProps {
  onSelectSample: (sample: SampleBillTemplate) => void;
  onClose: () => void;
}

export const SampleBillsModal: React.FC<SampleBillsModalProps> = ({
  onSelectSample,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sample Indian Tax Invoices & Bills</h2>
              <p className="text-xs text-slate-400">
                Load realistic test bills with pre-rendered layouts to test OCR & Tally sync
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

        {/* List of sample bills */}
        <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
          {SAMPLE_BILLS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => {
                onSelectSample(sample);
                onClose();
              }}
              className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 text-teal-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-white">
                      {sample.name}
                    </h3>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                      {sample.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Vendor: <strong className="text-slate-300">{sample.vendor}</strong> • GSTIN: <span className="font-mono">{sample.gstin}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Inv: <span className="font-mono text-slate-400">{sample.invoiceNo}</span> • Date: {sample.date}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center space-x-3">
                <div>
                  <p className="text-xs font-bold text-emerald-400 font-mono">
                    ₹{sample.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-400">Click to Load</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
