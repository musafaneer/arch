import React, { useState, useRef, useEffect } from "react";
import { 
  Scan, 
  Upload, 
  Camera, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Check, 
  RotateCw, 
  RotateCcw, 
  ShieldAlert, 
  Building, 
  Calendar, 
  DollarSign, 
  ZoomIn, 
  ZoomOut, 
  SlidersHorizontal, 
  Eye, 
  Clipboard, 
  Zap, 
  RefreshCw, 
  Stamp, 
  Layers, 
  QrCode, 
  FileCheck2, 
  History, 
  Printer, 
  Plus, 
  Trash2, 
  Building2, 
  Share2, 
  FilePlus2, 
  Settings2, 
  ChevronRight, 
  Sliders, 
  HelpCircle,
  Hash
} from "lucide-react";
import { 
  ArchivedDocument, 
  LibyanEra, 
  DepartmentType, 
  DocumentType, 
  SecurityClassification, 
  OcrProcessingMetrics,
  SubWarehouseOriginInfo,
  ScannerHardwareMetadata 
} from "../types";
import { sampleScannableDocuments } from "../data/historicalDocuments";
import { OcrVerificationEditor } from "./OcrVerificationEditor";
import { SubWarehouseScannerPanel } from "./SubWarehouseScannerPanel";

interface PaperlessScannerProps {
  onDocumentArchived: (doc: ArchivedDocument) => void;
  onCancel?: () => void;
}

interface ScannedPage {
  id: string;
  name: string;
  base64: string;
}

// Preset Quick Categories for Simplified Ministerial Scanning
const QUICK_DOC_PRESETS: Array<{
  type: DocumentType;
  label: string;
  icon: string;
  defaultDept: DepartmentType;
  defaultClassification: SecurityClassification;
}> = [
  {
    type: "إذن صرف خزانة عامة",
    label: "إذن صرف خزانة",
    icon: "💵",
    defaultDept: "إدارة الخزانة العامة",
    defaultClassification: "سري ومحدود"
  },
  {
    type: "قرار وزاري",
    label: "قرار وزاري مالي",
    icon: "📜",
    defaultDept: "إدارة الميزانية العامة والتخطيط المالي",
    defaultClassification: "عام"
  },
  {
    type: "سندات خزانة وقرض عام",
    label: "سند / صك مالي",
    icon: "💳",
    defaultDept: "إدارة الدين العام والالتزامات المالية",
    defaultClassification: "سري للغاية"
  },
  {
    type: "إقرار وتخليص جمركي",
    label: "إقرار جمركي / ضريبي",
    icon: "📦",
    defaultDept: "مصلحة الجمارك الليبية",
    defaultClassification: "محدود"
  },
  {
    type: "قانون الميزانية التقديرية",
    label: "ميزانية وتقديرات",
    icon: "📊",
    defaultDept: "إدارة الميزانية العامة والتخطيط المالي",
    defaultClassification: "سري"
  },
  {
    type: "كشف مرتبات وعلاوات ديوانية",
    label: "كشف مرتبات واستحقاق",
    icon: "👥",
    defaultDept: "إدارة الحسابات والرقابة المالية",
    defaultClassification: "محدود"
  }
];

export const PaperlessScanner: React.FC<PaperlessScannerProps> = ({
  onDocumentArchived,
  onCancel
}) => {
  // Experience Mode: "simple" (المسح السريع الميسر) vs "advanced" (المسح المتقدم والتدقيق الجنائي)
  const [scannerExperience, setScannerExperience] = useState<"simple" | "advanced">("simple");

  // Ingestion Modes: TWAIN/WIA Direct Scanner (المستودعات الفرعية) vs Upload vs Camera vs Samples
  const [activeMode, setActiveMode] = useState<"twain_wia" | "upload" | "camera" | "samples">("twain_wia");
  const [selectedSampleId, setSelectedSampleId] = useState<string>("sample-1");
  const [titleHint, setTitleHint] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Sub-Warehouse & TWAIN/WIA Hardware Ingestion Metadata
  const [subWarehouseOrigin, setSubWarehouseOrigin] = useState<SubWarehouseOriginInfo | undefined>(undefined);
  const [scannerHardwareInfo, setScannerHardwareInfo] = useState<ScannerHardwareMetadata | undefined>(undefined);

  // Multi-Page Batch Scanning
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Quick Preset Category & Organizational Unit Linkage
  const [selectedPresetType, setSelectedPresetType] = useState<DocumentType>("إذن صرف خزانة عامة");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("إدارة الخزانة العامة");
  const [selectedClassification, setSelectedClassification] = useState<SecurityClassification>("سري ومحدود");
  const [orgUnitsList, setOrgUnitsList] = useState<string[]>([]);

  // Optical Filters & Adjustments
  const [preScanFilter, setPreScanFilter] = useState<"normal" | "clean" | "binarized" | "greyscale" | "vintage">("clean");
  const [preScanZoom, setPreScanZoom] = useState<number>(100);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Live Camera Web Stream States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Processing Pipeline States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [extractedData, setExtractedData] = useState<ArchivedDocument | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(98);
  const [ocrMetrics, setOcrMetrics] = useState<OcrProcessingMetrics | undefined>(undefined);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Session archive counter & last scanned documents
  const [sessionScannedDocs, setSessionScannedDocs] = useState<ArchivedDocument[]>([]);
  const [lastArchivedSlip, setLastArchivedSlip] = useState<ArchivedDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Simplified scanning steps
  const steps = [
    { title: "المسح والاستشعار البصري 600 DPI", desc: "اكتشاف الهوامش وضبط الإضاءة والتباين التلقائي" },
    { title: "عزل الحبر والترميم الرقمي", desc: "توضيح الخط العربي والسطور الباهتة والأختام السيادية" },
    { title: "التعرف الضوئي على الحروف (OCR)", desc: "استخراج النصوص والمبالغ والتواريخ بدقة فائقة" },
    { title: "الفهرسة السيادية وتوليد الباركود", desc: "توليد المعرف الوطني المشفر ومطابقة معيار ISAD(G)" }
  ];

  // Load Organizational Units dynamically to link scanned documents directly with the ministry structure
  useEffect(() => {
    fetch("/api/org-units")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.units)) {
          const names = data.units.map((u: any) => u.name);
          setOrgUnitsList(names);
          if (names.length > 0 && !names.includes(selectedDepartment)) {
            setSelectedDepartment(names[0]);
          }
        }
      })
      .catch(() => {
        // Fallback default list
        setOrgUnitsList([
          "إدارة الخزانة العامة",
          "إدارة الميزانية العامة والتخطيط المالي",
          "إدارة الحسابات والرقابة المالية",
          "إدارة الدين العام والالتزامات المالية",
          "مصلحة الجمارك الليبية",
          "مصلحة الضرائب",
          "ديوان وزارة المالية"
        ]);
      });
  }, []);

  // Support direct Ctrl+V clipboard paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              const newPage: ScannedPage = {
                id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: `مستند_ملصوق_${new Date().toLocaleTimeString("ar-LY").replace(/:/g, "-")}.png`,
                base64: reader.result as string
              };
              setPages((prev) => [...prev, newPage]);
              setActivePageIndex(pages.length);
              setActiveMode("upload");
              setRotationAngle(0);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
      stopCamera();
    };
  }, [pages.length]);

  // Stop camera tracks helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start live webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("المتصفح لا يدعم الوصول المباشر لكاميرا الويب");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start failed, falling back:", err);
      setCameraError(err.message || "تعذر الوصول إلى الكاميرا. يمكنك استخدام رفع الصور أو العينات الجاهزة.");
      setIsCameraActive(false);
    }
  };

  // Capture still frame from live webcam
  const captureFrameFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
      const newPage: ScannedPage = {
        id: `cam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `مسح_ميداني_كاميرا_${Date.now().toString().slice(-4)}.jpg`,
        base64: dataUrl
      };
      setPages((prev) => [...prev, newPage]);
      setActivePageIndex(pages.length);
      stopCamera();
      setActiveMode("upload");
      setRotationAngle(0);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newPagesList: ScannedPage[] = [];

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPagesList.push({
          id: `file-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          base64: reader.result as string
        });

        if (newPagesList.length === files.length) {
          setPages((prev) => [...prev, ...newPagesList]);
          setActivePageIndex(pages.length);
          if (!titleHint && files[0]) {
            setTitleHint(files[0].name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDeletePage = (indexToDelete: number) => {
    const updated = pages.filter((_, i) => i !== indexToDelete);
    setPages(updated);
    if (activePageIndex >= updated.length) {
      setActivePageIndex(Math.max(0, updated.length - 1));
    }
  };

  const currentPage = pages[activePageIndex] || null;

  // Filter styles
  const getPreScanFilterClass = () => {
    switch (preScanFilter) {
      case "clean":
        return "contrast-125 brightness-105 saturate-75";
      case "binarized":
        return "grayscale contrast-[250%] brightness-95";
      case "greyscale":
        return "grayscale contrast-110";
      case "vintage":
        return "sepia-[0.35] contrast-110 brightness-100";
      default:
        return "";
    }
  };

  // Core scanning runner (can run in auto-archive mode or inspect mode)
  const runScanningPipeline = async (autoArchiveDirectly: boolean = false) => {
    setIsProcessing(true);
    setCurrentStepIndex(0);
    setErrorNotice(null);
    setExtractedData(null);
    setLastArchivedSlip(null);

    // Visual step sequence
    for (let i = 0; i < 3; i++) {
      setCurrentStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 380));
    }

    try {
      let payload: any = {
        titleHint: titleHint || undefined,
        fileName: currentPage?.name || undefined,
        presetDocType: selectedPresetType,
        presetDepartment: selectedDepartment
      };

      if (activeMode === "samples") {
        const sample = sampleScannableDocuments.find((s) => s.id === selectedSampleId);
        payload.titleHint = sample?.name;
        payload.textInput = sample?.previewText;
        payload.scanPresetId = sample?.id;
      } else if (currentPage) {
        payload.imageBase64 = currentPage.base64;
      } else if (activeMode === "camera") {
        payload.titleHint = "مسح كاميرا ميدانية - قيد مالي عاجل";
        payload.textInput = "محضر جرد خزينة ومطابقة القيود الدفترية المعتمدة لوزارة المالية.";
      }

      // Call dedicated OCR API
      const res = await fetch("/api/archive/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      setCurrentStepIndex(3);
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (json.success && json.data) {
        const d = json.data;
        const pageCount = Math.max(1, pages.length);
        const resolvedTitle = d.title || titleHint || `${selectedPresetType} - قيد رقم ${Math.floor(100 + Math.random() * 900)}`;

        const physicalLocation = subWarehouseOrigin 
          ? `المستودع الفرعي: ${subWarehouseOrigin.warehouseName} (${subWarehouseOrigin.warehouseCode}) - ${subWarehouseOrigin.hallName} - ${subWarehouseOrigin.rackNumber} - ${subWarehouseOrigin.boxNumber}`
          : (d.storageLocation || `المستودع الوطني للأرشيف المالي - قاعة طرابلس - رف ${Math.floor(1 + Math.random() * 15)} - علبة ${Math.floor(100 + Math.random() * 300)}`);

        const newDoc: ArchivedDocument = {
          id: `doc-ocr-${Date.now()}`,
          refNumber: d.refNumber || `و.م.ل/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          title: resolvedTitle,
          era: (d.era as LibyanEra) || "دولة ليبيا الحديثة (2011 - الآن)",
          department: (selectedDepartment as DepartmentType) || (d.department as DepartmentType) || "إدارة الخزانة العامة",
          docType: selectedPresetType || (d.docType as DocumentType) || "إذن صرف خزانة عامة",
          classification: selectedClassification || (d.classification as SecurityClassification) || "سري ومحدود",
          gregorianDate: d.gregorianDate || `${new Date().getFullYear()} م`,
          hijriDate: d.hijriDate || "1445 هـ",
          year: parseInt(d.gregorianDate?.match(/\d{4}/)?.[0] || `${new Date().getFullYear()}`, 10),
          financialAmount: d.financialAmount || "غير محدد",
          currency: d.currency || "دينار ليبي",
          signatories: d.signatories && d.signatories.length > 0 ? d.signatories : ["وكيل وزارة المالية", "أمين الخزانة"],
          stampsDetected: d.stampsDetected && d.stampsDetected.length > 0 ? d.stampsDetected : ["خاتم وزارة المالية السيادي"],
          ocrText: d.ocrText || "",
          summary: d.summary || `وثيقة ممسوحة ضوئياً ومؤرشفة إلكترونياً لصالح [${selectedDepartment}].`,
          keywords: d.keywords && d.keywords.length > 0 ? d.keywords : ["وزارة المالية", selectedDepartment, selectedPresetType],
          storageLocation: physicalLocation,
          subWarehouseOrigin: subWarehouseOrigin,
          scannerHardwareInfo: scannerHardwareInfo,
          barcode: `LY-OCR-${Math.floor(100000 + Math.random() * 900000)}`,
          qrCodeVerificationId: `ARCH-OCR-${Date.now().toString(36).toUpperCase()}`,
          status: "مؤرشفة ومعتمدة",
          scanQuality: "أصلي عالي الدقة (OCR مُدقق)",
          pageCount: pageCount,
          physicalCondition: "ممتازة",
          isRestricted: (selectedClassification || "").includes("سري"),
          paperlessVerified: true,
          historicalSealType: "treasury",
          auditLog: [
            {
              id: `log-ocr-${Date.now()}`,
              timestamp: new Date().toLocaleString("ar-LY"),
              user: scannerHardwareInfo 
                ? `ماسح عتادي [${scannerHardwareInfo.protocol}] - (${scannerHardwareInfo.scannerName})`
                : "محرك التعرف الضوئي والمسح الذكي (OCR Studio)",
              action: scannerHardwareInfo 
                ? `رقمنة ومسح ضوئي مباشر عبر بروتوكول ${scannerHardwareInfo.protocol}`
                : "مسح ضوئي واستخراج نصوص وفهرسة آلية",
              note: subWarehouseOrigin && scannerHardwareInfo
                ? `تم السحب المباشر من [${subWarehouseOrigin.warehouseName}] بواسطة [${scannerHardwareInfo.scannerName}] بدقة ${scannerHardwareInfo.resolutionDpi} DPI وإيداع الأصل في [${subWarehouseOrigin.hallName} - ${subWarehouseOrigin.rackNumber} - ${subWarehouseOrigin.boxNumber}]`
                : `تم المسح بنجاح، وربط الوثيقة بالإدارة [${selectedDepartment}] واستخراج النصوص بدقة ${json.metrics?.confidence || 98}%`
            }
          ]
        };

        setExtractedData(newDoc);
        setConfidenceScore(json.metrics?.confidence || d.confidence || 98);
        if (json.metrics) {
          setOcrMetrics(json.metrics);
        }

        // If user chose 1-Click Fast Archive, commit immediately
        if (autoArchiveDirectly) {
          onDocumentArchived(newDoc);
          setSessionScannedDocs((prev) => [newDoc, ...prev]);
          setLastArchivedSlip(newDoc);
        }
      } else {
        throw new Error(json.error || "تعذر إتمام التعرف الضوئي على الوثيقة");
      }
    } catch (err: any) {
      console.error(err);
      setErrorNotice(err.message || "حدث خطأ أثناء التعرف الضوئي على الحروف");
    } finally {
      setIsProcessing(false);
    }
  };

  // Finalize after review in OcrVerificationEditor
  const handleSaveOcrData = (updated: any) => {
    if (!extractedData) return;

    const committedDoc: ArchivedDocument = {
      ...extractedData,
      ocrText: updated.ocrText,
      title: updated.title,
      refNumber: updated.refNumber,
      financialAmount: updated.financialAmount,
      currency: updated.currency,
      keywords: updated.keywords,
      department: updated.department,
      era: updated.era,
      docType: updated.docType,
      classification: updated.classification,
      gregorianDate: updated.gregorianDate,
      hijriDate: updated.hijriDate,
      summary: updated.summary,
      signatories: updated.signatories,
      stampsDetected: updated.stampsDetected,
      auditLog: [
        {
          id: `log-edit-${Date.now()}`,
          timestamp: new Date().toLocaleString("ar-LY"),
          user: "أخصائي الأرشفة الرقمية",
          action: "تدقيق واعتماد نهائي لبيانات الـ OCR",
          note: "تم تدقيق نصوص الوثيقة والمبالغ المستخرجة وإيداعها في السجل المالي"
        },
        ...extractedData.auditLog
      ]
    };

    onDocumentArchived(committedDoc);
    setSessionScannedDocs((prev) => [committedDoc, ...prev]);
    setLastArchivedSlip(committedDoc);
    setIsEditorOpen(false);
    setExtractedData(null);
  };

  const handleResetForNewScan = () => {
    setExtractedData(null);
    setLastArchivedSlip(null);
    setPages([]);
    setActivePageIndex(0);
    setTitleHint("");
    setRotationAngle(0);
    setIsEditorOpen(false);
    setErrorNotice(null);
    setSubWarehouseOrigin(undefined);
    setScannerHardwareInfo(undefined);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-right">
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP HEADER & EXPERIENCE TOGGLE */}
      <div className="bg-gradient-to-l from-[#0f2d1e] via-[#143d28] to-[#0c2418] text-white p-5 sm:p-6 border-b border-amber-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-['Amiri',serif] text-amber-100">
                  منظومة المسح الضوئي والأرشفة الفورية
                </h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  600 DPI Auto-OCR
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                تحويل وتفريغ الوثائق المالية والمراسلات الرسمية إلى سجلات رقمية موثوقة ومطابقة لمعايير ديوان المحاسبة
              </p>
            </div>
          </div>

          {/* Mode Switcher: Simple vs Advanced */}
          <div className="flex items-center gap-2 bg-emerald-950/80 p-1 rounded-xl border border-emerald-700/60 text-xs">
            <button
              onClick={() => setScannerExperience("simple")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                scannerExperience === "simple"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>المسح السريع الميسر (1-Click)</span>
            </button>

            <button
              onClick={() => setScannerExperience("advanced")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                scannerExperience === "advanced"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>المسح المتقدم والتدقيق الدقيق</span>
            </button>
          </div>
        </div>

        {/* Ingestion Modes Selector */}
        {!isProcessing && !extractedData && !lastArchivedSlip && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-emerald-800/60">
            <button
              onClick={() => {
                setActiveMode("twain_wia");
                stopCamera();
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === "twain_wia"
                  ? "bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-300"
                  : "bg-emerald-950/80 text-emerald-100 hover:bg-emerald-900 border border-emerald-700/60"
              }`}
            >
              <Scan className="w-4 h-4 text-emerald-400" />
              <span>ماسح TWAIN / WIA (المستودعات)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            <button
              onClick={() => {
                setActiveMode("upload");
                stopCamera();
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === "upload"
                  ? "bg-white text-slate-950 shadow-md font-black"
                  : "bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900 border border-emerald-800/40"
              }`}
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <span>رفع ملفات أو لصق (Ctrl+V)</span>
            </button>

            <button
              onClick={() => {
                setActiveMode("camera");
                startCamera();
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === "camera"
                  ? "bg-white text-slate-950 shadow-md font-black"
                  : "bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900 border border-emerald-800/40"
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>كاميرا الويب المباشرة</span>
            </button>

            <button
              onClick={() => {
                setActiveMode("samples");
                stopCamera();
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === "samples"
                  ? "bg-white text-slate-950 shadow-md font-black"
                  : "bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900 border border-emerald-800/40"
              }`}
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>عينات تاريخية من الخزانة</span>
            </button>
          </div>
        )}
      </div>

      {/* BODY CONTENT */}
      <div className="p-5 sm:p-6 space-y-6">

        {/* Error notification */}
        {errorNotice && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* SUCCESS / OFFICIAL ARCHIVAL RECEIPT CARD */}
        {lastArchivedSlip && !extractedData && (
          <div className="bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-950 font-['Amiri',serif]">
                    تم إيداع الوثيقة بنجاح في الخزينة الرقمية السيادية
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    الرقم الإشاري المعتمد: <strong className="font-mono">{lastArchivedSlip.refNumber}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {lastArchivedSlip.classification}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-800 border border-slate-300">
                  {lastArchivedSlip.pageCount} {lastArchivedSlip.pageCount === 1 ? "صفحة" : "صفحات"}
                </span>
              </div>
            </div>

            {/* Official Ministerial Barcode Sticker View */}
            <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm max-w-xl mx-auto space-y-3 font-sans">
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <span>دولة ليبيا - وزارة المالية</span>
                </div>
                <span>نظام الأرشفة الرقمي الموحد</span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{lastArchivedSlip.title}</div>
                  <div className="text-slate-600 text-[11px]">
                    الجهة: <strong className="text-emerald-900">{lastArchivedSlip.department}</strong>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    المبلغ المالي: <strong className="text-slate-900 font-mono">{lastArchivedSlip.financialAmount} {lastArchivedSlip.currency}</strong>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    التاريخ: <span className="font-mono">{lastArchivedSlip.gregorianDate}</span>
                  </div>
                  {lastArchivedSlip.subWarehouseOrigin && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 mt-1 font-medium">
                      المستودع: <strong>{lastArchivedSlip.subWarehouseOrigin.warehouseName}</strong> ({lastArchivedSlip.subWarehouseOrigin.hallName} - {lastArchivedSlip.subWarehouseOrigin.rackNumber})
                    </div>
                  )}
                  {lastArchivedSlip.scannerHardwareInfo && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      بروتوكول السحب: <strong>{lastArchivedSlip.scannerHardwareInfo.protocol}</strong> | الجهاز: {lastArchivedSlip.scannerHardwareInfo.scannerName} ({lastArchivedSlip.scannerHardwareInfo.resolutionDpi} DPI)
                    </div>
                  )}
                </div>

                {/* Simulated QR & Barcode */}
                <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                  <div className="w-16 h-16 bg-white p-1 rounded border border-slate-300 flex items-center justify-center mx-auto">
                    <QrCode className="w-14 h-14 text-slate-900" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 mt-1 block">
                    {lastArchivedSlip.qrCodeVerificationId}
                  </span>
                </div>
              </div>

              {/* Barcode Graphic Representation */}
              <div className="pt-2 border-t border-slate-200 text-center">
                <div className="h-8 w-full max-w-xs mx-auto flex items-end justify-center gap-0.5">
                  {[4,2,6,1,3,5,2,4,7,3,2,5,3,6,2,4,3,5,2,6,4,2,5,3,2,6,3,5,4,2,6].map((h, i) => (
                    <div key={i} className="bg-slate-900 w-1 rounded-xs" style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
                <span className="font-mono font-bold text-xs tracking-widest text-slate-800 mt-1 block">
                  {lastArchivedSlip.barcode}
                </span>
              </div>
            </div>

            {/* Quick Post-Scan Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handlePrintSlip}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>طباعة ملصق الباركود الحراري (WORM Label)</span>
              </button>

              <button
                onClick={handleResetForNewScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>مسح وأرشفة مستند جديد فوراً</span>
              </button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  العودة إلى سجل الكتالوج
                </button>
              )}
            </div>
          </div>
        )}

        {/* MAIN INGESTION & SCANNING STAGE */}
        {!isProcessing && !extractedData && !lastArchivedSlip && (
          <div className="space-y-6">

            {/* QUICK CATEGORIZATION SECTION (Pills with 1-click presets) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>نوع الوثيقة المالية (انقر للاختيار السريع):</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  تحديد نوع الوثيقة يرفع دقة التعرف الضوئي (OCR) ويسرع الفهرسة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {QUICK_DOC_PRESETS.map((preset) => {
                  const isSelected = selectedPresetType === preset.type;
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => {
                        setSelectedPresetType(preset.type);
                        setSelectedDepartment(preset.defaultDept);
                        setSelectedClassification(preset.defaultClassification);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                        isSelected
                          ? "bg-emerald-800 text-white border-emerald-900 shadow-md scale-[1.02]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50 hover:border-emerald-300"
                      }`}
                    >
                      <span className="text-xl mb-1">{preset.icon}</span>
                      <span className="text-[11px] text-center font-bold leading-tight">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Department & Classification Quick Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    الإدارة / الهيكل التنظيمي التابع له:
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
                  >
                    {orgUnitsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    درجة السرية والتصريح الأمني:
                  </label>
                  <select
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value as SecurityClassification)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="عام">عام (سجلات متاحة)</option>
                    <option value="محدود">محدود (تداول داخلي)</option>
                    <option value="سري">سري (وثائق الميزانية)</option>
                    <option value="سري ومحدود">سري ومحدود (قيود وأرصدة سيادية)</option>
                    <option value="سري للغاية">سري للغاية (معاهدات واحتياطيات)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    عنوان أو قيد إرشادي (اختياري):
                  </label>
                  <input
                    type="text"
                    value={titleHint}
                    onChange={(e) => setTitleHint(e.target.value)}
                    placeholder="مثال: قيد تسوية جمركية رقم 84..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* INGESTION MODE 0: DIRECT TWAIN / WIA SCANNER FOR SUB-WAREHOUSES */}
            {activeMode === "twain_wia" && (
              <SubWarehouseScannerPanel
                onPagesAcquired={(newPages, origin, hardwareMeta) => {
                  setPages((prev) => [...prev, ...newPages]);
                  setActivePageIndex(pages.length);
                  setSubWarehouseOrigin(origin);
                  setScannerHardwareInfo(hardwareMeta);
                  if (!titleHint) {
                    setTitleHint(`${selectedPresetType} - ${origin.warehouseName} (${origin.warehouseCode})`);
                  }
                }}
                isBusy={isProcessing}
              />
            )}

            {/* INGESTION MODE 1: UPLOAD / DRAG & DROP / PASTE */}
            {activeMode === "upload" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-amber-500 bg-amber-50/60 scale-[0.99]"
                      : pages.length > 0
                      ? "border-emerald-500 bg-emerald-50/30"
                      : "border-slate-300 hover:border-emerald-600 bg-slate-50/60 hover:bg-emerald-50/20"
                  }`}
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2.5 shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    اسحب وأفلت صفحات الوثيقة هنا، أو انقر للاستعراض، أو الصق مباشرة بـ (Ctrl+V)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                    يدعم المسح المتعدد لأكثر من صفحة، والتعرف التلقائي على نصوص الأوراق المالية بجودة 600 DPI.
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 shadow-xs">
                      <Clipboard className="w-3.5 h-3.5 text-amber-600" />
                      <span>لصق الحافظة متاح فوراً</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>عزل وتوضيح الحبر تلقائي</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* INGESTION MODE 2: LIVE WEB CAMERA */}
            {activeMode === "camera" && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-80 flex flex-col items-center justify-center border-4 border-slate-800 text-white p-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover rounded-xl ${isCameraActive ? "block" : "hidden"}`}
                  />

                  {/* Document Alignment Crosshairs & Guides */}
                  {isCameraActive && (
                    <div className="absolute inset-6 border-2 border-dashed border-amber-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <div className="flex justify-between items-center text-[10px] font-mono text-amber-300 bg-black/60 px-2.5 py-1 rounded w-fit">
                        <span>مستشعر الاستواء التلقائي: ضع الوثيقة داخل الإطار</span>
                      </div>
                      <div className="text-center text-xs text-amber-200 font-medium bg-black/70 py-1 px-3 rounded-lg mx-auto backdrop-blur-xs">
                        تأكد من وضوح الأختام والتوقيعات الرسمية وتساوي الإضاءة
                      </div>
                    </div>
                  )}

                  {/* Fallback view when camera is not running or denied */}
                  {!isCameraActive && (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-200">
                          كاميرا الماسح المكتبي جاهزة للالتقاط
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {cameraError || "انقر لتشغيل الكاميرا والتقاط الأوراق والمستندات المالية مباشرة"}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                        >
                          تشغيل الكاميرا الآن
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const sample = sampleScannableDocuments[0];
                            const newPage: ScannedPage = {
                              id: `sample-cam-${Date.now()}`,
                              name: `محاكاة_كاميرا_${sample.name}.jpg`,
                              base64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'><rect width='100%' height='100%' fill='%23fefdfa'/><text x='50%' y='20%' font-size='26' font-family='serif' text-anchor='middle' fill='%23111827'>المملكة الليبية - ديوان الخزانة العامة</text><text x='50%' y='40%' font-size='18' text-anchor='middle' fill='%23374151'>مرسوم ملكي بشأن مخصصات ميناء بنغازي 1961</text><circle cx='400' cy='600' r='80' fill='none' stroke='%23b91c1c' stroke-width='4'/><text x='400' y='605' font-size='14' text-anchor='middle' fill='%23b91c1c'>خاتم ديوان قصر المنار</text></svg>"
                            };
                            setPages((prev) => [...prev, newPage]);
                            setActivePageIndex(pages.length);
                            setActiveMode("upload");
                          }}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          استخدام صورة تجريبية بديلة
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isCameraActive && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={captureFrameFromCamera}
                      className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 text-xs transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>التقاط الصفحة وإضافتها للحزمة</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                    >
                      إيقاف الكاميرا
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* INGESTION MODE 3: HISTORICAL ARCHIVES GALLERY */}
            {activeMode === "samples" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    اختر وثيقة تاريخية معتمدة لتجربة الاستخراج الفوري والأرشفة:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    نماذج حقيقية تمثل الحقب الثلاث لوزارة المالية
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sampleScannableDocuments.map((sample) => {
                    const isSelected = selectedSampleId === sample.id;
                    return (
                      <div
                        key={sample.id}
                        onClick={() => setSelectedSampleId(sample.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-300"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-slate-900">{sample.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-['Amiri',serif] line-clamp-2">
                            {sample.previewText}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {sample.era}
                            </span>
                            <span className="text-emerald-800 font-bold">{sample.department}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MULTI-PAGE RIBBON & CONTROLS (UNIVERSAL ACROSS TWAIN/WIA, UPLOAD, CAMERA) */}
            {pages.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>صفحات الحزمة الممسوحة ({pages.length}):</span>
                    <span className="text-slate-500 font-normal">
                      الصفحة المعروضة: {activePageIndex + 1} من {pages.length}
                    </span>
                    {subWarehouseOrigin && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {subWarehouseOrigin.warehouseCode} - {subWarehouseOrigin.hallName}
                      </span>
                    )}
                    {scannerHardwareInfo && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {scannerHardwareInfo.protocol} ({scannerHardwareInfo.resolutionDpi} DPI)
                      </span>
                    )}
                  </div>

                  {/* Optical Tools: Rotate & Zoom */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs flex items-center gap-1 cursor-pointer"
                      title="تدوير الوثيقة 90 درجة مع عقارب الساعة"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                      <span>تدوير 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreScanZoom((prev) => Math.max(70, prev - 15))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                      title="تصغير"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] font-mono font-bold text-slate-600 px-1">
                      {preScanZoom}%
                    </span>

                    <button
                      type="button"
                      onClick={() => setPreScanZoom((prev) => Math.min(160, prev + 15))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                      title="تكبير"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة صفحة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPages([]);
                        setActivePageIndex(0);
                        setRotationAngle(0);
                        setSubWarehouseOrigin(undefined);
                        setScannerHardwareInfo(undefined);
                      }}
                      className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      مسح الكل
                    </button>
                  </div>
                </div>

                {/* Multi-Page Thumbnails Strip */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => setActivePageIndex(idx)}
                      className={`relative group shrink-0 w-20 h-24 rounded-lg border-2 overflow-hidden cursor-pointer transition ${
                        activePageIndex === idx
                          ? "border-emerald-600 ring-2 ring-emerald-300"
                          : "border-slate-300 hover:border-slate-400 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={p.base64}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded font-bold">
                        ص {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(idx);
                        }}
                        className="absolute top-1 left-1 bg-rose-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="حذف هذه الصفحة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Advanced Filter Buttons (Shown when in advanced mode) */}
                {scannerExperience === "advanced" && (
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>فلتر المعالجة البصرية المتقدمة:</span>
                    </span>

                    {(["normal", "clean", "binarized", "greyscale", "vintage"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setPreScanFilter(filter)}
                        className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
                          preScanFilter === filter
                            ? "bg-emerald-800 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {filter === "normal" && "أصل الوثيقة"}
                        {filter === "clean" && "تنقية الحبر"}
                        {filter === "binarized" && "أبيض وأسود 600 DPI"}
                        {filter === "greyscale" && "تدرج رمادي"}
                        {filter === "vintage" && "ترميم ورق عتيق"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Preview Canvas */}
                {currentPage && (
                  <div className="max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-center">
                    <img
                      src={currentPage.base64}
                      alt="Scanned Document Preview"
                      style={{
                        transform: `rotate(${rotationAngle}deg) scale(${preScanZoom / 100})`,
                        transition: "transform 0.2s ease-in-out"
                      }}
                      className={`max-h-64 object-contain rounded ${getPreScanFilterClass()}`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ACTION BAR: PROMINENT 1-CLICK INSTANT SCAN & ARCHIVE */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 text-right">
                ⚡ وضع <strong>المسح الميسر</strong> يقوم تلقائياً باستخراج النصوص وتوليد الباركود وتوثيق قيد الأرشفة بضغطة زر واحدة.
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {/* 1-Click Fast Archive Button */}
                <button
                  id="btn-quick-auto-archive"
                  onClick={() => runScanningPipeline(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-950/20 text-xs sm:text-sm transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>مسح وأرشفة فورية بضغطة واحدة (1-Click)</span>
                </button>

                {/* Inspect and Edit OCR Button */}
                <button
                  id="btn-inspect-scan"
                  onClick={() => runScanningPipeline(false)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold px-4 py-3 rounded-xl shadow-xs text-xs transition cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                  <span>معاينة وتدقيق الـ OCR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ANIMATED OCR PROCESSING PIPELINE */}
        {isProcessing && (
          <div className="py-10 px-4 max-w-lg mx-auto text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-300 animate-ping opacity-25"></div>
              <div className="w-full h-full rounded-2xl bg-emerald-900 text-amber-400 flex items-center justify-center shadow-xl border-2 border-amber-400/60 overflow-hidden relative">
                <div className="absolute inset-x-0 h-1 bg-amber-300 shadow-[0_0_12px_#f59e0b] animate-bounce"></div>
                <Scan className="w-9 h-9 animate-pulse text-amber-300 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Amiri',serif]">
                جاري المسح والتعرف الضوئي (OCR) 600 DPI...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                استخراج النصوص العربية، عزل الأختام، ومطابقة القيود الدفترية التاريخية
              </p>
            </div>

            {/* Stepper progress list */}
            <div className="space-y-2 text-right bg-slate-50 p-4 rounded-xl border border-slate-200">
              {steps.map((s, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                      isCurrent
                        ? "bg-emerald-100 text-emerald-950 font-bold border border-emerald-300"
                        : isCompleted
                        ? "bg-white text-slate-700 border border-slate-200"
                        : "text-slate-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCompleted
                            ? "bg-emerald-700 text-white"
                            : isCurrent
                            ? "bg-amber-500 text-slate-950 animate-bounce"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-[10px] text-slate-500">{s.desc}</div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] text-emerald-700 font-mono font-bold animate-pulse">
                        معالجة ضوئية...
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> تم
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: RESULT REVIEW & CONFIRMATION CARD */}
        {extractedData && !isEditorOpen && (
          <div className="space-y-6">
            <div className="border border-emerald-200 rounded-2xl bg-emerald-50/30 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm font-['Amiri',serif]">
                      تم استخراج بيانات الوثيقة بنجاح بنسبة دقة {confidenceScore}%
                    </h3>
                    <span className="text-[11px] text-emerald-800">
                      معايير الأرشفة الوطنية ومعيار ISAD(G) مستوفاة بالكامل
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {extractedData.era}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block mb-0.5">الرقم الإشاري / الدفتري:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {extractedData.refNumber}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block mb-0.5">المبلغ المالي المكتشف:</span>
                  <span className="font-bold text-emerald-800 text-xs">
                    {extractedData.financialAmount}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block mb-0.5">المصلحة / الإدارة:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {extractedData.department}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block mb-0.5">التاريخ:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {extractedData.gregorianDate} ({extractedData.hijriDate})
                  </span>
                </div>
              </div>

              {/* Extracted Text Snippet */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>مقتطف من النص العربي المفرغ (OCR Extract):</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {extractedData.ocrText.split(/\s+/).length} كلمة
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto font-['Amiri',serif] text-justify border border-slate-100">
                  {extractedData.ocrText}
                </div>
              </div>

              {/* Action Buttons to Commit or Edit */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleResetForNewScan}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold transition cursor-pointer"
                >
                  إلغاء ومسح وثيقة جديدة
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditorOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                    <span>فتح محرر الـ OCR للمطابقة التفصيلية</span>
                  </button>

                  <button
                    onClick={() => {
                      onDocumentArchived(extractedData);
                      setSessionScannedDocs((prev) => [extractedData, ...prev]);
                      setLastArchivedSlip(extractedData);
                      setExtractedData(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-950/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>اعتماد الوثيقة وإيداعها في الأرشيف والخزينة فوراً</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: INTERACTIVE DUAL-PANE OCR VERIFICATION EDITOR */}
        {extractedData && isEditorOpen && (
          <div className="space-y-4">
            <OcrVerificationEditor
              initialDocument={extractedData}
              scannedImageSrc={currentPage?.base64}
              confidenceScore={confidenceScore}
              metrics={ocrMetrics}
              onSave={handleSaveOcrData}
              onCancel={() => setIsEditorOpen(false)}
              saveButtonLabel="اعتماد الوثيقة وفهرستها في الأرشيف الدائم"
            />
          </div>
        )}
      </div>
    </div>
  );
};
