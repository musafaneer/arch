import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  QrCode, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  Clock, 
  Lock, 
  Stamp, 
  Award,
  Layers,
  Search,
  Eye,
  Scale,
  AlertTriangle,
  History,
  Trash2,
  Sparkles,
  Contrast,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  VolumeX,
  User,
  ChevronDown,
  CheckCircle2,
  Sliders,
  Sun,
  Moon,
  HelpCircle,
  Glasses,
  Tablet,
  ClipboardCheck,
  MapPin,
  CheckSquare,
  Square,
  FileCheck2,
  FileSpreadsheet
} from "lucide-react";
import { 
  ArchivedDocument, 
  ReadingContrastTheme, 
  ReadingFontSize, 
  ReadingLineSpacing,
  ReadingFontFamily,
  ReadingModeSettings, 
  VaultUser 
} from "../types";
import { CertifiedPdfExportModal } from "./CertifiedPdfExportModal";
import { AuditLogExportModal } from "./AuditLogExportModal";
import { useToast } from "../context/ToastContext";
import { ComfortableReadingToolbar, THEME_PALETTES } from "./ComfortableReadingToolbar";
import { formatRetentionCountdown } from "../utils/retentionLifecycle";
import { VAULT_SYSTEM_USERS } from "../utils/vaultCrypto";
import { OcrVerificationEditor } from "./OcrVerificationEditor";
import { FinancialDecisionsTimeline } from "./FinancialDecisionsTimeline";
import { SecurePrintModal } from "./SecurePrintModal";

interface DocumentViewerModalProps {
  document: ArchivedDocument;
  onClose: () => void;
  onOpenExtend?: (doc: ArchivedDocument) => void;
  onOpenDisposal?: (doc: ArchivedDocument) => void;
  currentUser?: VaultUser;
  onSwitchUser?: (user: VaultUser) => void;
  onUpdateDocument?: (doc: ArchivedDocument) => void;
  onRecordPrintAudit?: (docId: string, auditEntry: { user: string; timestamp: string; action: string; note: string }) => void;
}

// Visual font sizes configuration with tailored scaling for both document facsimile and OCR text
export const FONT_SIZES_CONFIG: {
  id: ReadingFontSize;
  label: string;
  percent: string;
  badgeLabel: string;
  docTextClass: string;
  ocrTextClass: string;
  step: number;
}[] = [
  { id: "small", label: "A-", percent: "85%", badgeLabel: "85% (مصغر)", docTextClass: "text-sm sm:text-base", ocrTextClass: "text-xs leading-normal", step: 0 },
  { id: "normal", label: "A", percent: "100%", badgeLabel: "100% (عادي)", docTextClass: "text-base sm:text-lg", ocrTextClass: "text-sm leading-relaxed", step: 1 },
  { id: "medium", label: "A+", percent: "120%", badgeLabel: "120% (مكبّر)", docTextClass: "text-lg sm:text-xl", ocrTextClass: "text-base leading-relaxed", step: 2 },
  { id: "large", label: "A++", percent: "140%", badgeLabel: "140% (كبير)", docTextClass: "text-xl sm:text-2xl", ocrTextClass: "text-lg leading-loose", step: 3 },
  { id: "extra-large", label: "A+++", percent: "170%", badgeLabel: "170% (كبير جداً)", docTextClass: "text-2xl sm:text-3xl", ocrTextClass: "text-xl leading-loose", step: 4 },
  { id: "huge", label: "A★★", percent: "210%", badgeLabel: "210% (فائق لذوي الإعاقة البصرية)", docTextClass: "text-3xl sm:text-4xl", ocrTextClass: "text-2xl leading-loose", step: 5 },
];

const DEFAULT_READING_SETTINGS: ReadingModeSettings = {
  isEnabled: false,
  theme: "parchment",
  fontSize: "normal",
  lineSpacing: "relaxed",
  fontFamily: "amiri",
  dimSurroundings: false,
  highContrast: false,
  highContrastType: "black_on_white",
  boldText: false
};

const USER_PREFS_STORAGE_PREFIX = "ly_mof_viewer_preferences_";

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
  onOpenExtend,
  onOpenDisposal,
  currentUser = VAULT_SYSTEM_USERS[0],
  onSwitchUser,
  onUpdateDocument,
  onRecordPrintAudit
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"visual" | "metadata" | "retention" | "decisions_timeline" | "audit" | "crypto" | "field_inspection" | "ocr_editor">("visual");
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isCertifiedPdfModalOpen, setIsCertifiedPdfModalOpen] = useState<boolean>(false);
  const [isSecurePrintModalOpen, setIsSecurePrintModalOpen] = useState<boolean>(false);
  const [isAuditExportModalOpen, setIsAuditExportModalOpen] = useState<boolean>(false);

  // Field Inspection states for Tablet Inspection Teams
  const [inspectionChecks, setInspectionChecks] = useState<{
    physicalDocMatched: boolean;
    sealIntegrityVerified: boolean;
    noMoistureOrDamage: boolean;
    barcodeScanned: boolean;
    signatoriesIdentified: boolean;
  }>({
    physicalDocMatched: true,
    sealIntegrityVerified: true,
    noMoistureOrDamage: document.physicalCondition !== "أوراق تاريخية هشة",
    barcodeScanned: true,
    signatoriesIdentified: true
  });
  const [inspectionNotes, setInspectionNotes] = useState<string>("");
  const [inspectionSignedAt, setInspectionSignedAt] = useState<string | null>(null);

  const handleToggleInspectionCheck = (key: keyof typeof inspectionChecks) => {
    setInspectionChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignFieldAudit = () => {
    const now = new Date().toLocaleString("ar-LY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    setInspectionSignedAt(now);
    toast.success(
      "تم اعتماد وتوقيع محضر التفتيش الميداني اللوحي",
      `تم تثبيت المعاينة الميدانية رسمياً برقم إشاري [AUD-FIELD-${document.refNumber}] بواسطة المفتش [${activeUser.name}].`,
      { badge: "محضر تفتيش لوحي", duration: 4000 }
    );
  };
  
  // Local active user state (synced with currentUser prop, with ability to test preference memory across users)
  const [activeUser, setActiveUser] = useState<VaultUser>(currentUser);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  
  // Speech synthesis audio playback state for visually impaired researchers
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Synchronize when currentUser changes externally
  useEffect(() => {
    if (currentUser && currentUser.id !== activeUser.id) {
      setActiveUser(currentUser);
    }
  }, [currentUser]);

  // Load preferences tailored for a specific user ID
  const loadUserPreferences = (user: VaultUser): ReadingModeSettings => {
    try {
      const stored = localStorage.getItem(`${USER_PREFS_STORAGE_PREFIX}${user.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }

    // Smart default presets: if the user is the Academic Researcher (د. عمر الزنتاني),
    // default to accessible high-legibility configuration for historical research!
    if (user.role === "RESEARCHER" || user.id === "user-researcher") {
      return {
        ...DEFAULT_READING_SETTINGS,
        isEnabled: true,
        fontSize: "medium", // 120% default font size for researcher
        theme: "high_contrast",
        highContrast: true,
        highContrastType: "black_on_white",
        boldText: true,
        savedForUserId: user.id,
        savedForUserName: user.name
      };
    }

    return {
      ...DEFAULT_READING_SETTINGS,
      savedForUserId: user.id,
      savedForUserName: user.name
    };
  };

  // State for reading & display settings
  const [readingSettings, setReadingSettings] = useState<ReadingModeSettings>(() => {
    return loadUserPreferences(activeUser);
  });

  // Track last saved timestamp feedback
  const [lastSavedFeedback, setLastSavedFeedback] = useState<string | null>(null);

  // When activeUser changes, load that user's specific saved preferences
  useEffect(() => {
    const loaded = loadUserPreferences(activeUser);
    setReadingSettings(loaded);
    setLastSavedFeedback(loaded.lastSavedAt || null);
  }, [activeUser.id]);

  // Save settings immediately to localStorage under the active user's specific key
  const persistSettings = (newSettings: ReadingModeSettings, userToSave = activeUser) => {
    try {
      const nowFormatted = new Date().toLocaleTimeString("ar-LY", { 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
      });
      const payload: ReadingModeSettings = {
        ...newSettings,
        savedForUserId: userToSave.id,
        savedForUserName: userToSave.name,
        lastSavedAt: nowFormatted
      };
      localStorage.setItem(`${USER_PREFS_STORAGE_PREFIX}${userToSave.id}`, JSON.stringify(payload));
      localStorage.setItem("ly_mof_reading_mode", JSON.stringify(payload));
      setLastSavedFeedback(nowFormatted);
    } catch (e) {
      console.error("Failed to persist user display preferences", e);
    }
  };

  // Helper to update state and auto-save
  const updateSettings = (updater: (prev: ReadingModeSettings) => ReadingModeSettings) => {
    setReadingSettings((prev) => {
      const updated = updater(prev);
      persistSettings(updated);
      return updated;
    });
  };

  // Switch user profile and load their preferences
  const handleSelectUser = (user: VaultUser) => {
    setActiveUser(user);
    setShowUserDropdown(false);
    if (onSwitchUser) {
      onSwitchUser(user);
    }
    const userPrefs = loadUserPreferences(user);
    setReadingSettings(userPrefs);
    toast.info(
      "تم تحميل تفضيلات العرض للمستخدم",
      `تم استرجاع إعدادات الخط والتباين المحفوظة لحساب [${user.name}] بنجاح.`,
      { badge: "تفضيلات المستخدم", duration: 3000 }
    );
  };

  // Reset preferences for current user
  const handleResetPreferences = () => {
    const freshDefault: ReadingModeSettings = {
      ...DEFAULT_READING_SETTINGS,
      savedForUserId: activeUser.id,
      savedForUserName: activeUser.name
    };
    setReadingSettings(freshDefault);
    persistSettings(freshDefault);
    toast.info(
      "تمت استعادة الإعدادات الافتراضية",
      `تمت استعادة الإعدادات المعيارية لعرض الوثائق لحساب [${activeUser.name}].`,
      { badge: "استعادة", duration: 3000 }
    );
  };

  // Quick Font Scaling Actions
  const handleIncreaseFontSize = () => {
    const currentIndex = FONT_SIZES_CONFIG.findIndex(f => f.id === readingSettings.fontSize);
    if (currentIndex < FONT_SIZES_CONFIG.length - 1) {
      const nextSize = FONT_SIZES_CONFIG[currentIndex + 1].id;
      updateSettings((prev) => ({
        ...prev,
        isEnabled: true,
        fontSize: nextSize
      }));
      toast.info(
        `تم تكبير الخط إلى ${FONT_SIZES_CONFIG[currentIndex + 1].percent}`,
        `حجم الخط الأرشيفي مكبّر الآن لتسهيل القراءة والمراجعة.`,
        { badge: "تكبير الخط", duration: 2000 }
      );
    }
  };

  const handleDecreaseFontSize = () => {
    const currentIndex = FONT_SIZES_CONFIG.findIndex(f => f.id === readingSettings.fontSize);
    if (currentIndex > 0) {
      const prevSize = FONT_SIZES_CONFIG[currentIndex - 1].id;
      updateSettings((prev) => ({
        ...prev,
        isEnabled: true,
        fontSize: prevSize
      }));
      toast.info(
        `تم تصغير الخط إلى ${FONT_SIZES_CONFIG[currentIndex - 1].percent}`,
        `حجم الخط الأرشيفي تم تعديله.`,
        { badge: "تصغير الخط", duration: 2000 }
      );
    }
  };

  const handleSetFontSizeDirect = (sizeId: ReadingFontSize) => {
    updateSettings((prev) => ({
      ...prev,
      isEnabled: true,
      fontSize: sizeId
    }));
  };

  // Quick High Contrast Toggle
  const handleToggleHighContrast = () => {
    const nextHighContrast = !readingSettings.highContrast;
    const nextTheme: ReadingContrastTheme = nextHighContrast
      ? (readingSettings.highContrastType === "yellow_on_black" 
          ? "yellow_on_black" 
          : readingSettings.highContrastType === "white_on_black" 
          ? "high_contrast_dark" 
          : "high_contrast")
      : "parchment";

    updateSettings((prev) => ({
      ...prev,
      isEnabled: true,
      highContrast: nextHighContrast,
      theme: nextTheme
    }));

    toast.info(
      nextHighContrast ? "تم تفعيل نمط التباين العالي (High Contrast)" : "تم تعطيل نمط التباين العالي",
      nextHighContrast 
        ? "ألوان حادة وإيضاح فائق للأختام والنصوص لمساعدة الباحثين وضعاف البصر (WCAG AAA)." 
        : "تمت العودة للنمط الورقي العادي.",
      { badge: "تباين عالي", duration: 3500 }
    );
  };

  // Select high contrast mode
  const handleSelectContrastType = (type: "black_on_white" | "yellow_on_black" | "white_on_black") => {
    const themeMap: Record<string, ReadingContrastTheme> = {
      black_on_white: "high_contrast",
      yellow_on_black: "yellow_on_black",
      white_on_black: "high_contrast_dark"
    };

    updateSettings((prev) => ({
      ...prev,
      isEnabled: true,
      highContrast: true,
      highContrastType: type,
      theme: themeMap[type]
    }));

    toast.success(
      "تم تطبيق نمط التباين المحدد",
      type === "yellow_on_black" 
        ? "نمط الأصفر على الأسود المعتمد طبياً لضعف البصر وحساسية الوهج." 
        : type === "white_on_black" 
        ? "نمط أبيض فاقع على أسود داكن بدون توهج." 
        : "نمط حبر فاحم على ورق أبيض ناصع 100%.",
      { badge: "تباين مخصص", duration: 3000 }
    );
  };

  // Toggle bold text
  const handleToggleBold = () => {
    const nextBold = !readingSettings.boldText;
    updateSettings((prev) => ({
      ...prev,
      boldText: nextBold
    }));
    toast.info(
      nextBold ? "تم تفعيل الخط السميك (Bold Text)" : "تم إلغاء الخط السميك",
      nextBold ? "تمت زيادة سماكة خطوط الحروف لتعزيز القراءة." : "الخط بسماكته العادية.",
      { badge: "سماكة الخط", duration: 2500 }
    );
  };

  // Text-to-Speech audio reader for visually impaired researchers
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("المتصفح لا يدعم القراءة الصوتية", "يرجى استخدام متصفح حديث يدعم تقنية Web Speech API.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast.info("تم إيقاف القراءة الصوتية", "تم إيقاف النطق الصوتي للوثيقة.", { badge: "صوت" });
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `وثيقة وزارة المالية الليبية. العنوان: ${document.title}. الجهة الصادرة: ${document.department}. الرقم الإشاري: ${document.refNumber}. التاريخ: ${document.gregorianDate}. المبلغ المالي: ${document.financialAmount} ${document.currency}. ملخص الوثيقة: ${document.summary}. نص التفريغ الأرشيفي الكامل: ${document.ocrText}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = "ar-SA";
      utterance.rate = 0.92;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      toast.success(
        "بدء القراءة الصوتية للوثيقة",
        "جاري نطق بيانات وتفريغ الوثيقة صوتياً لمساعدة الباحثين وضعاف البصر.",
        { badge: "إتاحة صوتية", duration: 4000 }
      );
    }
  };

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keyboard accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.altKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        handleIncreaseFontSize();
      } else if (e.altKey && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        handleDecreaseFontSize();
      } else if (e.altKey && (e.key === "0")) {
        e.preventDefault();
        handleSetFontSizeDirect("normal");
      } else if (e.altKey && (e.key === "c" || e.key === "C" || e.key === "ؤ")) {
        e.preventDefault();
        handleToggleHighContrast();
      } else if (e.altKey && (e.key === "b" || e.key === "B" || e.key === "لا")) {
        e.preventDefault();
        handleToggleBold();
      } else if (e.altKey && (e.key === "s" || e.key === "S" || e.key === "س")) {
        e.preventDefault();
        handleToggleSpeech();
      } else if (e.altKey && (e.key === "r" || e.key === "R" || e.key === "ق")) {
        e.preventDefault();
        updateSettings((prev) => ({
          ...prev,
          isEnabled: !prev.isEnabled
        }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readingSettings, onClose]);

  const handleCopyOCR = () => {
    navigator.clipboard.writeText(document.ocrText);
    setCopiedText(true);
    toast.success(
      "تم نسخ النص المفرغ (OCR)",
      "تم حفظ النص المفرغ للوثيقة في حافظة الجهاز بنجاح للاستخدام الرسمي.",
      { badge: "نسخ نص", duration: 3500 }
    );
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePrintDossier = () => {
    toast.info(
      "جاري إرسال الوثيقة للطباعة",
      "تم تجهيز الإفادة الأرشيفية للطباعة المباشرة عبر طابعة النظام.",
      { badge: "طباعة إفادة", duration: 3500 }
    );
    window.print();
  };

  // Active palette configuration for comfortable reading
  const activePalette = readingSettings.isEnabled ? THEME_PALETTES[readingSettings.theme] : null;

  // Active font size configuration
  const currentFont = useMemo(() => {
    return FONT_SIZES_CONFIG.find(f => f.id === readingSettings.fontSize) || FONT_SIZES_CONFIG[1];
  }, [readingSettings.fontSize]);

  // Font size multiplier class
  const fontSizeClass = currentFont.docTextClass;

  // Line spacing class
  const lineSpacingClass = !readingSettings.isEnabled
    ? "leading-[2.2]"
    : readingSettings.lineSpacing === "compact"
    ? "leading-[1.9]"
    : readingSettings.lineSpacing === "relaxed"
    ? "leading-[2.4]"
    : "leading-[3.0]";

  // Font family class
  const fontFamilyClass = readingSettings.isEnabled && readingSettings.fontFamily === "cairo"
    ? "font-['Cairo',sans-serif]"
    : "font-['Amiri',serif]";

  // Bold text class
  const boldTextClass = readingSettings.boldText ? "font-bold tracking-normal" : "font-normal";

  // Retention Lifecycle details
  const retention = document.retentionLifecycle;
  const countdown = retention ? formatRetentionCountdown(retention) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="bg-[#0f2d1e] text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between border-b border-amber-500/30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60 text-amber-300 font-bold">
                  {document.refNumber}
                </span>
                <span className="text-xs text-emerald-200/90 font-medium truncate">
                  {document.era}
                </span>
                {readingSettings.highContrast && (
                  <span className="text-[10px] bg-yellow-400 text-slate-950 px-2 py-0.2 rounded font-black uppercase tracking-wider">
                    تباين عالي WCAG AAA
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold font-['Amiri',serif] text-amber-100 truncate mt-0.5" title={document.title}>
                {document.title}
              </h2>
            </div>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Font Sizer buttons in Top Bar */}
            <div className="inline-flex items-center bg-emerald-950/90 rounded-lg p-0.5 border border-emerald-700/60 text-emerald-200">
              <button
                type="button"
                onClick={handleDecreaseFontSize}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-emerald-900 text-amber-300 font-bold transition text-xs"
                title="تصغير الخط (Alt + -)"
                aria-label="تصغير الخط"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => handleSetFontSizeDirect("normal")}
                className="px-2 h-7 text-[11px] font-bold text-amber-200 hover:bg-emerald-900 rounded transition font-mono"
                title="إعادة ضبط الخط إلى 100% (Alt + 0)"
              >
                {currentFont.percent}
              </button>
              <button
                type="button"
                onClick={handleIncreaseFontSize}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-emerald-900 text-amber-300 font-bold transition text-xs"
                title="تكبير الخط (Alt + +)"
                aria-label="تكبير الخط"
              >
                A+
              </button>
            </div>

            {/* Quick High Contrast Toggle button in Top Bar */}
            <button
              type="button"
              onClick={handleToggleHighContrast}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border shadow-xs ${
                readingSettings.highContrast 
                  ? "bg-yellow-400 text-black border-yellow-300 font-black" 
                  : "bg-emerald-950/70 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900"
              }`}
              title="تفعيل / تعطيل التباين العالي (Alt + C) لمساعدة ضعاف البصر والباحثين"
            >
              <Contrast className="w-3.5 h-3.5" />
              <span>{readingSettings.highContrast ? "تباين عالي: مُفعّل" : "تباين عالي"}</span>
            </button>

            {/* Text-to-Speech audio reader button */}
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                isSpeaking 
                  ? "bg-amber-500 text-slate-950 border-amber-300 animate-pulse" 
                  : "bg-emerald-950/70 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900"
              }`}
              title="قراءة نص الوثيقة صوتياً (Alt + S)"
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSpeaking ? "إيقاف الصوت" : "استماع صوتي"}</span>
            </button>

            {/* Certified PDF Export */}
            <button
              type="button"
              onClick={() => setIsCertifiedPdfModalOpen(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow transition border border-amber-300"
              title="تصدير وثيقة PDF موثقة رقمياً وممهورة بختم وزارة المالية الرسمي"
            >
              <Stamp className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden md:inline">تصدير PDF موثق</span>
            </button>

            {/* Secure Print button with Watermark */}
            <button
              type="button"
              onClick={() => setIsSecurePrintModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-900/90 hover:bg-emerald-800 text-emerald-100 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold border border-emerald-600/80 transition shadow-xs"
              title="الطباعة الآمنة للوثيقة مع علامة مائية مخصصة باسمك وتاريخ اليوم"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">طباعة آمنة بعلامة مائية</span>
              <span className="sm:hidden">طباعة</span>
            </button>

            {/* Close modal button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-emerald-950 hover:bg-red-900/80 text-emerald-200 hover:text-white flex items-center justify-center transition border border-emerald-800/80"
              title="إغلاق النافذة (Esc)"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Accessibility & Researcher Display Preferences Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-100 px-4 sm:px-6 py-2.5 border-b border-slate-700 shadow-inner">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
            {/* Left Controls: Font Zoom Stepper & High Contrast Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {/* Accessibility Category Tag */}
              <div className="flex items-center gap-1.5 text-amber-400 font-bold pr-1">
                <Glasses className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">إتاحة بصرية للباحثين:</span>
              </div>

              {/* Quick Font Size Steppers & Presets */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400 px-1 font-semibold flex items-center gap-1">
                  <Type className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">الخط:</span>
                </span>
                
                <button
                  type="button"
                  onClick={handleDecreaseFontSize}
                  className="w-6 h-6 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-amber-300 font-black transition border border-slate-600"
                  title="تصغير الخط (Alt + -)"
                >
                  A-
                </button>

                <div className="flex items-center gap-0.5">
                  {FONT_SIZES_CONFIG.map((f) => {
                    const isSelected = readingSettings.fontSize === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSetFontSizeDirect(f.id)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                        title={`ضبط الخط إلى ${f.badgeLabel}`}
                      >
                        {f.percent}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleIncreaseFontSize}
                  className="w-6 h-6 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-amber-300 font-black transition border border-slate-600"
                  title="تكبير الخط (Alt + +)"
                >
                  A+
                </button>

                <button
                  type="button"
                  onClick={() => handleSetFontSizeDirect("normal")}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="إعادة ضبط حجم الخط (100%)"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* High Contrast Presets Selector */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={handleToggleHighContrast}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    readingSettings.highContrast
                      ? "bg-yellow-400 text-black font-black"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600"
                  }`}
                  title="تبديل التباين العالي الفوري"
                >
                  <Contrast className="w-3 h-3" />
                  <span>{readingSettings.highContrast ? "تباين عالي: نشط" : "تباين عالي"}</span>
                </button>

                {readingSettings.highContrast && (
                  <div className="inline-flex items-center gap-1 pr-1 border-r border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleSelectContrastType("black_on_white")}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                        readingSettings.highContrastType === "black_on_white"
                          ? "bg-white text-black font-black ring-1 ring-amber-400"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                      title="حبر فاحم على أبيض ناصع 100%"
                    >
                      أبيض/أسود
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectContrastType("yellow_on_black")}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                        readingSettings.highContrastType === "yellow_on_black"
                          ? "bg-yellow-400 text-black font-black ring-1 ring-yellow-300"
                          : "text-yellow-300 hover:bg-slate-800"
                      }`}
                      title="أصفر فاقع على أسود فاحم (الأمثل لضعف البصر Low Vision)"
                    >
                      أصفر/أسود
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectContrastType("white_on_black")}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                        readingSettings.highContrastType === "white_on_black"
                          ? "bg-black text-white border border-white font-black"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                      title="أبيض فاقع على خلفية سوداء داكنة"
                    >
                      ليلي داكن
                    </button>
                  </div>
                )}
              </div>

              {/* Bold Text Switcher */}
              <button
                type="button"
                onClick={handleToggleBold}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition border flex items-center gap-1 ${
                  readingSettings.boldText
                    ? "bg-amber-600 text-white border-amber-500 shadow-xs"
                    : "bg-slate-950/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                }`}
                title="تغليظ الخط لجعل الحروف التاريخية والأرقام أكثر وضوحاً (Alt + B)"
              >
                <span className="font-black">B</span>
                <span className="hidden sm:inline">{readingSettings.boldText ? "خط سميك ✓" : "خط سميك"}</span>
              </button>

              {/* Font Family Switcher */}
              <div className="hidden sm:flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => updateSettings(p => ({ ...p, isEnabled: true, fontFamily: "amiri" }))}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    readingSettings.fontFamily === "amiri"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="خط النسخ المخطوط (أميري)"
                >
                  نسخي
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings(p => ({ ...p, isEnabled: true, fontFamily: "cairo" }))}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    readingSettings.fontFamily === "cairo"
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="خط حديث هندسي واضح (القاهرة)"
                >
                  كوفي
                </button>
              </div>
            </div>

            {/* Right Controls: User Profile Memory & Persistence Indicator */}
            <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
              {/* Active User Account Badge with memory indicator */}
              <div className="relative">
                <div
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-200 cursor-pointer hover:border-amber-400 transition"
                  title="انقر لتبديل حساب الباحث واختبار حفظ التفضيلات لكل مستخدم"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-200 truncate max-w-[140px]">
                    {activeUser.name}
                  </span>
                  <span className="text-[9px] bg-slate-800 text-emerald-300 px-1 py-0.2 rounded font-mono">
                    {activeUser.role === "RESEARCHER" ? "باحث" : activeUser.role === "CHIEF_CUSTODIAN" ? "أمين" : "مفتش"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>

                {/* Switch User Dropdown */}
                {showUserDropdown && (
                  <div className="absolute left-0 mt-1 w-64 bg-slate-900 border border-amber-500/50 rounded-xl shadow-2xl z-50 p-1.5 text-xs">
                    <div className="px-2 py-1 text-[10px] text-amber-300 font-bold border-b border-slate-800 mb-1">
                      تبديل الحساب لحفظ تفضيلات العرض المستقلة:
                    </div>
                    {VAULT_SYSTEM_USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className={`w-full text-right px-2.5 py-1.5 rounded-lg transition flex items-center justify-between gap-2 ${
                          u.id === activeUser.id 
                            ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <div>
                          <div className="font-bold">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.title}</div>
                        </div>
                        {u.id === activeUser.id && (
                          <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                    <div className="pt-1 mt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          handleResetPreferences();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-right px-2 py-1 text-[10px] text-red-300 hover:bg-red-950/40 rounded transition"
                      >
                        استعادة الإعدادات الافتراضية لحساب {activeUser.name}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Saved Status Indicator */}
              <div 
                className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60"
                title={`تفضيلات العرض (حجم الخط، التباين، والنمط) تحفظ تلقائياً لكل مستخدم`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="font-medium">
                  {lastSavedFeedback ? `محفوظة بحسابك (${lastSavedFeedback})` : "محفوظة بحسابك"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("visual")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "visual"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              المسح الضوئي والأختام التاريخية
            </button>

            <button
              onClick={() => setActiveTab("metadata")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "metadata"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              التفريغ النصي والفهرسة الأرشيفية
            </button>

            <button
              onClick={() => setActiveTab("retention")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "retention"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>دورة حياة الحفظ واللوائح</span>
              {retention && (retention.status === "expiring_soon" || retention.status === "expired") && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("decisions_timeline")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "decisions_timeline"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-800" />
              <span>سجل تعقب القرارات المالية</span>
              <span className="bg-amber-100 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-amber-300">
                {(retention?.extensions?.length || 0) + (retention?.disposalRecord ? 1 : 0) + 1}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "audit"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              سجل العهدة والتتبع اللاورقي
            </button>

            <button
              onClick={() => setActiveTab("crypto")}
              className={`px-4 py-2.5 md:min-h-[44px] text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "crypto"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>الأدلة التشفيرية والخزينة</span>
            </button>

            <button
              onClick={() => setActiveTab("ocr_editor")}
              className={`px-4 py-2.5 md:min-h-[44px] text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "ocr_editor"
                  ? "border-emerald-800 text-emerald-950 bg-white shadow-sm font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>تدقيق وتحرير OCR والبحث</span>
              <span className="bg-emerald-100 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                محرر
              </span>
            </button>

            <button
              onClick={() => setActiveTab("field_inspection")}
              className={`px-4 py-2.5 md:min-h-[44px] text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "field_inspection"
                  ? "border-amber-600 text-amber-950 bg-amber-50/70 shadow-sm font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tablet className="w-3.5 h-3.5 text-amber-600" />
              <span>المعاينة والتفتيش الميداني</span>
              <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                لوحي
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:block whitespace-nowrap mr-2">
            معرف ISAD(G): {document.storageLocation}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 transition-colors duration-300 ${
          readingSettings.isEnabled && (readingSettings.dimSurroundings || readingSettings.highContrastType === "yellow_on_black" || readingSettings.theme === "yellow_on_black" || readingSettings.theme === "night_velvet")
            ? "bg-[#070b09]"
            : "bg-slate-50/50"
        }`}>
          {activeTab === "visual" && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Ergonomic Tuning Toolbar */}
              <ComfortableReadingToolbar
                settings={readingSettings}
                onChangeSettings={(newSettings) => {
                  updateSettings(() => newSettings);
                }}
                onReset={handleResetPreferences}
              />

              {/* Authentic Paper Document Rendering with Dynamic Comfortable Reading & High Contrast Mode */}
              <div 
                style={{
                  backgroundColor: activePalette ? activePalette.paperBg : "#fcfaf2",
                  color: activePalette ? activePalette.paperText : "#1e293b",
                  borderColor: readingSettings.highContrast 
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "#facc15" : readingSettings.highContrastType === "white_on_black" ? "#ffffff" : "#000000")
                    : (activePalette ? activePalette.paperBorder : "#dcd3bc")
                }}
                className={`border-4 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-all duration-300 print:shadow-none print:border-none ${fontFamilyClass} ${boldTextClass} ${
                  readingSettings.highContrast ? "shadow-2xl" : ""
                }`}
              >
                {/* Vintage paper subtle texture overlay (hidden in high contrast mode to avoid visual noise for visually impaired) */}
                {!readingSettings.highContrast && (
                  <div className="absolute inset-0 bg-[radial-gradient(#d3c5a3_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>
                )}

                {/* Top Official Watermark & Header */}
                <div className={`relative text-center border-b-2 pb-5 mb-6 ${
                  readingSettings.highContrast 
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400" : "border-slate-800")
                    : "border-double border-amber-900/30"
                }`}>
                  {/* Seal Stamp based on Era */}
                  {document.era.includes("المملكة") && (
                    <div className={`inline-block border-2 rounded-full px-4 py-1 text-xs font-black mb-2 ${
                      readingSettings.highContrast 
                        ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400 text-yellow-300 bg-black" : "border-black text-black bg-white")
                        : "border-amber-800/80 text-amber-900 bg-amber-50"
                    }`}>
                      المملكة الليبية المتحدة - ديوان قصر الخلد
                    </div>
                  )}
                  {document.era.includes("الجمهورية") && (
                    <div className={`inline-block border-2 rounded-full px-4 py-1 text-xs font-black mb-2 ${
                      readingSettings.highContrast 
                        ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400 text-yellow-300 bg-black" : "border-black text-black bg-white")
                        : "border-emerald-900/80 text-emerald-950 bg-emerald-50"
                    }`}>
                      الجمهورية العربية الليبية - وزارة الخزانة العامة
                    </div>
                  )}
                  {document.era.includes("دولة ليبيا الحديثة") && (
                    <div className={`inline-block border-2 rounded-full px-4 py-1 text-xs font-black mb-2 ${
                      readingSettings.highContrast 
                        ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400 text-yellow-300 bg-black" : "border-black text-black bg-white")
                        : "border-slate-800 text-slate-900 bg-slate-100"
                    }`}>
                      دولة ليبيا - وزارة المالية
                    </div>
                  )}

                  <h3 className={`text-xl sm:text-2xl font-bold leading-relaxed opacity-95 ${boldTextClass}`}>
                    {document.title}
                  </h3>

                  <div className={`flex flex-wrap items-center justify-between gap-2 mt-4 text-xs font-sans font-medium pt-2 border-t ${
                    readingSettings.highContrast 
                      ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-500/40 text-yellow-300" : "border-black text-black")
                      : "border-amber-900/15 opacity-85"
                  }`}>
                    <div>
                      <span className="opacity-75">الجهة: </span>
                      <span className="font-bold">{document.department}</span>
                    </div>
                    <div>
                      <span className="opacity-75">الرقم الإشاري: </span>
                      <span className="font-mono font-bold">{document.refNumber}</span>
                    </div>
                    <div>
                      <span className="opacity-75">التاريخ: </span>
                      <span className="font-bold">{document.gregorianDate} ({document.hijriDate})</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Wax / Ink Seal */}
                <div className={`absolute top-6 left-6 w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center text-center rotate-[-15deg] p-1 pointer-events-none select-none shadow-sm ${
                  readingSettings.highContrast 
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400 text-yellow-400 bg-black/80" : "border-black text-black bg-white")
                    : "border-red-800/70 text-red-900/80 bg-red-50/40"
                }`}>
                  <div className="text-[9px] font-bold">وزارة المالية</div>
                  <div className="w-12 h-0.5 bg-current my-0.5"></div>
                  <div className="text-[10px] font-bold font-mono">معتمد رسمياً</div>
                  <div className="text-[7px]">NATIONAL ARCHIVE</div>
                </div>

                {/* Document Body Text with Responsive Scaling & Contrast */}
                <div 
                  className={`relative ${fontSizeClass} ${lineSpacingClass} ${boldTextClass} whitespace-pre-line px-2 sm:px-6 my-6 border-r-4 ${
                    readingSettings.highContrast
                      ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400" : "border-black")
                      : readingSettings.isEnabled && readingSettings.theme === "night_velvet"
                      ? "border-emerald-600/50"
                      : "border-amber-800/40"
                  }`}
                >
                  {document.ocrText}
                </div>

                {/* Financial Callout Card inside Doc */}
                <div 
                  style={{
                    backgroundColor: readingSettings.highContrast
                      ? (readingSettings.highContrastType === "yellow_on_black" ? "#18181b" : readingSettings.highContrastType === "white_on_black" ? "#111827" : "#ffffff")
                      : readingSettings.isEnabled && readingSettings.theme === "night_velvet" 
                      ? "#17231c" 
                      : undefined,
                    color: readingSettings.highContrast 
                      ? (readingSettings.highContrastType === "yellow_on_black" ? "#fef08a" : readingSettings.highContrastType === "white_on_black" ? "#ffffff" : "#000000")
                      : undefined
                  }}
                  className={`relative my-6 p-4 rounded-xl font-sans flex flex-wrap items-center justify-between gap-3 border-2 ${
                    readingSettings.highContrast
                      ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400" : "border-black")
                      : "bg-amber-50/80 border-amber-300 text-slate-900"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold opacity-85">المبلغ المالي المعتمد في السجل:</div>
                    <div className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${
                      readingSettings.highContrast 
                        ? (readingSettings.highContrastType === "yellow_on_black" ? "text-yellow-300" : "text-black") 
                        : "text-emerald-800"
                    }`}>
                      {document.financialAmount}
                    </div>
                  </div>
                  <div className="text-xs text-right opacity-90">
                    <div>العملة: <span className="font-bold">{document.currency}</span></div>
                    <div>الحالة: <span className="font-bold">مقيد بالدفاتر المركزية</span></div>
                  </div>
                </div>

                {/* Bottom Signatures & Revenue Stamps */}
                <div className={`relative mt-8 pt-6 border-t-2 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end ${
                  readingSettings.highContrast 
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400" : "border-black") 
                    : "border-amber-900/20"
                }`}>
                  <div className="space-y-2">
                    <div className="text-xs font-sans font-bold opacity-80">طوابع الدمغة والتأشيرات:</div>
                    <div className="flex flex-wrap gap-2">
                      {document.stampsDetected.map((stamp, idx) => (
                        <span 
                          key={idx} 
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded font-sans border-2 font-bold ${
                            readingSettings.highContrast 
                              ? (readingSettings.highContrastType === "yellow_on_black" ? "bg-black text-yellow-300 border-yellow-400" : "bg-white text-black border-black") 
                              : "bg-red-50 text-red-900 border-red-200"
                          }`}
                        >
                          <Stamp className="w-3 h-3" />
                          {stamp}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-left font-sans space-y-2 sm:text-left">
                    <div className="text-xs font-bold opacity-80">المصادقة والاعتماد:</div>
                    {document.signatories.map((sig, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs font-bold border-b pb-1 ${
                          readingSettings.highContrast 
                            ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400/50 text-yellow-300" : "border-black text-black") 
                            : "border-slate-300/50"
                        }`}
                      >
                        {sig}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Digital Barcode & Seal of Archiving */}
                <div className={`relative mt-8 pt-4 border-t flex flex-wrap items-center justify-between text-xs font-sans opacity-90 ${
                  readingSettings.highContrast 
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "border-yellow-400" : "border-black") 
                    : "border-slate-300/60"
                }`}>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-8 h-8 text-current" />
                    <div>
                      <div className="font-mono font-bold">{document.barcode}</div>
                      <div className="text-[10px]">التحقق الرقمي اللاورقي لوزارة المالية</div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px]">
                    <div>ISAD(G): {document.storageLocation}</div>
                    <div className="font-bold">حفظ رقمي دائم (NON-REPUDIATION)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary and OCR text (Responsive to Font Size and High Contrast) */}
              <div className="lg:col-span-2 space-y-4">
                <div className={`p-5 rounded-xl border shadow-sm transition ${
                  readingSettings.highContrast
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "bg-black border-2 border-yellow-400 text-yellow-300" : "bg-white border-2 border-black text-black")
                    : "bg-white border-slate-200"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>التفريغ النصي الكامل (OCR)</span>
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        حجم الخط: {currentFont.percent}
                      </span>
                    </h4>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleSpeech}
                        className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded transition border ${
                          isSpeaking 
                            ? "bg-amber-500 text-slate-950 border-amber-400 animate-pulse" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                        }`}
                        title="قراءة النص صوتياً"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isSpeaking ? "إيقاف" : "استماع"}</span>
                      </button>

                      <button
                        onClick={handleCopyOCR}
                        className="flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-bold px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ النص</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* OCR Box scaling directly with the researcher's chosen font size and contrast */}
                  <div className={`p-4 rounded-lg border leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto ${fontFamilyClass} ${boldTextClass} ${currentFont.ocrTextClass} ${
                    readingSettings.highContrast
                      ? (readingSettings.highContrastType === "yellow_on_black" 
                          ? "bg-[#0a0a0a] text-yellow-300 border-2 border-yellow-400" 
                          : "bg-white text-black border-2 border-black font-semibold")
                      : "bg-slate-50 border-slate-200 text-slate-800 font-mono"
                  }`}>
                    {document.ocrText}
                  </div>
                </div>

                <div className={`p-5 rounded-xl border shadow-sm ${
                  readingSettings.highContrast
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "bg-black border-2 border-yellow-400 text-yellow-300" : "bg-white border-2 border-black text-black")
                    : "bg-white border-slate-200"
                }`}>
                  <h4 className="text-sm font-bold mb-2">الملخص والأثر المالي</h4>
                  <p className={`p-3 rounded-lg border leading-relaxed ${currentFont.ocrTextClass} ${boldTextClass} ${
                    readingSettings.highContrast 
                      ? (readingSettings.highContrastType === "yellow_on_black" ? "bg-black text-yellow-200 border-yellow-400" : "bg-white text-black border-black font-semibold")
                      : "bg-amber-50/50 text-slate-700 border-amber-200/60"
                  }`}>
                    {document.summary}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold">الكلمات المفتاحية للفهرسة:</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("ocr_editor")}
                        className="text-[11px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition"
                        title="فتح اقتراحات وتدقيق الوسوم الذكية المستخرجة من الـ OCR"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>اقتراح وسوم ذكية (Smart Tagging)</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {document.keywords.map((kw, idx) => (
                        <span 
                          key={idx} 
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                            readingSettings.highContrast
                              ? (readingSettings.highContrastType === "yellow_on_black" ? "bg-black text-yellow-300 border-yellow-400" : "bg-white text-black border-black")
                              : "bg-emerald-50 text-emerald-900 border-emerald-200"
                          }`}
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Structured Metadata Sidebar */}
              <div className="space-y-4">
                <div className={`p-5 rounded-xl border shadow-sm space-y-3 text-xs ${
                  readingSettings.highContrast
                    ? (readingSettings.highContrastType === "yellow_on_black" ? "bg-black border-2 border-yellow-400 text-yellow-300" : "bg-white border-2 border-black text-black")
                    : "bg-white border-slate-200"
                }`}>
                  <h4 className="text-sm font-bold pb-2 border-b border-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>بيانات بطاقة الوثيقة الرسمية</span>
                  </h4>

                  <div>
                    <span className="text-slate-500 block">الرقم الإشاري:</span>
                    <span className="font-mono font-bold text-slate-900">{document.refNumber}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">الحقبة التاريخية:</span>
                    <span className="font-bold text-amber-900">{document.era}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">المصلحة / الإدارة:</span>
                    <span className="font-bold text-slate-900">{document.department}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">نوع المعاملة:</span>
                    <span className="font-bold text-slate-900">{document.docType}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">المبلغ المالي:</span>
                    <span className="font-bold text-emerald-800 text-sm font-mono">{document.financialAmount}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">درجة السرية:</span>
                    <span className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                      document.classification === "سري للغاية" || document.classification === "سري"
                        ? "bg-red-100 text-red-900 font-black"
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      {document.classification}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">الموقع الأرشيفي المرجعي:</span>
                    <span className="font-mono text-slate-800 bg-slate-100 p-1.5 rounded block mt-0.5">
                      {document.storageLocation}
                    </span>
                  </div>

                  {document.subWarehouseOrigin && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg space-y-1">
                      <span className="text-emerald-900 font-bold block text-xs">بيانات المستودع الفرعي الميداني:</span>
                      <div className="text-[11px] text-emerald-800">
                        المستودع: <strong>{document.subWarehouseOrigin.warehouseName}</strong> ({document.subWarehouseOrigin.warehouseCode})
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        القاعة: {document.subWarehouseOrigin.hallName} | الرف: {document.subWarehouseOrigin.rackNumber} | الصندوق: {document.subWarehouseOrigin.boxNumber}
                      </div>
                    </div>
                  )}

                  {document.scannerHardwareInfo && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg space-y-1">
                      <span className="text-amber-900 font-bold block text-xs">الماسح الضوئي المباشر (TWAIN/WIA):</span>
                      <div className="text-[11px] text-slate-800">
                        الجهاز: <strong>{document.scannerHardwareInfo.scannerName}</strong>
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        البروتوكول: [{document.scannerHardwareInfo.protocol}] | الدقة: {document.scannerHardwareInfo.resolutionDpi} DPI | التغذية: {document.scannerHardwareInfo.feederType}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block">جودة المسح والترميم:</span>
                    <span className="font-bold text-emerald-800">{document.scanQuality}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">الحالة الفيزيائية للأصل:</span>
                    <span className="font-bold text-slate-700">{document.physicalCondition}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "retention" && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Retention Status Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-['Amiri',serif]">
                        دورة حياة الحفظ وفق اللوائح الوطنية الليبية
                      </h3>
                      <p className="text-xs text-slate-500">
                        تصنيف الوثيقة وجدول الحفظ المالي المعتمد بوزارة المالية وديوان المحاسبة
                      </p>
                    </div>
                  </div>

                  {countdown && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${countdown.badgeClass}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{countdown.label}</span>
                    </span>
                  )}
                </div>

                {/* Key Lifecycle Attributes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-1">فئة سياسة الحفظ:</span>
                    <span className="font-bold text-slate-900 leading-tight block">
                      {retention?.policyCategory || "حفظ مالي نظامي"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-1">المدة النظامية:</span>
                    <span className="font-bold text-emerald-900 font-mono text-sm">
                      {retention?.retentionYears === 0 ? "حفظ دائم" : `${retention?.retentionYears} سنوات`}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-1">تاريخ الأرشفة:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {retention?.archivedDate || document.gregorianDate}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-1">تاريخ انتهاء الدورة:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {retention?.expiryDate === "9999-12-31" ? "حفظ سيادي أبدي" : retention?.expiryDate}
                    </span>
                  </div>
                </div>

                {/* Legal Basis Callout */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>السند القانوني واللائحي المنظم للحفظ:</span>
                  </div>
                  <p className="leading-relaxed text-slate-700 pr-6">
                    {retention?.legalBasis || "قانون النظام المالي للدولة ولائحة الميزانية والحسابات والتصنيف الأرشيفي الوطني."}
                  </p>
                </div>

                {/* Direct Action Buttons for Retention (Extend or Disposal) */}
                {retention?.retentionYears !== 0 ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">الإجراءات النظامية المتاحة:</div>
                      <div className="text-[11px] text-slate-500">
                        يمكن تمديد فترة الحفظ بقرار معتمد أو إحالة الوثيقة للجنة الإتلاف الوطنية
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenExtend?.(document);
                        }}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>تمديد فترة الحفظ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDisposal?.(document);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>إحالة للإتلاف النظامي</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                    <span>
                      <strong>حفظ سيادي محصّن:</strong> هذه الوثيقة مصنفة ضمن الأرشيف التاريخي السيادي لوزارة المالية بموجب المادة 4 من قانون الأرشيف الوطني رقم 24 لسنة 2012 ولا يجوز إتلافها أو إسقاط تقادمها المالي أبداً.
                    </span>
                  </div>
                )}
              </div>

              {/* Retention Extensions History */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-800" />
                    سجل قرارات تمديد الحفظ المالي المعتمدة
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {retention?.extensions?.length || 0} تمديدات مسجلة
                  </span>
                </div>

                {retention?.extensions && retention.extensions.length > 0 ? (
                  <div className="space-y-3">
                    {retention.extensions.map((ext) => (
                      <div
                        key={ext.id}
                        className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-950 font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                            قرار رقم: {ext.decisionNumber}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">{ext.extendedAt}</span>
                        </div>
                        <p className="text-slate-700 font-sans">
                          <strong>المبرر المالي: </strong>{ext.justification}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-emerald-200/50">
                          <span>المعتمد: <strong>{ext.extendedBy}</strong></span>
                          <span>
                            تمديد: <strong>+{ext.extensionYears} سنوات</strong> (تاريخ الانتهاء الجديد: {ext.newExpiryDate})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    لم يتم تطبيق أي تمديدات استثنائية على هذه الوثيقة حتى الآن، وتخضع لجدول الحفظ النظامي القياسي.
                  </div>
                )}

                {/* Direct Link to Full Chronological Decisions Timeline */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs mt-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-950">سجل تعقب القرارات المالية المفصل:</span>
                      <span className="text-slate-600 block text-[11px]">
                        استعراض التسلسل الزمني الكامل لجميع التغييرات، التمديدات الوزارية، ومحاضر الفرز والإتلاف.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("decisions_timeline")}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-xs flex-shrink-0"
                  >
                    <span>فتح السجل الزمني</span>
                    <History className="w-3 h-3 text-amber-300" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "decisions_timeline" && (
            <div className="max-w-4xl mx-auto">
              <FinancialDecisionsTimeline
                document={document}
                onOpenExtend={() => {
                  onClose();
                  onOpenExtend?.(document);
                }}
                onOpenDisposal={() => {
                  onClose();
                  onOpenDisposal?.(document);
                }}
              />
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    سجل حركة الوثيقة وسلسلة العهدة الرقمية (Chain of Custody)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    توثيق كل تدقيق أو فحص أو تعديل أرشيفي وفق اللوائح المنظمة لوزارة المالية
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-1 rounded">
                    سجل غير قابل للتعديل
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAuditExportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                    title="تصدير سجل التدقيق وسلسلة العهدة لهذه الوثيقة (Excel / PDF)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
                    <span>تصدير السجل (Excel/PDF)</span>
                  </button>
                </div>
              </div>

              <div className="relative border-r-2 border-emerald-700/40 pr-5 space-y-5 text-xs">
                {document.auditLog.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -right-[27px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-700 border-2 border-white shadow"></div>
                    <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] mb-1">
                      <span>{log.timestamp}</span>
                      <span className="font-bold text-slate-700">{log.user}</span>
                    </div>
                    <div className="font-bold text-slate-900">{log.action}</div>
                    <div className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded border border-slate-200/80">
                      {log.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "crypto" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 font-['Amiri'] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    شهادة السلامة الرقمية والبصمة الجنائية (WORM Integrity)
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-200">
                    الحالة: موثقة وغير قابلة للتعديل
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 block text-[11px]">بصمة المحتوى (SHA-256 Checksum):</span>
                    <div className="font-bold text-slate-900 break-all text-[11px]">
                      {document.cryptographicProof?.sha256Hash || "6a4f89b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9"}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 block text-[11px]">تشفير البيانات الساكنة (At-Rest):</span>
                    <div className="font-bold text-emerald-800 text-[11px]">
                      {document.cryptographicProof?.encryptionAlgorithm || "AES-256-GCM"} (مفتاح سيادي معزول)
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 block text-[11px]">أمن النقل الرقمي (In-Transit):</span>
                    <div className="font-bold text-emerald-800 text-[11px]">
                      {document.cryptographicProof?.transitSecurity || "TLS 1.3 / PFS"}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 block text-[11px]">سلطة الختم الزمني المشفر:</span>
                    <div className="font-bold text-slate-800 text-[11px]">
                      {document.cryptographicProof?.timestampAuthority || "سلطة الأختام الزمنية السيادية - LY-TSA"}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-950 text-amber-200 rounded-xl font-mono text-[11px] space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white border-b border-emerald-800/60 pb-1.5">
                    <span>محدد الختم السيادي: {document.cryptographicProof?.digitalSealId || `SEAL-LY-${document.year}`}</span>
                    <span className="text-emerald-400">حفظ دائم (Non-Repudiation)</span>
                  </div>
                  <div className="text-emerald-300 text-[10px] leading-relaxed">
                    تم تدقيق هذه الوثيقة وفق بروتوكول الأرشفة الوطنية غير القابلة للإلغاء. أي تعديل في بايتات الصورة الأصلية أو النص المستخرج يكسر التوقيع ويصدر إنذاراً أمنياً فوري لديوان المحاسبة.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Field Inspection Dossier Tab for Tablet Inspections */}
          {activeTab === "field_inspection" && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Tablet Mode Top Banner */}
              <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-amber-400/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center text-amber-200 border border-white/20 shrink-0">
                      <Tablet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold font-['Amiri',serif]">
                          محضر المعاينة والتفتيش الرقابي الميداني (Tablet Docket)
                        </h3>
                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/30">
                          جولة تفتيشية
                        </span>
                      </div>
                      <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed">
                        واجهة مهيأة للأجهزة اللوحية لمطابقة الأصل الورقي في الخزينة مع السجل الرقمي المشفر
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    <div className="text-right text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/20">
                      <span className="text-[10px] text-amber-200 block">المفتش الميداني:</span>
                      <span className="font-bold text-white">{activeUser.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive 2-column Grid for Tablets */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Column 1: Physical Vault Location & Specimen Data */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 font-['Amiri',serif]">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span>بيانات الأصل الفيزيائي بالخزينة</span>
                      </h4>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200">
                        معيار ISAD(G)
                      </span>
                    </div>

                    {/* Shelf Location Box */}
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-1">
                      <span className="text-[10px] text-amber-900/80 font-bold block">
                        الموقع في قاعات الحفظ والخزائن السيادية:
                      </span>
                      <div className="text-xs font-bold text-amber-950 flex items-center justify-between gap-2">
                        <span className="leading-relaxed">{document.storageLocation}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(document.storageLocation);
                            toast.success("تم نسخ موقع الحفظ", document.storageLocation, { duration: 2000 });
                          }}
                          className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 text-[10px] font-bold rounded border border-amber-300 transition shrink-0"
                          title="نسخ الموقع"
                        >
                          نسخ
                        </button>
                      </div>
                    </div>

                    {/* Grid of Attributes */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] text-slate-500 block">حالة الورق المادي:</span>
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                          document.physicalCondition === "أوراق تاريخية هشة"
                            ? "bg-red-100 text-red-900 border border-red-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}>
                          {document.physicalCondition}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] text-slate-500 block">جودة الرقمنة:</span>
                        <span className="font-bold text-slate-800 text-[11px] block">
                          {document.scanQuality}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] text-slate-500 block">باركود الأرشيف:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs block">
                          {document.barcode}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] text-slate-500 block">كود التحقق الرقمي:</span>
                        <span className="font-mono font-bold text-emerald-800 text-xs block truncate" title={document.qrCodeVerificationId}>
                          {document.qrCodeVerificationId}
                        </span>
                      </div>
                    </div>

                    {/* Detected Signatories & Official Seals */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Stamp className="w-3.5 h-3.5 text-amber-600" />
                        <span>الأختام والدمغات الرسمية المعتمدة:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {document.stampsDetected.map((stamp, idx) => (
                          <span
                            key={idx}
                            className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                          >
                            {stamp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الموقعون الرسميون:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {document.signatories.map((sig, idx) => (
                          <span
                            key={idx}
                            className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Tablet Touch Checklist & Digital Sign Off */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 font-['Amiri',serif]">
                        <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                        <span>قائمة التحقق الميداني باللمس (Touch Checklist)</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        أزرار لمسية 48px
                      </span>
                    </div>

                    {/* Touch checklist items with 48px height */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleToggleInspectionCheck("physicalDocMatched")}
                        className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-2.5 min-h-[48px] ${
                          inspectionChecks.physicalDocMatched
                            ? "bg-emerald-50/80 border-emerald-500/80 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs font-semibold">
                          {inspectionChecks.physicalDocMatched ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 shrink-0" />
                          )}
                          <span>مطابقة الأصل الورقي بالخزانة مع الرقم الإشاري ({document.refNumber})</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inspectionChecks.physicalDocMatched ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"
                        }`}>
                          {inspectionChecks.physicalDocMatched ? "مطابق ✓" : "غير مدقق"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleInspectionCheck("sealIntegrityVerified")}
                        className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-2.5 min-h-[48px] ${
                          inspectionChecks.sealIntegrityVerified
                            ? "bg-emerald-50/80 border-emerald-500/80 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs font-semibold">
                          {inspectionChecks.sealIntegrityVerified ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 shrink-0" />
                          )}
                          <span>سلامة الأختام والدمغات الرسمية المادية والشمعية</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inspectionChecks.sealIntegrityVerified ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"
                        }`}>
                          {inspectionChecks.sealIntegrityVerified ? "سليمة ✓" : "تحت الملاحظة"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleInspectionCheck("noMoistureOrDamage")}
                        className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-2.5 min-h-[48px] ${
                          inspectionChecks.noMoistureOrDamage
                            ? "bg-emerald-50/80 border-emerald-500/80 text-emerald-950"
                            : "bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs font-semibold">
                          {inspectionChecks.noMoistureOrDamage ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-amber-600 shrink-0" />
                          )}
                          <span>خلو الأوراق من الرطوبة أو العفن أو التلف البيئي</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inspectionChecks.noMoistureOrDamage ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                        }`}>
                          {inspectionChecks.noMoistureOrDamage ? "خالية من التلف ✓" : "تتطلب ترميم"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleInspectionCheck("barcodeScanned")}
                        className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-2.5 min-h-[48px] ${
                          inspectionChecks.barcodeScanned
                            ? "bg-emerald-50/80 border-emerald-500/80 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs font-semibold">
                          {inspectionChecks.barcodeScanned ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 shrink-0" />
                          )}
                          <span>مسح وتطابق الباركود الرقمي مع بطاقة الحفظ الميدانية</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inspectionChecks.barcodeScanned ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"
                        }`}>
                          {inspectionChecks.barcodeScanned ? "مطابق ✓" : "غير مدقق"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleInspectionCheck("signatoriesIdentified")}
                        className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-2.5 min-h-[48px] ${
                          inspectionChecks.signatoriesIdentified
                            ? "bg-emerald-50/80 border-emerald-500/80 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs font-semibold">
                          {inspectionChecks.signatoriesIdentified ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 shrink-0" />
                          )}
                          <span>التحقق من توقيعات المفوضين والوزراء المذكورة بالسجل</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inspectionChecks.signatoriesIdentified ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"
                        }`}>
                          {inspectionChecks.signatoriesIdentified ? "محققة ✓" : "غير مدققة"}
                        </span>
                      </button>
                    </div>

                    {/* Field Notes Input */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        ملاحظات التفتيش الميداني للجولة الرقابية:
                      </label>
                      <textarea
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="دون أي ملاحظات عن حالة الحفظ المادي للأصل الورقي أو توصيات بالترميم العاجل..."
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                      />
                    </div>

                    {/* Sign-off Actions */}
                    {inspectionSignedAt ? (
                      <div className="p-3.5 bg-emerald-950 text-amber-200 rounded-xl border border-emerald-700 text-xs space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <FileCheck2 className="w-4 h-4 text-emerald-400" />
                            محضر معاينة معتمد وموقع رقمياً
                          </span>
                          <span className="text-[10px] font-mono text-amber-300">
                            {inspectionSignedAt}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-200">
                          تم توثيق المحضر بواسطة المفتش: <span className="font-bold text-white">{activeUser.name}</span> ({activeUser.title})
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSignFieldAudit}
                        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 min-h-[48px] border border-emerald-600"
                      >
                        <FileCheck2 className="w-4 h-4 text-amber-300" />
                        <span>اعتماد وتوقيع محضر التفتيش الميداني اللوحي</span>
                      </button>
                    )}

                    {/* Certified PDF Export Button */}
                    <button
                      type="button"
                      onClick={() => setIsCertifiedPdfModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 min-h-[44px] border border-amber-300"
                    >
                      <Stamp className="w-4 h-4 text-amber-600" />
                      <span>تصدير محضر التفتيش الميداني الرسمي (PDF)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ocr_editor" && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="bg-emerald-950 text-white p-4 rounded-xl border border-emerald-700/60 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-100">
                      محرر ومطابق نصوص التعرف الضوئي (OCR Studio)
                    </h4>
                    <p className="text-xs text-emerald-200/80">
                      يمكنك تدقيق النصوص العربية، تصحيح الأخطاء المطبعية، وضبط الكلمات المفتاحية لتحديث محرك البحث اللحظي
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono text-amber-300 bg-black/40 px-3 py-1 rounded-lg border border-emerald-600/50">
                  {document.refNumber}
                </div>
              </div>

              <OcrVerificationEditor
                initialDocument={document}
                confidenceScore={document.paperlessVerified ? 98 : 94}
                onSave={(updated) => {
                  const updatedDoc: ArchivedDocument = {
                    ...document,
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
                    year: parseInt(updated.gregorianDate?.match(/\d{4}/)?.[0] || String(document.year), 10),
                    auditLog: [
                      {
                        id: `log-ocr-edit-${Date.now()}`,
                        timestamp: new Date().toLocaleString("ar-LY"),
                        user: activeUser.name,
                        action: "تدقيق نصوص OCR وتحديث بيانات البحث",
                        note: "تم تحديث نصوص الوثيقة والمبالغ والكلمات المفتاحية عبر محرر التعرف الضوئي"
                      },
                      ...(document.auditLog || [])
                    ]
                  };
                  if (onUpdateDocument) {
                    onUpdateDocument(updatedDoc);
                  }
                  toast.success("تم بنجاح حفظ تدقيق الـ OCR وتحديث محرك البحث الأرشيفي");
                  setActiveTab("visual");
                }}
                onCancel={() => setActiveTab("visual")}
                saveButtonLabel="حفظ التعديلات وتحديث محرك البحث الأرشيفي"
              />
            </div>
          )}
        </div>

        {/* Modal Footer with Accessibility Quick Reference */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>المنظومة الوطنية الموحدة للتحول اللاورقي - وزارة المالية الليبية</span>
            <span className="text-slate-400">|</span>
            <button
              type="button"
              onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
              className="text-emerald-800 hover:text-emerald-950 font-bold underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>اختصارات لوحة المفاتيح</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSecurePrintModalOpen(true)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-xs shadow-sm border border-emerald-600"
              title="طباعة آمنة بعلامة مائية"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>طباعة آمنة</span>
            </button>

            <button
              onClick={() => setIsCertifiedPdfModalOpen(true)}
              className="bg-emerald-900 hover:bg-emerald-800 text-amber-200 border border-amber-500/50 font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 text-xs shadow-sm"
            >
              <Stamp className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير PDF موثق</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-1.5 rounded-lg transition"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help Popup */}
        {showShortcutsHelp && (
          <div className="bg-slate-900 text-slate-100 p-4 border-t border-slate-700 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-amber-400">اختصارات الوصول السريع:</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Alt + + : تكبير الخط</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Alt + - : تصغير الخط</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Alt + 0 : إعادة ضبط (100%)</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Alt + C : تبديل التباين العالي</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Alt + B : خط سميك</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Alt + S : قراءة صوتية</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Esc : إغلاق</span>
            </div>
            <button
              type="button"
              onClick={() => setShowShortcutsHelp(false)}
              className="text-slate-400 hover:text-white underline text-[11px]"
            >
              إخفاء
            </button>
          </div>
        )}
      </div>

      {/* Certified PDF Export Modal */}
      <CertifiedPdfExportModal
        isOpen={isCertifiedPdfModalOpen}
        onClose={() => setIsCertifiedPdfModalOpen(false)}
        documents={[document]}
      />

      {/* Audit Log Export Modal */}
      <AuditLogExportModal
        isOpen={isAuditExportModalOpen}
        onClose={() => setIsAuditExportModalOpen(false)}
        documents={[document]}
        currentUser={activeUser}
      />

      {/* Secure Print Modal with Custom Watermark */}
      <SecurePrintModal
        isOpen={isSecurePrintModalOpen}
        onClose={() => setIsSecurePrintModalOpen(false)}
        documents={[document]}
        currentUser={currentUser}
        onRecordPrintAudit={(docId, auditEntry) => {
          if (onRecordPrintAudit) {
            onRecordPrintAudit(docId, auditEntry);
          } else if (onUpdateDocument) {
            const updatedDoc: ArchivedDocument = {
              ...document,
              auditLog: [
                {
                  id: `audit-${Date.now()}`,
                  action: auditEntry.action,
                  user: auditEntry.user,
                  timestamp: auditEntry.timestamp,
                  note: auditEntry.note
                },
                ...document.auditLog
              ]
            };
            onUpdateDocument(updatedDoc);
          }
        }}
      />
    </div>
  );
};
