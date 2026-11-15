import React, { useState } from 'react';
import {
  X,
  Server,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { TallyConfig } from '../types';
import { GST_STATE_CODES } from '../utils/gstUtils';

interface SettingsModalProps {
  config: TallyConfig;
  onSaveConfig: (newConfig: TallyConfig) => void;
  onTestConnection: (config: TallyConfig) => Promise<{ connected: boolean; companyName?: string; error?: string }>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onSaveConfig,
  onTestConnection,
  onClose
}) => {
  const [localConfig, setLocalConfig] = useState<TallyConfig>({ ...config });
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
  }>({ tested: false });
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult({ tested: false });
    try {
      const res = await onTestConnection(localConfig);
      setTestResult({
        tested: true,
        success: res.connected,
        message: res.connected
          ? `Connected successfully! Active Company: "${res.companyName}"`
          : res.error || 'Connection failed.'
      });
      if (res.connected && res.companyName && !localConfig.companyName) {
        setLocalConfig(prev => ({ ...prev, companyName: res.companyName! }));
      }
    } catch (e: any) {
      setTestResult({
        tested: true,
        success: false,
        message: e.message || 'Error testing connection.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Tally XML Server & Ledger Settings</h2>
              <p className="text-xs text-slate-400">
                Configure connection to TallyPrime / Tally.ERP 9 and default ledger mappings
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 max-h-[70vh] text-xs">
          {/* Test Status Banner */}
          {testResult.tested && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Connection Parameters */}
          <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Tally XML HTTP Server Connection
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Tally Host / IP Address</label>
                <input
                  type="text"
                  value={localConfig.host}
                  onChange={(e) => setLocalConfig({ ...localConfig, host: e.target.value })}
                  placeholder="127.0.0.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Port</label>
                <input
                  type="number"
                  value={localConfig.port}
                  onChange={(e) => setLocalConfig({ ...localConfig, port: parseInt(e.target.value, 10) || 9000 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Target Company Name (Optional)</label>
                <input
                  type="text"
                  value={localConfig.companyName}
                  onChange={(e) => setLocalConfig({ ...localConfig, companyName: e.target.value })}
                  placeholder="Leave empty to use active open company"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Your State (For GST)</label>
                <select
                  value={localConfig.companyStateCode}
                  onChange={(e) => setLocalConfig({ ...localConfig, companyStateCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {code} - {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localConfig.isMockMode}
                  onChange={(e) => setLocalConfig({ ...localConfig, isMockMode: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">
                  Enable Mock Mode (Simulate Tally responses without Tally running)
                </span>
              </label>

              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          {/* Default Ledger Mappings */}
          <div className="bg-slate-800/40 border border-slate-750 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Default Tally Ledgers
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Default Purchase Ledger</label>
                <input
                  type="text"
                  value={localConfig.defaultPurchaseLedger}
                  onChange={(e) => setLocalConfig({ ...localConfig, defaultPurchaseLedger: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Input CGST Ledger</label>
                <input
                  type="text"
                  value={localConfig.defaultCgstLedger}
                  onChange={(e) => setLocalConfig({ ...localConfig, defaultCgstLedger: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Input SGST Ledger</label>
                <input
                  type="text"
                  value={localConfig.defaultSgstLedger}
                  onChange={(e) => setLocalConfig({ ...localConfig, defaultSgstLedger: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Input IGST Ledger</label>
                <input
                  type="text"
                  value={localConfig.defaultIgstLedger}
                  onChange={(e) => setLocalConfig({ ...localConfig, defaultIgstLedger: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Round Off Ledger</label>
                <input
                  type="text"
                  value={localConfig.defaultRoundOffLedger}
                  onChange={(e) => setLocalConfig({ ...localConfig, defaultRoundOffLedger: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Guide on enabling XML in Tally */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-400 space-y-1.5 text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>How to Enable Tally XML Server on Windows:</span>
            </div>
            <p>1. Open <strong>TallyPrime</strong> (or Tally.ERP 9) on your Windows PC.</p>
            <p>2. Press <strong>F1 (Help) &gt; Settings &gt; Connectivity</strong> (or <strong>F12 &gt; Advanced Configuration</strong> in ERP 9).</p>
            <p>3. Set <strong>TallyPrime Act As:</strong> to <strong>Server</strong> (or <strong>Both</strong>).</p>
            <p>4. Set <strong>Port:</strong> to <strong>9000</strong>.</p>
            <p>5. Accept and restart TallyPrime. Your company is now ready for instant 1-Click Bill Syncing!</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
