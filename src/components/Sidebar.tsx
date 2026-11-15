import React, { useState } from 'react';
import {
  Plus,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Search,
  Upload
} from 'lucide-react';
import { BillData } from '../types';

interface SidebarProps {
  bills: BillData[];
  selectedBillId: string | null;
  onSelectBill: (id: string) => void;
  onUploadClick: () => void;
  onDeleteBill: (id: string) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  bills,
  selectedBillId,
  onSelectBill,
  onUploadClick,
  onDeleteBill,
  onFileInputChange
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'synced'>('all');
  const [search, setSearch] = useState('');

  const filteredBills = bills.filter(b => {
    if (filter === 'pending' && b.status === 'synced') return false;
    if (filter === 'synced' && b.status !== 'synced') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.invoiceNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q) ||
        b.fileName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 select-none">
      {/* Upload button area */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <label className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-[0.98]">
          <Upload className="w-4 h-4" />
          <span>Upload Image / Bill</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={onFileInputChange}
          />
        </label>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or vendor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-lg bg-slate-800/60 p-1 text-[11px] font-medium text-slate-400">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded-md text-center transition-all ${
              filter === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'hover:text-slate-200'
            }`}
          >
            All ({bills.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 py-1 rounded-md text-center transition-all ${
              filter === 'pending' ? 'bg-slate-700 text-white shadow-sm' : 'hover:text-slate-200'
            }`}
          >
            Pending ({bills.filter(b => b.status !== 'synced').length})
          </button>
          <button
            onClick={() => setFilter('synced')}
            className={`flex-1 py-1 rounded-md text-center transition-all ${
              filter === 'synced' ? 'bg-slate-700 text-white shadow-sm' : 'hover:text-slate-200'
            }`}
          >
            Synced ({bills.filter(b => b.status === 'synced').length})
          </button>
        </div>
      </div>

      {/* Bill List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {filteredBills.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>No bills found.</p>
            <p className="mt-1 text-[11px]">Upload an image bill or choose from Sample Bills above.</p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const isSelected = bill.id === selectedBillId;
            return (
              <div
                key={bill.id}
                onClick={() => onSelectBill(bill.id)}
                className={`p-3.5 cursor-pointer transition-colors group relative ${
                  isSelected
                    ? 'bg-slate-800/90 border-l-4 border-emerald-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {bill.supplierName || 'Unknown Vendor'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {bill.invoiceNumber || 'No Inv #'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-100">
                      ₹{bill.grandTotal ? Number(bill.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {bill.invoiceDate}
                    </p>
                  </div>
                </div>

                {/* Status Badge & Delete */}
                <div className="flex items-center justify-between mt-2 pt-1">
                  <div className="flex items-center space-x-1.5">
                    {bill.status === 'synced' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        <span>In Tally</span>
                      </span>
                    ) : bill.status === 'ocr_processing' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>OCR Reading</span>
                      </span>
                    ) : bill.status === 'error' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Sync Failed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <span>Draft / Ready</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBill(bill.id);
                    }}
                    title="Delete bill"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
