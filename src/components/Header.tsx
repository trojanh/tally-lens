import React from 'react';
import {
  FileSpreadsheet,
  FileCode,
  Settings,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { TallyConfig } from '../types';

interface HeaderProps {
  tallyConnected: boolean;
  activeCompanyName?: string;
  config: TallyConfig;
  onOpenSettings: () => void;
  onOpenBatch: () => void;
  onOpenSampleBills: () => void;
  onExportAllXml: () => void;
  onExportAllExcel: () => void;
  onRefreshTally: () => void;
  isRefreshingTally: boolean;
  totalBills: number;
  syncedBills: number;
}

export const Header: React.FC<HeaderProps> = ({
  tallyConnected,
  activeCompanyName,
  config,
  onOpenSettings,
  onOpenBatch,
  onOpenSampleBills,
  onExportAllXml,
  onExportAllExcel,
  onRefreshTally,
  isRefreshingTally,
  totalBills,
  syncedBills
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-5 flex items-center justify-between shrink-0 z-20">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-bold text-lg text-slate-950">
          T
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-slate-100 tracking-tight text-base">TallyLens</h1>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Windows App
            </span>
          </div>
          <p className="text-xs text-slate-400">Offline Bill OCR to TallyPrime / Tally.ERP 9</p>
        </div>
      </div>

      {/* Tally Connection Status Badge */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSettings}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            tallyConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }`}
          title="Click to configure Tally HTTP Server"
        >
          {tallyConnected ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="truncate max-w-[220px]">
            {tallyConnected
              ? `${activeCompanyName || 'Connected'} (:9000)`
              : 'Tally Disconnected'}
          </span>
          {config.isMockMode && (
            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold">
              Mock
            </span>
          )}
        </button>

        <button
          onClick={onRefreshTally}
          disabled={isRefreshingTally}
          title="Check Tally connection"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshingTally ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Top Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenSampleBills}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
        >
          <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
          <span>Sample Bills</span>
        </button>

        <button
          onClick={onOpenBatch}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Batch Queue ({totalBills})</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <button
          onClick={onExportAllXml}
          disabled={totalBills === 0}
          title="Export all bills as a single combined Tally XML file"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Export XML</span>
        </button>

        <button
          onClick={onExportAllExcel}
          disabled={totalBills === 0}
          title="Export all bills to Excel template for TallyPrime"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings & Tally Configuration"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
