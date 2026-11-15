import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ImageViewer } from './components/ImageViewer';
import { BillEditor } from './components/BillEditor';
import { BatchProcessor } from './components/BatchProcessor';
import { SettingsModal } from './components/SettingsModal';
import { SampleBillsModal } from './components/SampleBillsModal';
import { BillData, TallyConfig, TallyLedger } from './types';
import { TallyService } from './services/tallyService';
import { performOfflineOcr } from './services/ocrService';
import { parseInvoiceText } from './utils/billParser';
import { generateTallyEnvelopeXml } from './utils/xmlGenerator';
import { exportBillsToExcel } from './utils/excelExporter';
import { SAMPLE_BILLS, SampleBillTemplate } from './utils/sampleBills';

const DEFAULT_CONFIG: TallyConfig = {
  host: '127.0.0.1',
  port: 9000,
  companyName: '',
  companyStateCode: '27', // Maharashtra
  defaultPurchaseLedger: 'Purchases Local',
  defaultCgstLedger: 'Input CGST',
  defaultSgstLedger: 'Input SGST',
  defaultIgstLedger: 'Input IGST',
  defaultRoundOffLedger: 'Round Off',
  isMockMode: true, // Default to mock mode so app is 100% testable out-of-the-box!
};

export const App: React.FC = () => {
  const [config, setConfig] = useState<TallyConfig>(() => {
    const saved = localStorage.getItem('tally_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [tallyService, setTallyService] = useState<TallyService>(new TallyService(config));
  const [tallyConnected, setTallyConnected] = useState<boolean>(false);
  const [activeCompanyName, setActiveCompanyName] = useState<string>('');
  const [tallyLedgers, setTallyLedgers] = useState<TallyLedger[]>([]);
  const [isRefreshingTally, setIsRefreshingTally] = useState<boolean>(false);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);

  // Bills state
  const [bills, setBills] = useState<BillData[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  // Processing state
  const [isPushing, setIsPushing] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Initialize with sample bills on first launch
  useEffect(() => {
    const initialSample = SAMPLE_BILLS[0];
    const initialBill: BillData = {
      id: 'bill-sample-1',
      fileName: 'Apex_Tax_Invoice.svg',
      imageUrl: initialSample.svgDataUrl,
      rawOcrText: initialSample.sampleText,
      voucherType: 'Purchase',
      invoiceNumber: initialSample.invoiceNo,
      invoiceDate: '2026-11-15',
      supplierName: initialSample.vendor,
      supplierGstin: initialSample.gstin,
      supplierState: 'Maharashtra',
      supplierStateCode: '27',
      partyLedgerName: initialSample.vendor,
      purchaseLedgerName: 'Purchases Local',
      taxLedgerCgst: 'Input CGST',
      taxLedgerSgst: 'Input SGST',
      taxLedgerIgst: 'Input IGST',
      roundOffLedger: 'Round Off',
      lineItems: [
        {
          id: 'item-1',
          description: 'Wireless Industrial Barcode Scanner',
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
          description: 'Thermal Receipt Paper Rolls Pack (50 Rolls)',
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
      narration: `Being purchase bill no ${initialSample.invoiceNo} dated 15-11-2026 from ${initialSample.vendor} (GSTIN: ${initialSample.gstin})`,
      status: 'verified',
      createdAt: new Date().toISOString()
    };

    setBills([initialBill]);
    setSelectedBillId(initialBill.id);
  }, []);

  // Update Tally Service when config changes
  useEffect(() => {
    const service = new TallyService(config);
    setTallyService(service);
    localStorage.setItem('tally_config', JSON.stringify(config));
    checkTallyConnection(service);
  }, [config]);

  const checkTallyConnection = async (service = tallyService) => {
    setIsRefreshingTally(true);
    try {
      const res = await service.testConnection();
      setTallyConnected(res.connected);
      if (res.connected) {
        setActiveCompanyName(res.companyName || config.companyName || 'Connected to Tally');
        const ledgers = await service.fetchLedgers();
        setTallyLedgers(ledgers);
      } else {
        setActiveCompanyName('');
      }
    } catch {
      setTallyConnected(false);
      setActiveCompanyName('');
    } finally {
      setIsRefreshingTally(false);
    }
  };

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Currently selected bill
  const selectedBill = bills.find(b => b.id === selectedBillId) || bills[0] || null;

  // Handle bill updates
  const handleUpdateBill = (updated: BillData) => {
    setBills(prev => prev.map(b => (b.id === updated.id ? updated : b)));
  };

  // Upload bill files
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        const newBillId = `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newBill: BillData = {
          id: newBillId,
          fileName: file.name,
          imageUrl,
          voucherType: 'Purchase',
          invoiceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          supplierName: 'Processing OCR...',
          supplierGstin: '',
          supplierState: '',
          supplierStateCode: '',
          partyLedgerName: '',
          purchaseLedgerName: config.defaultPurchaseLedger,
          taxLedgerCgst: config.defaultCgstLedger,
          taxLedgerSgst: config.defaultSgstLedger,
          taxLedgerIgst: config.defaultIgstLedger,
          roundOffLedger: config.defaultRoundOffLedger,
          lineItems: [],
          taxableSubtotal: 0,
          cgstTotal: 0,
          sgstTotal: 0,
          igstTotal: 0,
          roundOff: 0,
          grandTotal: 0,
          narration: '',
          status: 'ocr_processing',
          createdAt: new Date().toISOString()
        };

        setBills(prev => [newBill, ...prev]);
        setSelectedBillId(newBillId);

        // Run Offline OCR
        await runOcrOnBill(newBill, imageUrl);
      };

      reader.readAsDataURL(file);
    }
  };

  // Run offline OCR on a bill
  const runOcrOnBill = async (bill: BillData, imageUrl: string) => {
    setIsOcrRunning(true);
    notify('info', `Running 100% offline OCR on ${bill.fileName}...`);
    try {
      const text = await performOfflineOcr(imageUrl);
      const parsed = parseInvoiceText(text, bill.fileName, config);

      const updatedBill: BillData = {
        ...bill,
        ...parsed,
        imageUrl,
        rawOcrText: text,
        status: 'verified'
      } as BillData;

      handleUpdateBill(updatedBill);
      notify('success', `OCR complete! Extracted ${updatedBill.invoiceNumber || 'bill data'}.`);
    } catch (err: any) {
      console.error(err);
      notify('error', `OCR notice: ${err.message}. You can manually verify and edit fields.`);
      // Fallback parse on empty
      const parsed = parseInvoiceText('', bill.fileName, config);
      handleUpdateBill({
        ...bill,
        ...parsed,
        imageUrl,
        rawOcrText: 'OCR failed or empty image. Please review fields manually.',
        status: 'draft'
      } as BillData);
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Load a sample bill template
  const handleSelectSample = (sample: SampleBillTemplate) => {
    const parsed = parseInvoiceText(sample.sampleText, `${sample.name}.svg`, config);
    const newBill: BillData = {
      id: `bill-${Date.now()}`,
      fileName: `${sample.name}.svg`,
      imageUrl: sample.svgDataUrl,
      rawOcrText: sample.sampleText,
      ...parsed,
      status: 'verified',
      createdAt: new Date().toISOString()
    } as BillData;

    setBills(prev => [newBill, ...prev]);
    setSelectedBillId(newBill.id);
    notify('success', `Loaded sample bill: ${sample.name}`);
  };

  // Delete bill
  const handleDeleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    if (selectedBillId === id) {
      const remaining = bills.filter(b => b.id !== id);
      setSelectedBillId(remaining.length > 0 ? remaining[0].id : null);
    }
    notify('info', 'Bill removed.');
  };

  // 1-Click Push to Tally
  const handlePushToTally = async (bill: BillData) => {
    setIsPushing(true);
    try {
      const result = await tallyService.pushVoucher(bill);
      if (result.success) {
        handleUpdateBill({
          ...bill,
          status: 'synced',
          syncMessage: result.message,
          syncedAt: new Date().toISOString()
        });
        notify('success', `✓ Successfully added to Tally! (${result.message})`);
      } else {
        handleUpdateBill({
          ...bill,
          status: 'error',
          syncMessage: result.message
        });
        notify('error', `Tally Sync Error: ${result.message}`);
      }
    } catch (err: any) {
      notify('error', `Failed to push to Tally: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Create party ledger in Tally
  const handleCreatePartyInTally = async (partyName: string, gstin: string, state: string) => {
    if (!partyName) {
      notify('error', 'Supplier name cannot be empty.');
      return;
    }
    try {
      const res = await tallyService.createPartyLedger(partyName, gstin, state);
      if (res.success) {
        notify('success', `✓ Party Ledger "${partyName}" created in Tally!`);
        // Refresh ledgers
        const ledgers = await tallyService.fetchLedgers();
        setTallyLedgers(ledgers);
      } else {
        notify('error', `Could not create ledger in Tally: ${res.message}`);
      }
    } catch (e: any) {
      notify('error', e.message);
    }
  };

  // Export single bill XML
  const handleExportXml = (bill: BillData) => {
    const xml = generateTallyEnvelopeXml([bill], config.companyName);
    const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_${bill.invoiceNumber || 'Voucher'}_${bill.invoiceDate}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', `Exported Tally XML for ${bill.invoiceNumber || 'bill'}.`);
  };

  // Export single bill Excel
  const handleExportExcel = (bill: BillData) => {
    exportBillsToExcel([bill], `Tally_${bill.invoiceNumber || 'Voucher'}.xlsx`);
    notify('success', `Exported Excel sheet for ${bill.invoiceNumber || 'bill'}.`);
  };

  // Batch actions
  const handleBatchPushToTally = async (selected: BillData[]) => {
    setIsPushing(true);
    try {
      const result = await tallyService.pushBatchVouchers(selected);
      if (result.success) {
        const now = new Date().toISOString();
        setBills(prev =>
          prev.map(b =>
            selected.some(s => s.id === b.id)
              ? { ...b, status: 'synced', syncMessage: result.message, syncedAt: now }
              : b
          )
        );
        notify('success', `✓ Successfully posted ${selected.length} bills into Tally!`);
        setShowBatch(false);
      } else {
        notify('error', `Batch Sync Error: ${result.message}`);
      }
    } catch (err: any) {
      notify('error', `Batch sync failed: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  const handleBatchExportXml = (selected: BillData[]) => {
    const xml = generateTallyEnvelopeXml(selected, config.companyName);
    const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Batch_Vouchers_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', `Exported combined XML for ${selected.length} bills.`);
  };

  const handleBatchExportExcel = (selected: BillData[]) => {
    exportBillsToExcel(selected, `Tally_Batch_Purchase_Bills_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('success', `Exported combined Excel for ${selected.length} bills.`);
  };

  const handleBatchOcr = async (selected: BillData[]) => {
    setIsOcrRunning(true);
    notify('info', `Running batch OCR on ${selected.length} bills...`);
    for (const b of selected) {
      if (b.imageUrl) {
        await runOcrOnBill(b, b.imageUrl);
      }
    }
    setIsOcrRunning(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-red-950 border-red-500 text-red-200'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        tallyConnected={tallyConnected}
        activeCompanyName={activeCompanyName}
        config={config}
        onOpenSettings={() => setShowSettings(true)}
        onOpenBatch={() => setShowBatch(true)}
        onOpenSampleBills={() => setShowSampleModal(true)}
        onExportAllXml={() => handleBatchExportXml(bills)}
        onExportAllExcel={() => handleBatchExportExcel(bills)}
        onRefreshTally={() => checkTallyConnection()}
        isRefreshingTally={isRefreshingTally}
        totalBills={bills.length}
        syncedBills={bills.filter(b => b.status === 'synced').length}
      />

      {/* Workspace Area: Sidebar + Split Viewer/Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Bill Inbox */}
        <Sidebar
          bills={bills}
          selectedBillId={selectedBillId}
          onSelectBill={(id) => setSelectedBillId(id)}
          onUploadClick={() => {}}
          onDeleteBill={handleDeleteBill}
          onFileInputChange={(e) => handleFileUpload(e.target.files)}
        />

        {/* Center/Right Split Screen */}
        {selectedBill ? (
          <main className="flex-1 flex overflow-hidden">
            {/* Split Screen Left: Zoomable Bill Image Viewer */}
            <div className="w-1/2 h-full flex flex-col">
              <ImageViewer
                imageUrl={selectedBill.imageUrl}
                fileName={selectedBill.fileName}
              />
            </div>

            {/* Split Screen Right: Bill Form & Line Item Editor */}
            <div className="w-1/2 h-full flex flex-col">
              <BillEditor
                bill={selectedBill}
                config={config}
                tallyLedgers={tallyLedgers}
                onUpdateBill={handleUpdateBill}
                onPushToTally={handlePushToTally}
                onExportXml={handleExportXml}
                onExportExcel={handleExportExcel}
                onRerunOcr={(b) => runOcrOnBill(b, b.imageUrl)}
                onCreatePartyInTally={handleCreatePartyInTally}
                isPushing={isPushing}
                isOcrRunning={isOcrRunning}
              />
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p className="text-sm">Select or upload a bill to begin</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          config={config}
          onSaveConfig={(newConfig) => setConfig(newConfig)}
          onTestConnection={(testConf) => new TallyService(testConf).testConnection()}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showBatch && (
        <BatchProcessor
          bills={bills}
          onClose={() => setShowBatch(false)}
          onBatchPushToTally={handleBatchPushToTally}
          onBatchExportXml={handleBatchExportXml}
          onBatchExportExcel={handleBatchExportExcel}
          onBatchOcr={handleBatchOcr}
          isPushing={isPushing}
          isOcrRunning={isOcrRunning}
        />
      )}

      {showSampleModal && (
        <SampleBillsModal
          onSelectSample={handleSelectSample}
          onClose={() => setShowSampleModal(false)}
        />
      )}
    </div>
  );
};

export default App;
