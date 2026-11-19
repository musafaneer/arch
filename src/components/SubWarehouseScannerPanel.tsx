import React, { useState, useEffect } from "react";
import { 
  Scan, 
  Cpu, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sliders, 
  Activity, 
  MapPin, 
  HardDrive, 
  RefreshCw, 
  Terminal, 
  Sparkles, 
  Check, 
  Info,
  ChevronDown,
  Building2,
  Zap,
  SlidersHorizontal,
  FolderArchive
} from "lucide-react";
import { 
  HardwareScannerDevice, 
  SubWarehouseLocation, 
  ScannerProtocol, 
  ScannerFeederType, 
  ScannerColorMode, 
  ScannerResolutionDpi, 
  ScannerPageSize,
  SubWarehouseOriginInfo,
  ScannerHardwareMetadata,
  TwainScanJobResponse
} from "../types";

interface SubWarehouseScannerPanelProps {
  onPagesAcquired: (
    newPages: Array<{ id: string; name: string; base64: string }>,
    origin: SubWarehouseOriginInfo,
    hardwareMeta: ScannerHardwareMetadata
  ) => void;
  isBusy: boolean;
}

export const SubWarehouseScannerPanel: React.FC<SubWarehouseScannerPanelProps> = ({
  onPagesAcquired,
  isBusy
}) => {
  // Warehouses and Devices State
  const [warehouses, setWarehouses] = useState<SubWarehouseLocation[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [scanners, setScanners] = useState<HardwareScannerDevice[]>([]);
  const [selectedScannerId, setSelectedScannerId] = useState<string>("");
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);

  // Hardware Scanning Parameters
  const [protocol, setProtocol] = useState<ScannerProtocol>("TWAIN");
  const [feederType, setFeederType] = useState<ScannerFeederType>("ADF_SIMPLEX");
  const [dpi, setDpi] = useState<ScannerResolutionDpi>(300);
  const [colorMode, setColorMode] = useState<ScannerColorMode>("COLOR_24BIT");
  const [pageSize, setPageSize] = useState<ScannerPageSize>("A4");
  const [pageCountToScan, setPageCountToScan] = useState<number>(3);

  // Hardware Optical & Sensor Toggles
  const [autoDeskew, setAutoDeskew] = useState<boolean>(true);
  const [blankPageSkip, setBlankPageSkip] = useState<boolean>(true);
  const [holePunchRemoval, setHolePunchRemoval] = useState<boolean>(true);
  const [ultrasonicMultiFeed, setUltrasonicMultiFeed] = useState<boolean>(true);

  // Sub-Warehouse Physical Storage Coordinates
  const [hallName, setHallName] = useState<string>("");
  const [rackNumber, setRackNumber] = useState<string>("رف 03-B");
  const [boxNumber, setBoxNumber] = useState<string>("صندوق 142");
  const [operatorName, setOperatorName] = useState<string>("م. فرج الورفلي (أمين مستودع)");

  // Diagnostic Test & Live Execution State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>("");
  const [diagnosticResult, setDiagnosticResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    logs: string[];
    responseTimeMs?: number;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [showDriverConsole, setShowDriverConsole] = useState<boolean>(false);
  const [activeDriverLogs, setActiveDriverLogs] = useState<string[]>([]);

  // Load Sub-Warehouses and Connected Scanner Devices
  useEffect(() => {
    loadHardwareInfrastructure();
  }, []);

  const loadHardwareInfrastructure = async () => {
    setIsLoadingDevices(true);
    try {
      // 1. Fetch Sub-Warehouses
      const whRes = await fetch("/api/scanner/warehouses");
      const whData = await whRes.json();
      if (whData.success && Array.isArray(whData.warehouses)) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0) {
          const firstWh = whData.warehouses[0];
          setSelectedWarehouseId(firstWh.id);
          setHallName(firstWh.halls?.[0] || "قاعة المحفوظات المركزية");
        }
      }

      // 2. Fetch Scanner Devices
      const devRes = await fetch("/api/scanner/devices");
      const devData = await devRes.json();
      if (devData.success && Array.isArray(devData.devices)) {
        setScanners(devData.devices);
        if (devData.devices.length > 0) {
          const defaultDev = devData.devices.find((d: any) => d.isDefault) || devData.devices[0];
          setSelectedScannerId(defaultDev.id);
          setProtocol(defaultDev.protocol);
        }
      }
    } catch (err) {
      console.error("Failed to load scanner infrastructure:", err);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  // Sync protocol and capabilities when selected scanner changes
  const handleScannerChange = (scannerId: string) => {
    setSelectedScannerId(scannerId);
    const scanner = scanners.find((s) => s.id === scannerId);
    if (scanner) {
      setProtocol(scanner.protocol);
      if (!scanner.supportsDuplex && feederType === "ADF_DUPLEX") {
        setFeederType("ADF_SIMPLEX");
      }
      if (!scanner.supportsFlatbed && feederType === "FLATBED") {
        setFeederType("ADF_SIMPLEX");
      }
    }
  };

  // Sync hall name when selected warehouse changes
  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouseId(whId);
    const wh = warehouses.find((w) => w.id === whId);
    if (wh) {
      if (wh.halls && wh.halls.length > 0) {
        setHallName(wh.halls[0]);
      }
      // If warehouse has a specific scanner, prefer it
      if (wh.defaultScannerId) {
        handleScannerChange(wh.defaultScannerId);
      }
    }
  };

  // Run hardware diagnostic test / handshake ping
  const handleTestConnection = async () => {
    if (!selectedScannerId) return;
    setIsTestingConnection(true);
    try {
      const res = await fetch("/api/scanner/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannerId: selectedScannerId })
      });
      const data = await res.json();
      if (data.success) {
        setDiagnosticResult({
          tested: true,
          success: true,
          message: `تم التحقق بنجاح من جهاز الماسح عبر بروتوكول [${data.protocol}] في زمن استجابة ${data.responseTimeMs}ms. مستشعر التغذية ADF جاهز ومضبوط.`,
          logs: data.driverLog || [],
          responseTimeMs: data.responseTimeMs
        });
        setActiveDriverLogs(data.driverLog || []);
      } else {
        setDiagnosticResult({
          tested: true,
          success: false,
          message: data.error || "فشل الاتصال بجهاز الماسح الضوئي",
          logs: []
        });
      }
    } catch (err: any) {
      setDiagnosticResult({
        tested: true,
        success: false,
        message: `خطأ في اتصال السائق: ${err.message}`,
        logs: []
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Trigger Hardware Scan Acquisition Job via TWAIN / WIA
  const handleStartHardwareScan = async () => {
    if (!selectedScannerId || !selectedWarehouseId) return;

    setIsScanning(true);
    setScanProgress(10);
    setScanStatusMessage(`جاري تهيئة مدير مصادر السائق [${protocol} DSM v2.4]...`);
    setActiveDriverLogs([
      `[TWAIN_INIT] Connecting to Data Source Manager for device ID [${selectedScannerId}]...`,
      `[TWAIN_DS] Negotiating capabilities: Resolution=${dpi}DPI, PixelType=${colorMode}, Feeder=${feederType}`
    ]);

    try {
      // Step 1: Engage Feeder Motor
      await new Promise((r) => setTimeout(r, 400));
      setScanProgress(30);
      setScanStatusMessage("تشغيل محرك التغذية الآلية (ADF) واستشعار الورق بالموجات فوق الصوتية...");

      // Step 2: Call backend acquisition API
      const requestPayload = {
        scannerId: selectedScannerId,
        protocol,
        feederType,
        dpi,
        colorMode,
        pageSize,
        pageCountToScan,
        autoDeskew,
        blankPageSkip,
        holePunchRemoval,
        ultrasonicMultiFeed,
        subWarehouseId: selectedWarehouseId,
        hallName,
        rackNumber,
        boxNumber
      };

      const res = await fetch("/api/scanner/acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });

      setScanProgress(65);
      setScanStatusMessage("نقل البيانات الضوئية عبر الذاكرة المباشرة (Direct Memory Transfer)...");

      const json: TwainScanJobResponse = await res.json();

      if (!json.success || !json.pages) {
        throw new Error(json.error || "فشل في عملية سحب الصفحات من الماسح الضوئي");
      }

      setScanProgress(90);
      setScanStatusMessage("تطبيق تصحيح الميل وتوليد بيانات المستودع الفرعي الرقمية...");
      await new Promise((r) => setTimeout(r, 350));

      setActiveDriverLogs(json.hardwareTelemetry.driverHandshakeLog);

      const targetWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || json.subWarehouse;
      const originInfo: SubWarehouseOriginInfo = {
        warehouseId: targetWarehouse.id,
        warehouseCode: targetWarehouse.code,
        warehouseName: targetWarehouse.name,
        city: targetWarehouse.city,
        hallName: hallName || targetWarehouse.halls[0] || "قاعة المحفوظات",
        rackNumber: rackNumber || "رف 01-A",
        boxNumber: boxNumber || "صندوق 101",
        operatorName: operatorName || "أمين المستودع الفرعي",
        operatorBadge: "MOF-ARCH-OP",
        archivedAtSubWarehouseTime: new Date().toISOString()
      };

      const hardwareMeta: ScannerHardwareMetadata = {
        scannerId: json.scanner.id,
        scannerName: json.scanner.name,
        vendor: json.scanner.vendor,
        protocol: json.hardwareTelemetry.protocol,
        driverVersion: json.scanner.driverVersion,
        feederType,
        resolutionDpi: dpi,
        colorMode,
        pageSize,
        autoDeskewApplied: autoDeskew,
        ultrasonicDoubleFeedChecked: ultrasonicMultiFeed,
        blankPageSkippedCount: json.hardwareTelemetry.blankPagesFiltered,
        holePunchRemoved: holePunchRemoval,
        hardwareSessionId: json.jobId,
        scanDurationMs: json.hardwareTelemetry.scanDurationMs
      };

      // Formulate standard ScannedPage array
      const mappedPages = json.pages.map((p) => ({
        id: p.id,
        name: p.name,
        base64: p.base64
      }));

      setScanProgress(100);
      setScanStatusMessage(`تم سحب ${json.pagesAcquired} صفحة بنجاح من جهاز [${json.scanner.name}]!`);

      // Dispatch to parent scanner pipeline
      onPagesAcquired(mappedPages, originInfo, hardwareMeta);
    } catch (err: any) {
      console.error("Hardware scan error:", err);
      setScanStatusMessage(`خطأ أثناء المسح: ${err.message}`);
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        setScanProgress(0);
        setScanStatusMessage("");
      }, 3500);
    }
  };

  const selectedScanner = scanners.find((s) => s.id === selectedScannerId);
  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  return (
    <div className="space-y-6">
      {/* TOP BANNER: Sub-Warehouse & TWAIN/WIA Protocol Architecture */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-2xl p-5 border border-emerald-700/40 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Scan className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white font-['Amiri',serif]">
                  منظومة الربط المباشر بأجهزة الماسح الضوئي (TWAIN / WIA)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Hardware Bus v2.4
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                رقمنة وثائق المستودعات الفرعية ومراكز الحفظ الإقليمية عبر السحب الآلي من وحدة التغذية (ADF) واللوح الزجاجي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection || isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold border border-emerald-600/50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? "animate-spin" : ""}`} />
              <span>فحص السائق والاتصال</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDriverConsole(!showDriverConsole)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>سجل السائق (DSM Log)</span>
            </button>
          </div>
        </div>

        {/* Live Diagnostics Card if triggered */}
        {diagnosticResult && (
          <div className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            diagnosticResult.success 
              ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-200" 
              : "bg-rose-900/40 border-rose-500/50 text-rose-200"
          }`}>
            {diagnosticResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold">{diagnosticResult.message}</span>
              {diagnosticResult.responseTimeMs && (
                <span className="block text-[11px] text-slate-300 mt-0.5 font-mono">
                  بروتوكول السائق: {protocol} | التوافق: معتمد رسمياً لدولة ليبيا
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDiagnosticResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* DRIVER CONSOLE DRAWER (if toggled) */}
      {showDriverConsole && (
        <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              سجل أحداث السائق العتادي (TWAIN DSM / WIA Driver Pipeline)
            </span>
            <span className="text-[10px] text-slate-500">حالة السائق: DSM_STATE_ENABLED</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 py-1 pr-1 text-slate-300 dir-ltr text-left">
            {activeDriverLogs.length > 0 ? (
              activeDriverLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-emerald-500">›</span> {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">لا توجد رسائل مسجلة حالياً. انقر "فحص السائق والاتصال" لبدء الاختبار.</div>
            )}
          </div>
        </div>
      )}

      {/* TWO COLUMN GRID: 1) Sub-Warehouse Physical Registry, 2) Hardware & Driver Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* SECTION 1: Sub-Warehouse Regional Branch & Storage Location */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-700" />
              <h4 className="font-bold text-sm text-slate-800">
                1. تحديد المستودع الفرعي وموقع الحفظ المادي
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              ربط الأصل الورقي بالرمز المشفر
            </span>
          </div>

          {/* Sub-Warehouse Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>المستودع الفرعي التابع لوزارة المالية:</span>
              {selectedWarehouse && (
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedWarehouse.code} ({selectedWarehouse.region})
                </span>
              )}
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-xs"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} - ({wh.city})
                </option>
              ))}
            </select>
            {selectedWarehouse && (
              <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedWarehouse.address}</span>
              </div>
            )}
          </div>

          {/* Physical Coordinates Inside Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                القاعة / العنبر:
              </label>
              <select
                value={hallName}
                onChange={(e) => setHallName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
              >
                {selectedWarehouse?.halls?.map((hall) => (
                  <option key={hall} value={hall}>
                    {hall}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                رقم الرف المعدني:
              </label>
              <input
                type="text"
                value={rackNumber}
                onChange={(e) => setRackNumber(e.target.value)}
                placeholder="مثال: رف 04-B"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                رقم الصندوق الأرشيفي:
              </label>
              <input
                type="text"
                value={boxNumber}
                onChange={(e) => setBoxNumber(e.target.value)}
                placeholder="مثال: صندوق 118"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Operator name in sub-warehouse */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              اسم أمين المستودع / القائم بالرقمنة:
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="اسم الموظف المشرف على الماسح"
              className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Warehouse Capacity & Status Indicator */}
          {selectedWarehouse && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-800" />
                <span className="text-slate-700">
                  إشغال المستودع: <strong>{selectedWarehouse.storedCount}</strong> من أصل {selectedWarehouse.capacityBoxes} صندوق
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {selectedWarehouse.activeScannersCount} أجهزة ماسح نشطة
              </span>
            </div>
          )}
        </div>

        {/* SECTION 2: Scanner Hardware Device & TWAIN/WIA Protocol Controls */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-700" />
              <h4 className="font-bold text-sm text-slate-800">
                2. إعدادات جهاز الماسح وبروتوكول السحب
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setProtocol("TWAIN")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  protocol === "TWAIN"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                بروتوكول TWAIN
              </button>
              <button
                type="button"
                onClick={() => setProtocol("WIA")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  protocol === "WIA"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                بروتوكول WIA 2.0
              </button>
            </div>
          </div>

          {/* Scanner Device Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>جهاز الماسح الضوئي المكتشف في المحطة:</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                جاهز ومتصل
              </span>
            </label>
            <select
              value={selectedScannerId}
              onChange={(e) => handleScannerChange(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-xs"
            >
              {scanners.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} - ({sc.connectionType}) [{sc.protocol}]
                </option>
              ))}
            </select>
            {selectedScanner && (
              <div className="mt-1.5 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>السائق: {selectedScanner.driverFile}</span>
                <span>الحساس: {selectedScanner.opticalSensor}</span>
              </div>
            )}
          </div>

          {/* Scanning Source / Feeder & DPI Resolution */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                مصدر التغذية الورقية:
              </label>
              <select
                value={feederType}
                onChange={(e) => setFeederType(e.target.value as ScannerFeederType)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
              >
                <option value="ADF_SIMPLEX">تلقائي (ADF وجه واحد)</option>
                <option value="ADF_DUPLEX">تلقائي مزدوج (ADF وجهين)</option>
                <option value="FLATBED">اللوح الزجاجي (Flatbed)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                دقة المسح (DPI):
              </label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value) as ScannerResolutionDpi)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
              >
                <option value={150}>150 DPI (معاينة وسرعة)</option>
                <option value={200}>200 DPI (مسودات إدارية)</option>
                <option value={300}>300 DPI (المعيار الوطني للأرشفة)</option>
                <option value={600}>600 DPI (دقة فائقة للأختام القديمة)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                نظام الألوان:
              </label>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ScannerColorMode)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
              >
                <option value="COLOR_24BIT">ألوان حقيقية 24-بت</option>
                <option value="GRAYSCALE_8BIT">تدرج رمادي 8-بت</option>
                <option value="BW_1BIT">أبيض وأسود ثنائي (B&W)</option>
              </select>
            </div>
          </div>

          {/* Number of Pages & Paper Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                عدد صفحات الدفعة للسحب:
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPageCountToScan(num)}
                    className={`flex-1 py-1 text-xs font-bold rounded-md border transition cursor-pointer ${
                      pageCountToScan === num
                        ? "bg-emerald-700 text-white border-emerald-800"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                قياس الورق:
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as ScannerPageSize)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Legal">Legal (العقود القانونية)</option>
                <option value="A3">A3 (الموازنات والخرائط)</option>
                <option value="Custom">تحديد تلقائي للأبعاد (Auto Crop)</option>
              </select>
            </div>
          </div>

          {/* Hardware Optical Enhancement Toggles */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-600 mb-2">
              التحسينات العتادية المباشرة على مستوى السائق (Hardware Driver Filters):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 cursor-pointer hover:bg-emerald-50/50">
                <input
                  type="checkbox"
                  checked={autoDeskew}
                  onChange={(e) => setAutoDeskew(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>تعديل الميل تلقائياً (Deskew)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 cursor-pointer hover:bg-emerald-50/50">
                <input
                  type="checkbox"
                  checked={blankPageSkip}
                  onChange={(e) => setBlankPageSkip(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>حذف الصفحات الفارغة</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 cursor-pointer hover:bg-emerald-50/50">
                <input
                  type="checkbox"
                  checked={holePunchRemoval}
                  onChange={(e) => setHolePunchRemoval(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>إزالة ثقوب الدوسيهات</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 cursor-pointer hover:bg-emerald-50/50">
                <input
                  type="checkbox"
                  checked={ultrasonicMultiFeed}
                  onChange={(e) => setUltrasonicMultiFeed(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>سونار منع السحب المزدوج</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION PANEL: Start Scanning Button & Real-time Feeder Telemetry */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
        {isScanning ? (
          <div className="w-full max-w-md space-y-3 py-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>{scanStatusMessage}</span>
              </span>
              <span className="font-mono text-emerald-700">{scanProgress}%</span>
            </div>

            {/* Scanning Progress Bar */}
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>سحب الأوراق جارٍ من وحدة {feederType.startsWith("ADF") ? "التغذية الآلية ADF" : "اللوح الزجاجي"}...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartHardwareScan}
                disabled={isScanning || isBusy || !selectedScannerId}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                <span>بدء السحب المباشر عبر {protocol} ({pageCountToScan} صفحات من {selectedWarehouse?.code})</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              سيتم نقل الصفحات مباشرة من مستودع <strong>{selectedWarehouse?.name}</strong> إلى شريط المعاينة والتدقيق مع بصمة التشفير السيادية.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
