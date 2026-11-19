import React, { useState, useMemo } from "react";
import { 
  FileText, 
  Search, 
  Check, 
  Copy, 
  Download, 
  RotateCcw, 
  Sliders, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  Edit3, 
  Tag, 
  Plus, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Maximize2,
  Minimize2,
  Calendar,
  Building,
  DollarSign,
  Stamp,
  AlignLeft,
  BookOpen
} from "lucide-react";
import { ArchivedDocument, DepartmentType, DocumentType, LibyanEra, SecurityClassification } from "../types";
import { SmartTagSuggestionCard } from "./SmartTagSuggestionCard";

export interface OcrVerificationEditorProps {
  initialDocument: {
    ocrText: string;
    title: string;
    refNumber: string;
    financialAmount?: string;
    currency?: string;
    keywords: string[];
    department: DepartmentType;
    era: LibyanEra;
    docType: DocumentType;
    classification: SecurityClassification;
    gregorianDate?: string;
    hijriDate?: string;
    summary?: string;
    signatories?: string[];
    stampsDetected?: string[];
    barcode?: string;
  };
  scannedImageSrc?: string;
  confidenceScore?: number;
  metrics?: {
    wordCount?: number;
    charCount?: number;
    lineCount?: number;
    detectedLanguage?: string;
    engine?: string;
  };
  onSave: (updatedData: {
    ocrText: string;
    title: string;
    refNumber: string;
    financialAmount: string;
    currency: string;
    keywords: string[];
    department: DepartmentType;
    era: LibyanEra;
    docType: DocumentType;
    classification: SecurityClassification;
    gregorianDate: string;
    hijriDate: string;
    summary: string;
    signatories: string[];
    stampsDetected: string[];
  }) => void;
  onCancel?: () => void;
  saveButtonLabel?: string;
  isInsideViewerModal?: boolean;
}

export const OcrVerificationEditor: React.FC<OcrVerificationEditorProps> = ({
  initialDocument,
  scannedImageSrc,
  confidenceScore = 96,
  metrics,
  onSave,
  onCancel,
  saveButtonLabel = "اعتماد وفهرسة في محرك البحث والأرشيف الدائم",
  isInsideViewerModal = false
}) => {
  // Tabs inside OCR Editor
  const [activeTab, setActiveTab] = useState<"text_editor" | "metadata_editor" | "search_preview">("text_editor");

  // Editable states
  const [ocrText, setOcrText] = useState<string>(initialDocument.ocrText || "");
  const [originalOcrText] = useState<string>(initialDocument.ocrText || "");
  const [title, setTitle] = useState<string>(initialDocument.title || "");
  const [refNumber, setRefNumber] = useState<string>(initialDocument.refNumber || "");
  const [financialAmount, setFinancialAmount] = useState<string>(initialDocument.financialAmount || "");
  const [currency, setCurrency] = useState<string>(initialDocument.currency || "دينار ليبي");
  const [gregorianDate, setGregorianDate] = useState<string>(initialDocument.gregorianDate || "");
  const [hijriDate, setHijriDate] = useState<string>(initialDocument.hijriDate || "");
  const [era, setEra] = useState<LibyanEra>(initialDocument.era);
  const [department, setDepartment] = useState<DepartmentType>(initialDocument.department);
  const [docType, setDocType] = useState<DocumentType>(initialDocument.docType);
  const [classification, setClassification] = useState<SecurityClassification>(initialDocument.classification);
  const [summary, setSummary] = useState<string>(initialDocument.summary || "");
  
  // Keyword tags
  const [keywords, setKeywords] = useState<string[]>(initialDocument.keywords || []);
  const [newKeywordInput, setNewKeywordInput] = useState<string>("");

  // Signatories and Stamps
  const [signatories, setSignatories] = useState<string[]>(initialDocument.signatories || []);
  const [newSignatoryInput, setNewSignatoryInput] = useState<string>("");
  const [stampsDetected, setStampsDetected] = useState<string[]>(initialDocument.stampsDetected || []);

  // Text search & highlight inside OCR editor
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [textMode, setTextMode] = useState<"edit" | "preview">("edit");

  // Scanned Image filter & zoom controls
  const [imageFilter, setImageFilter] = useState<"normal" | "greyscale" | "binarized" | "vintage">("normal");
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [showImagePane, setShowImagePane] = useState<boolean>(true);

  // Suggested keywords for quick addition
  const quickKeywordSuggestions = [
    "الخزانة العامة",
    "مصرف ليبيا المركزي",
    "إذن صرف مالي",
    "ميزانية الطوارئ",
    "التعريفة الجمركية",
    "إيرادات سيادية",
    "ديوان المحاسبة",
    "علاوات ومرتبات",
    "قرض عام وسندات"
  ];

  // Calculate live text metrics
  const textStats = useMemo(() => {
    const clean = ocrText.trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    const chars = ocrText.length;
    const lines = ocrText ? ocrText.split("\n").length : 0;
    return { words, chars, lines };
  }, [ocrText]);

  // Search matches calculation
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim() || !ocrText) return 0;
    try {
      const q = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(q, "gi");
      const matches = ocrText.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [searchQuery, ocrText]);

  // Handle adding keyword tag
  const handleAddKeyword = (keywordToAdd?: string) => {
    const val = (keywordToAdd || newKeywordInput).trim();
    if (val && !keywords.includes(val)) {
      setKeywords([...keywords, val]);
      if (!keywordToAdd) setNewKeywordInput("");
    }
  };

  const handleRemoveKeyword = (tagToRemove: string) => {
    setKeywords(keywords.filter(k => k !== tagToRemove));
  };

  // Add signatory
  const handleAddSignatory = () => {
    const val = newSignatoryInput.trim();
    if (val && !signatories.includes(val)) {
      setSignatories([...signatories, val]);
      setNewSignatoryInput("");
    }
  };

  const handleRemoveSignatory = (sigToRemove: string) => {
    setSignatories(signatories.filter(s => s !== sigToRemove));
  };

  // Text normalization assistants
  const handleNormalizeHamzas = () => {
    // Standardize Arabic Alifs and Yaa
    const normalized = ocrText
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى\b/g, "ي");
    setOcrText(normalized);
  };

  const handleConvertNumerals = (toEastern: boolean) => {
    if (toEastern) {
      const westernToEastern: Record<string, string> = {
        "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
        "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩"
      };
      setOcrText(ocrText.replace(/[0-9]/g, w => westernToEastern[w] || w));
    } else {
      const easternToWestern: Record<string, string> = {
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
      };
      setOcrText(ocrText.replace(/[٠-٩]/g, w => easternToWestern[w] || w));
    }
  };

  const handleCleanSpacing = () => {
    const cleaned = ocrText
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();
    setOcrText(cleaned);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([
      `=== الجمهورية الليبية - وزارة المالية ===\n`,
      `الرقم الإشاري: ${refNumber}\n`,
      `العنوان: ${title}\n`,
      `الحقبة: ${era}\n`,
      `المصلحة: ${department}\n`,
      `المبلغ: ${financialAmount} ${currency}\n`,
      `التاريخ: ${gregorianDate} / ${hijriDate}\n`,
      `=======================================\n\n`,
      ocrText
    ], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `OCR_${refNumber.replace(/[/\\?%*:|"<>]/g, "-")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleResetToOriginal = () => {
    if (window.confirm("هل ترغب بإعادة تعيين النص إلى القراءة الأولية للتعرف الضوئي؟")) {
      setOcrText(originalOcrText);
    }
  };

  // Submit and save
  const handleCommit = () => {
    onSave({
      ocrText,
      title,
      refNumber,
      financialAmount,
      currency,
      keywords,
      department,
      era,
      docType,
      classification,
      gregorianDate,
      hijriDate,
      summary,
      signatories,
      stampsDetected
    });
  };

  // Highlight matches in preview mode
  const renderHighlightedOcrText = () => {
    if (!searchQuery.trim()) {
      return (
        <div className="whitespace-pre-wrap leading-relaxed text-sm font-['Amiri',serif] text-slate-900 p-4">
          {ocrText}
        </div>
      );
    }

    try {
      const q = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${q})`, "gi");
      const parts = ocrText.split(regex);

      return (
        <div className="whitespace-pre-wrap leading-relaxed text-sm font-['Amiri',serif] text-slate-900 p-4">
          {parts.map((part, i) => {
            const isMatch = part.toLowerCase() === searchQuery.trim().toLowerCase();
            return isMatch ? (
              <mark
                key={i}
                className="bg-amber-300 text-slate-950 font-bold px-1 py-0.5 rounded shadow-xs border border-amber-500 animate-pulse"
              >
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            );
          })}
        </div>
      );
    } catch {
      return (
        <div className="whitespace-pre-wrap leading-relaxed text-sm font-['Amiri',serif] text-slate-900 p-4">
          {ocrText}
        </div>
      );
    }
  };

  // Scanned image visual filter class
  const getImageFilterClass = () => {
    switch (imageFilter) {
      case "greyscale":
        return "grayscale contrast-125";
      case "binarized":
        return "grayscale contrast-200 brightness-110";
      case "vintage":
        return "sepia contrast-110 brightness-95";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: OCR Status & Confidence Indicator */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl p-4 border border-emerald-700/50 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-amber-200 font-['Amiri',serif]">
                  منصة التعرف الضوئي على الحروف (OCR Studio)
                </h3>
                <span className="bg-emerald-800 text-emerald-100 text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-600">
                  {metrics?.engine || "Gemini 3.8 Flash Vision OCR"}
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] px-2 py-0.5 rounded-full font-bold">
                  قابلة للبحث والتحرير آلياً
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                تفريغ النصوص العربية بدقة وفهرسة الحقول المالية والقانونية وفق المعايير الأرشيفية السيادية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Confidence Gauge */}
            <div className="bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-700/60 text-center">
              <div className="text-[10px] text-emerald-300 font-medium">نسبة دقة التعرف</div>
              <div className="text-sm font-black font-mono text-amber-400">
                {confidenceScore}%
              </div>
            </div>

            {/* Word & Char Counters */}
            <div className="bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-700/60 text-center text-xs">
              <div className="text-[10px] text-emerald-300 font-medium">إجمالي الكلمات</div>
              <div className="text-sm font-bold font-mono text-emerald-100">
                {textStats.words} كلمة
              </div>
            </div>

            {/* Toggle Image Pane button */}
            {scannedImageSrc && (
              <button
                type="button"
                onClick={() => setShowImagePane(!showImagePane)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition ${
                  showImagePane
                    ? "bg-amber-400 text-slate-950 border-amber-500 shadow-sm"
                    : "bg-emerald-900/80 text-emerald-200 border-emerald-700 hover:bg-emerald-800"
                }`}
                title="إظهار / إخفاء الوثيقة الأصلية للمطابقة جنبًا إلى جنب"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{showImagePane ? "إخفاء الأصل" : "مطابقة الأصل"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Dual-Pane / Workspace Grid */}
      <div className={`grid grid-cols-1 ${showImagePane ? "lg:grid-cols-12" : "grid-cols-1"} gap-5`}>
        {/* Right Pane: Scanned Document Visual & Image Filter Studio (shown when enabled) */}
        {showImagePane && (
          <div className="lg:col-span-5 flex flex-col bg-[#f7f5ed] border-2 border-amber-900/20 rounded-2xl p-4 shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-900/20">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <FileText className="w-4 h-4 text-amber-800" />
                <span>الوثيقة الممسوحة ضوئياً (المطابقة المباشرة)</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-bold">
                600 DPI ARCHIVAL
              </span>
            </div>

            {/* Image Enhancer Toolbar */}
            <div className="flex items-center justify-between gap-1 bg-amber-950/10 p-1.5 rounded-xl mb-3 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setImageFilter("normal")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                    imageFilter === "normal" ? "bg-amber-800 text-white shadow-xs" : "text-amber-900 hover:bg-amber-200/60"
                  }`}
                  title="العرض الطبيعي للأصل"
                >
                  أصل
                </button>
                <button
                  type="button"
                  onClick={() => setImageFilter("binarized")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                    imageFilter === "binarized" ? "bg-amber-800 text-white shadow-xs" : "text-amber-900 hover:bg-amber-200/60"
                  }`}
                  title="عزل الحبر عالي التباين لإبراز الكتابة الباهتة"
                >
                  عزل الحبر
                </button>
                <button
                  type="button"
                  onClick={() => setImageFilter("greyscale")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                    imageFilter === "greyscale" ? "bg-amber-800 text-white shadow-xs" : "text-amber-900 hover:bg-amber-200/60"
                  }`}
                  title="تدرج رمادي مريح"
                >
                  رمادي
                </button>
                <button
                  type="button"
                  onClick={() => setImageFilter("vintage")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                    imageFilter === "vintage" ? "bg-amber-800 text-white shadow-xs" : "text-amber-900 hover:bg-amber-200/60"
                  }`}
                  title="ترميم أوراق المخطوطات القديمة"
                >
                  ترميم الورق
                </button>
              </div>

              {/* Zoom and rotation controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setImageZoom(Math.max(75, imageZoom - 20))}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white/80 hover:bg-white text-amber-950 border border-amber-300"
                  title="تصغير الصورة"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono font-bold text-amber-950 px-1 min-w-[32px] text-center">
                  {imageZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom(Math.min(220, imageZoom + 20))}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white/80 hover:bg-white text-amber-950 border border-amber-300"
                  title="تكبير الصورة"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white/80 hover:bg-white text-amber-950 border border-amber-300 ml-1"
                  title="تدوير الصورة 90 درجة"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Document Facsimile Container */}
            <div className="flex-1 bg-white/95 rounded-xl border border-amber-900/30 p-4 overflow-auto max-h-[500px] relative flex items-center justify-center shadow-inner">
              {scannedImageSrc ? (
                <div 
                  className="transition-transform duration-200 ease-out origin-center"
                  style={{
                    transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                  }}
                >
                  <img
                    src={scannedImageSrc}
                    alt="Scanned archival record"
                    className={`max-w-full h-auto rounded shadow-lg border border-slate-300 ${getImageFilterClass()}`}
                  />
                </div>
              ) : (
                /* Authentic Ministerial Document Facsimile Simulation when image is raw text or sample */
                <div 
                  className={`w-full max-w-sm bg-gradient-to-b from-[#fefdfb] to-[#f7f2e7] p-5 rounded-lg border border-amber-800/30 text-right font-['Amiri',serif] transition-transform duration-200 ${getImageFilterClass()}`}
                  style={{
                    transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                  }}
                >
                  {/* Sovereign Stamp Stamp Emulation */}
                  <div className="flex items-start justify-between border-b border-amber-900/20 pb-3 mb-3">
                    <div className="text-center">
                      <div className="text-xs font-bold text-amber-950">دولة ليبيا - وزارة المالية</div>
                      <div className="text-[10px] text-slate-700">{department}</div>
                      <div className="text-[9px] text-emerald-800 font-mono font-bold mt-0.5">{refNumber}</div>
                    </div>
                    <div className="w-14 h-14 rounded-full border-2 border-red-800/70 text-red-800 flex flex-col items-center justify-center text-center rotate-[-10deg] p-1 select-none">
                      <span className="text-[6px] font-bold">الأرشيف السيادي</span>
                      <span className="text-[8px] font-bold font-mono">مؤرشف</span>
                      <span className="text-[5px]">VERIFIED OCR</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 mb-2 leading-relaxed">
                    {title}
                  </h4>

                  <div className="text-[11px] text-slate-800 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-line p-2 bg-amber-50/60 rounded border border-amber-900/10">
                    {ocrText.slice(0, 450)}...
                  </div>

                  {financialAmount && (
                    <div className="mt-3 pt-2 border-t border-amber-900/20 flex items-center justify-between text-[11px] font-bold text-emerald-950">
                      <span>المبلغ المعتمد:</span>
                      <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                        {financialAmount} {currency}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-slate-500 text-left font-mono">
                    التاريخ: {gregorianDate} / {hijriDate}
                  </div>
                </div>
              )}
            </div>

            {/* Detected Physical Features Chips */}
            <div className="mt-3 pt-2 border-t border-amber-900/20 flex flex-wrap gap-1.5 text-[11px]">
              {stampsDetected.map((stamp, idx) => (
                <span key={idx} className="bg-red-100 text-red-900 px-2 py-0.5 rounded-full border border-red-200 font-medium flex items-center gap-1">
                  <Stamp className="w-3 h-3 text-red-700" />
                  <span>{stamp}</span>
                </span>
              ))}
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-200 font-mono font-bold">
                باركود: {initialDocument.barcode || "LY-ARC-OCR-VERIFIED"}
              </span>
            </div>
          </div>
        )}

        {/* Left Pane: The Interactive OCR Text & Searchable Data Editor */}
        <div className={`${showImagePane ? "lg:col-span-7" : "col-span-1"} flex flex-col space-y-4`}>
          {/* Editor Tabs Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                id="ocr-tab-text"
                onClick={() => setActiveTab("text_editor")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "text_editor"
                    ? "bg-white text-emerald-950 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                <span>محرر النص المستخرج (Full Text)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {textStats.words}
                </span>
              </button>

              <button
                type="button"
                id="ocr-tab-metadata"
                onClick={() => setActiveTab("metadata_editor")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "metadata_editor"
                    ? "bg-white text-emerald-950 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>البيانات المفهرسة والبحثية</span>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {keywords.length} وسوم
                </span>
              </button>

              <button
                type="button"
                id="ocr-tab-preview"
                onClick={() => setActiveTab("search_preview")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "search_preview"
                    ? "bg-white text-emerald-950 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>معاينة الفهرسة للبحث</span>
              </button>
            </div>

            {/* Quick action buttons on the top right */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border border-slate-300"
                title="نسخ النص المستخرج بالكامل إلى الحافظة"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{isCopied ? "تم النسخ!" : "نسخ النص"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border border-slate-300"
                title="تنزيل النص كملف نصي (.txt)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>تنزيل TXT</span>
              </button>
            </div>
          </div>

          {/* TAB 1: OCR TEXT EDITOR & SEARCH HIGHLIGHT */}
          {activeTab === "text_editor" && (
            <div className="space-y-3">
              {/* In-Text Search & Assistant Controls Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                {/* Search query box */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث وظلل أي كلمة داخل النص المستخرج (مثال: الخزانة، دينار، طرابلس)..."
                    className="w-full text-xs pr-8 pl-8 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {searchQuery.trim() && (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg">
                    عُثر على {searchMatchesCount} تطابق
                  </span>
                )}

                {/* Mode toggle: Edit vs Highlight Preview */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTextMode("edit")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      textMode === "edit" ? "bg-emerald-800 text-white" : "bg-white text-slate-700 border border-slate-300"
                    }`}
                  >
                    وضع التحرير المباشر
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextMode("preview")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      textMode === "preview" ? "bg-emerald-800 text-white" : "bg-white text-slate-700 border border-slate-300"
                    }`}
                  >
                    معاينة التظليل والتدقيق
                  </button>
                </div>
              </div>

              {/* Text Normalization Helper Tools Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-950">أدوات التهيئة الآلية:</span>
                  <button
                    type="button"
                    onClick={handleNormalizeHamzas}
                    className="bg-white hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded border border-emerald-300 text-[11px] font-semibold transition"
                    title="توحيد الهمزات والألفات لتسهيل الفهرسة ومطابقة البحث الأرشيفي"
                  >
                    توحيد الهمزات (أ/إ/ا)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertNumerals(true)}
                    className="bg-white hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded border border-emerald-300 text-[11px] font-semibold transition"
                    title="تحويل الأرقام إلى أرقام مشرقية (٠-٩)"
                  >
                    أرقام مشرقية (٠-٩)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertNumerals(false)}
                    className="bg-white hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded border border-emerald-300 text-[11px] font-semibold transition"
                    title="تحويل الأرقام إلى أرقام لاتينية (0-9)"
                  >
                    أرقام لاتينية (0-9)
                  </button>
                  <button
                    type="button"
                    onClick={handleCleanSpacing}
                    className="bg-white hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded border border-emerald-300 text-[11px] font-semibold transition"
                    title="تنظيف المسافات والأسطر الفارغة المكررة"
                  >
                    تنظيف المسافات
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  className="text-amber-800 hover:text-amber-950 text-[11px] flex items-center gap-1 font-semibold underline"
                  title="استعادة النص الأولي المستخرج بالـ OCR"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة تعيين للأصل</span>
                </button>
              </div>

              {/* The Text Area or Highlighted Preview Area */}
              <div className="relative rounded-xl border border-slate-300 overflow-hidden shadow-xs bg-white">
                {textMode === "edit" ? (
                  <textarea
                    id="ocr-text-editor-area"
                    rows={12}
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    dir="rtl"
                    className="w-full text-sm font-['Amiri',serif] leading-relaxed p-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-y text-slate-900 bg-white"
                    placeholder="النص المستخرج عبر التعرف الضوئي (OCR)... يمكنك التعديل والتدقيق بحرية هنا"
                  />
                ) : (
                  <div className="min-h-[290px] max-h-[420px] overflow-y-auto bg-[#fdfbf7] p-2">
                    {renderHighlightedOcrText()}
                  </div>
                )}

                {/* Footer status of text editor */}
                <div className="bg-slate-100 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                  <div className="flex items-center gap-4">
                    <span>{textStats.chars} حرفاً</span>
                    <span>{textStats.words} كلمة</span>
                    <span>{textStats.lines} أسطر</span>
                  </div>
                  <div className="text-emerald-800 font-bold font-sans">
                    {textMode === "edit" ? "جاهز للتحرير الآلي" : "معاينة المطابقة"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEARCHABLE METADATA & ENTITIES */}
          {activeTab === "metadata_editor" && (
            <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-600 font-medium">
                هذه الحقول تم استخراجها وتحويلها آلياً من نصوص الوثيقة الممسوحة، وهي التي تغذي محرك البحث المتقدم والخزينة الرقمية.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرقم الإشاري / القيد الدفتري:
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحقبة التاريخية للوثيقة:
                  </label>
                  <select
                    value={era}
                    onChange={(e) => setEra(e.target.value as LibyanEra)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="المملكة الليبية (1951 - 1969)">المملكة الليبية (1951 - 1969)</option>
                    <option value="حقبة الجمهورية والجماهيرية (1969 - 2011)">حقبة الجمهورية والجماهيرية (1969 - 2011)</option>
                    <option value="دولة ليبيا الحديثة (2011 - الآن)">دولة ليبيا الحديثة (2011 - الآن)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الإدارة أو المصلحة المصدرة:
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع الوثيقة المالية:
                  </label>
                  <input
                    type="text"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المالي المكتشف والعملة:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={financialAmount}
                      onChange={(e) => setFinancialAmount(e.target.value)}
                      placeholder="المبلغ (مثال: 750,000)"
                      className="w-2/3 text-xs font-bold text-emerald-800 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="العملة"
                      className="w-1/3 text-xs px-2 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التاريخ (ميلادي / هجري):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gregorianDate}
                      onChange={(e) => setGregorianDate(e.target.value)}
                      placeholder="التاريخ الميلادي"
                      className="w-1/2 text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                    <input
                      type="text"
                      value={hijriDate}
                      onChange={(e) => setHijriDate(e.target.value)}
                      placeholder="التاريخ الهجري"
                      className="w-1/2 text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الوثيقة الرسمي المستخرج:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              {/* Smart Tagging Suggestion (AI & OCR Semantic Classification) */}
              <SmartTagSuggestionCard
                ocrText={ocrText}
                documentTitle={title}
                currentKeywords={keywords}
                currentDepartment={department}
                currentDocType={docType}
                currentClassification={classification}
                currentEra={era}
                onApplyKeywords={(newTags) => setKeywords(newTags)}
                onApplyDepartment={(newDept) => setDepartment(newDept)}
                onApplyDocType={(newDocType) => setDocType(newDocType)}
                onApplyClassification={(newClass) => setClassification(newClass)}
                onApplyEra={(newEra) => setEra(newEra)}
                onApplyAllRecommendations={(recs) => {
                  if (recs.keywords) setKeywords(recs.keywords);
                  if (recs.department) setDepartment(recs.department);
                  if (recs.docType) setDocType(recs.docType);
                  if (recs.classification) setClassification(recs.classification);
                  if (recs.era) setEra(recs.era);
                }}
              />

              {/* Dynamic Keywords / Search Tags Manager */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>الكلمات المفتاحية للفهرسة والبحث السريع (Search Index Tags):</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    اضغط على الوسم لإزالته أو أضف وسوماً جديدة
                  </span>
                </label>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-300 min-h-[44px]">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-950 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-300 transition"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-amber-800 hover:text-red-700 p-0.5 rounded-full"
                        title="إزالة الكلمة المفتاحية"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {/* Add Tag Input */}
                  <div className="inline-flex items-center gap-1 flex-1 min-w-[140px]">
                    <input
                      type="text"
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="+ اكتب وسماً واضغط Enter..."
                      className="text-xs px-2 py-1 outline-none w-full bg-transparent text-slate-800"
                    />
                    {newKeywordInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddKeyword()}
                        className="text-xs bg-emerald-700 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-800"
                      >
                        إضافة
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Keyword Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">وسوم مقترحة:</span>
                  {quickKeywordSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddKeyword(sug)}
                      disabled={keywords.includes(sug)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                        keywords.includes(sug)
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signatories Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموقعون والمسؤولون المكتشفون:
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-300">
                  {signatories.map((sig, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200"
                    >
                      <span>{sig}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSignatory(sig)}
                        className="text-slate-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 flex-1 min-w-[130px]">
                    <input
                      type="text"
                      value={newSignatoryInput}
                      onChange={(e) => setNewSignatoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSignatory();
                        }
                      }}
                      placeholder="+ أضف اسماً أو منصباً..."
                      className="text-xs px-2 py-1 outline-none w-full bg-transparent text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملخص الأثر المالي والتوثيقي:
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SEARCH INDEX PREVIEW */}
          {activeTab === "search_preview" && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                <div>
                  <span className="font-bold">فهرسة البحث الآلية نشطة:</span>
                  <span className="mr-1">
                    بمجرد الاعتماد، ستصبح هذه الوثيقة قابلة للبحث الفوري بواسطة محرك البحث المتقدم، والبحث النصي في السجلات، وباحث الذكاء الاصطناعي السيادي.
                  </span>
                </div>
              </div>

              {/* Simulated Search Card Result */}
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold bg-emerald-950 text-amber-300 px-2 py-0.5 rounded">
                      {refNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {era}
                    </span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 text-[11px] font-bold px-2 py-0.5 rounded">
                    قابل للبحث فوراً
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 font-['Amiri',serif]">
                  {title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {summary || ocrText.slice(0, 160) + "..."}
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-900">{department}</span>
                    {financialAmount && (
                      <span className="font-mono font-bold text-amber-700">
                        • {financialAmount} {currency}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {keywords.slice(0, 4).map((kw, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indexed Search Terms Breakdown */}
              <div className="text-xs space-y-1.5 text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">الحقول والكلمات المفهرسة في محرك البحث:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>• تطابق النص الكامل (OCR Text): <span className="text-emerald-700 font-bold">{textStats.words} كلمة مفهرسة</span></div>
                  <div>• تطابق الرقم الإشاري: <span className="font-mono text-emerald-700">{refNumber}</span></div>
                  <div>• تطابق المبلغ والعملة: <span className="font-bold text-emerald-700">{financialAmount} {currency}</span></div>
                  <div>• كلمات البحث المباشرة: <span className="font-bold text-emerald-700">{keywords.length} كلمة مفتاحية</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons: Save & Index vs Cancel */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                إلغاء
              </button>
            )}

            <button
              type="button"
              id="btn-commit-ocr-record"
              onClick={handleCommit}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-950/20 text-sm transition transform hover:-translate-y-0.5"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <span>{saveButtonLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
