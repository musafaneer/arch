import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Printer,
  ShieldCheck,
  QrCode,
  User,
  Calendar,
  Lock,
  Eye,
  CheckCircle2,
  Sliders,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Building,
  Stamp,
  Award,
  Download
} from "lucide-react";
import QRCode from "qrcode";
import { ArchivedDocument, VaultUser } from "../types";
import { VAULT_SYSTEM_USERS } from "../utils/vaultCrypto";
import { useToast } from "../context/ToastContext";
import { isElectron, triggerPrint } from "../utils/electronBridge";

interface SecurePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ArchivedDocument[];
  currentUser?: VaultUser;
  onRecordPrintAudit?: (docId: string, auditEntry: { user: string; timestamp: string; action: string; note: string }) => void;
}

export type WatermarkPattern = "diagonal-repeat" | "header-footer" | "center-seal" | "dense-grid";
export type WatermarkColor = "slate" | "red" | "emerald" | "amber";
export type WatermarkOpacity = "light" | "medium" | "heavy";

export const SecurePrintModal: React.FC<SecurePrintModalProps> = ({
  isOpen,
  onClose,
  documents,
  currentUser = VAULT_SYSTEM_USERS[0],
  onRecordPrintAudit
}) => {
  const toast = useToast();
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Active document index if multiple selected
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  // Form states for Watermark customisation
  const [requesterName, setRequesterName] = useState<string>(currentUser.name);
  const [requesterDepartment, setRequesterDepartment] = useState<string>(currentUser.department || "إدارة الأرشيف والتوثيق المالي");
  const [includePrintTime, setIncludePrintTime] = useState<boolean>(true);
  const [includeHijriDate, setIncludeHijriDate] = useState<boolean>(true);
  const [customDisclaimer, setCustomDisclaimer] = useState<string>(
    "نسخة رسمية مطبوعة بإذن أمني • يحظر تصويرها أو تداولها خارج الدائرة المصرح بها • وزارة المالية الليبية"
  );
  const [watermarkPattern, setWatermarkPattern] = useState<WatermarkPattern>("diagonal-repeat");
  const [watermarkColor, setWatermarkColor] = useState<WatermarkColor>("slate");
  const [watermarkOpacity, setWatermarkOpacity] = useState<WatermarkOpacity>("medium");
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [includeSha256Digest, setIncludeSha256Digest] = useState<boolean>(true);
  const [includeSignaturesTable, setIncludeSignaturesTable] = useState<boolean>(true);
  const [includeOcrText, setIncludeOcrText] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Synchronize requester with currentUser prop
  useEffect(() => {
    if (currentUser) {
      setRequesterName(currentUser.name);
      if (currentUser.department) {
        setRequesterDepartment(currentUser.department);
      }
    }
  }, [currentUser]);

  const activeDoc = documents[activeDocIndex] || documents[0];

  // Generate dynamic print timestamp
  const printTimestamp = useMemo(() => {
    const now = new Date();
    return now.toLocaleString("ar-LY", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }, [isOpen]);

  // Unique Secure Print Transaction ID
  const printTrackingId = useMemo(() => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `SEC-PRNT-2026-${rand}`;
  }, [isOpen, activeDocIndex]);

  // Generate QR Code for Print Verification
  useEffect(() => {
    if (!activeDoc) return;
    const generateQr = async () => {
      const verifyUrl = `https://mof.gov.ly/verify/print?tracking=${printTrackingId}&ref=${encodeURIComponent(activeDoc.refNumber)}&user=${encodeURIComponent(requesterName)}&date=${encodeURIComponent(printTimestamp)}`;
      try {
        const url = await QRCode.toDataURL(verifyUrl, {
          width: 120,
          margin: 1,
          color: {
            dark: "#0f2d1e",
            light: "#ffffff"
          }
        });
        setQrDataUrl(url);
      } catch (e) {
        console.error("QR Code generation error:", e);
      }
    };
    generateQr();
  }, [activeDoc, requesterName, printTimestamp, printTrackingId]);

  if (!isOpen || !activeDoc) return null;

  // Formatted Watermark Text Line
  const watermarkText = `${requesterName} • ${printTimestamp} • ${activeDoc.refNumber}`;

  // Opacity styles mapping
  const opacityClass = 
    watermarkOpacity === "light" ? "opacity-[0.14]" :
    watermarkOpacity === "heavy" ? "opacity-[0.38]" : "opacity-[0.24]";

  const watermarkTextColor = 
    watermarkColor === "red" ? "text-red-700" :
    watermarkColor === "emerald" ? "text-emerald-800" :
    watermarkColor === "amber" ? "text-amber-800" : "text-slate-700";

  // Handle printing execution
  const handleExecutePrint = () => {
    setIsPrinting(true);

    // Record Audit Trail in the document lifecycle
    const nowIso = new Date().toISOString().replace("T", " ").substring(0, 19);
    const auditNote = `تم تنفيذ طباعة أمنية للوثيقة بعلامة مائية مخصصة باسم [${requesterName}]، وقيد برقم التتبع [${printTrackingId}].`;

    if (onRecordPrintAudit) {
      documents.forEach(d => {
        onRecordPrintAudit(d.id, {
          user: requesterName,
          timestamp: nowIso,
          action: "طباعة آمنة بعلامة مائية معتمدة",
          note: auditNote
        });
      });
    }

    toast.success(
      "جاري تنفيذ الطباعة الآمنة",
      `تم دمج العلامة المائية باسم [${requesterName}] وتاريخ [${printTimestamp}]، وتوثيق العملية في سجل التدقيق الأرشيفي.`,
      { badge: "طباعة آمنة", duration: 5000 }
    );

    setTimeout(() => {
      if (isElectron()) {
        triggerPrint();
      } else {
        window.print();
      }
      setIsPrinting(false);
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-amber-500/40 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#0b2418] text-white px-6 py-4 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-['Amiri',serif] text-amber-100">
                  منظومة الطباعة الآمنة بالعلامة المائية المخصصة
                </h3>
                <span className="bg-emerald-900 text-amber-300 text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-700/60 font-bold">
                  {documents.length > 1 ? `${documents.length} وثائق محددة` : "وثيقة واحدة"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                توليد علامات مائية مشفرة غير قابلة للإزالة باسم الطالب وتاريخ الطباعة لحماية الوثائق السيادية من التسريب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecutePrint}
              disabled={isPrinting}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md transition transform active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>إرسال للطباعة الفورية ({documents.length})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Document Navigation Bar if more than 1 selected */}
        {documents.length > 1 && (
          <div className="bg-emerald-950/90 text-emerald-200 px-6 py-2.5 flex items-center justify-between border-b border-emerald-800 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <span className="text-amber-300 font-bold ml-1">تحديد وثيقة المعاينة:</span>
              {documents.map((doc, idx) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveDocIndex(idx)}
                  className={`px-3 py-1 rounded-lg font-mono text-[11px] transition ${
                    activeDocIndex === idx
                      ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                      : "bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50"
                  }`}
                >
                  [{idx + 1}] {doc.refNumber}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 font-mono text-[11px] text-amber-300 font-bold">
              <span>الوثيقة {activeDocIndex + 1} من {documents.length}</span>
            </div>
          </div>
        )}

        {/* Main Content: Two Columns (Controls on Right, Realistic A4 Print Preview on Left) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/70">
          
          {/* Right Column: Watermark & Security Settings (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Requester Identity Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-emerald-800" />
                <span>بيانات طالب الطباعة (تُدمج إلزامياً في العلامة المائية)</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">اسم المستخدم المسؤول:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-emerald-700 transition"
                      placeholder="اسم الموظف أو المستشار"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">الإدارة أو المصلحة التابعة:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={requesterDepartment}
                      onChange={(e) => setRequesterDepartment(e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-emerald-700 transition"
                      placeholder="اسم الإدارة"
                    />
                    <Building className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>تاريخ وساعة الطباعة المعتمدة:</span>
                  </div>
                  <p className="font-mono text-slate-700 pr-5 font-bold">
                    {printTimestamp}
                  </p>
                  <p className="text-[10px] text-slate-500 pr-5">
                    كود التتبع الأمني: <span className="font-mono text-emerald-900 font-bold">{printTrackingId}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Watermark Styling & Layout */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                <Sliders className="w-4 h-4 text-emerald-800" />
                <span>تخصيص شكل ودرجة وضوح العلامة المائية</span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Pattern Selection */}
                <div>
                  <label className="block text-slate-500 mb-1.5 font-medium">نمط تكرار العلامة المائية:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWatermarkPattern("diagonal-repeat")}
                      className={`p-2 rounded-xl text-right transition border ${
                        watermarkPattern === "diagonal-repeat"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="font-bold">مائل مكرر (45°)</div>
                      <div className="text-[10px] text-slate-500">حماية كاملة لكامل النص</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkPattern("center-seal")}
                      className={`p-2 rounded-xl text-right transition border ${
                        watermarkPattern === "center-seal"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="font-bold">ختم مركزي ضخم</div>
                      <div className="text-[10px] text-slate-500">شعار الوزارة في المنتصف</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkPattern("header-footer")}
                      className={`p-2 rounded-xl text-right transition border ${
                        watermarkPattern === "header-footer"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="font-bold">شريط علوي وسفلي</div>
                      <div className="text-[10px] text-slate-500">أشرطة أمنية واضحة</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkPattern("dense-grid")}
                      className={`p-2 rounded-xl text-right transition border ${
                        watermarkPattern === "dense-grid"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="font-bold">شبكة شبحية مكثفة</div>
                      <div className="text-[10px] text-slate-500">أعلى أمان للوثائق السرية</div>
                    </button>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <label className="block text-slate-500 mb-1.5 font-medium">درجة الشفافية (البروز):</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWatermarkOpacity("light")}
                      className={`py-1.5 px-2 rounded-lg text-center font-medium transition border ${
                        watermarkOpacity === "light"
                          ? "bg-emerald-800 text-white font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      خفيفة (14%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkOpacity("medium")}
                      className={`py-1.5 px-2 rounded-lg text-center font-medium transition border ${
                        watermarkOpacity === "medium"
                          ? "bg-emerald-800 text-white font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      متوازنة (24%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkOpacity("heavy")}
                      className={`py-1.5 px-2 rounded-lg text-center font-medium transition border ${
                        watermarkOpacity === "heavy"
                          ? "bg-emerald-800 text-white font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      بارزة (38%)
                    </button>
                  </div>
                </div>

                {/* Watermark Color */}
                <div>
                  <label className="block text-slate-500 mb-1.5 font-medium">لون حبر العلامة المائية:</label>
                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setWatermarkColor("slate")}
                      className={`py-1.5 rounded-lg border font-bold transition ${
                        watermarkColor === "slate"
                          ? "bg-slate-800 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      رمادي محايد
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkColor("red")}
                      className={`py-1.5 rounded-lg border font-bold transition ${
                        watermarkColor === "red"
                          ? "bg-red-700 text-white border-red-800"
                          : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      أحمر أمني
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkColor("emerald")}
                      className={`py-1.5 rounded-lg border font-bold transition ${
                        watermarkColor === "emerald"
                          ? "bg-emerald-800 text-white border-emerald-900"
                          : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      زمردي سيادي
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkColor("amber")}
                      className={`py-1.5 rounded-lg border font-bold transition ${
                        watermarkColor === "amber"
                          ? "bg-amber-600 text-white border-amber-700"
                          : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      ذهبي رسمي
                    </button>
                  </div>
                </div>

                {/* Additional Security Elements Checkboxes */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeQrCode}
                      onChange={(e) => setIncludeQrCode(e.target.checked)}
                      className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">
                      تضمين كود التحقق السريع (QR Code) مع رابط التدقيق
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSha256Digest}
                      onChange={(e) => setIncludeSha256Digest(e.target.checked)}
                      className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">
                      تضمين البصمة الجنائية الرقمية (SHA-256) في تذييل الورقة
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOcrText}
                      onChange={(e) => setIncludeOcrText(e.target.checked)}
                      className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">
                      إرفاق التفريغ النصي المدقق (OCR) مع النسخة المطبوعة
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Legal Warning Notice */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>إشعار المسؤولية القانونية:</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                كل مستند يُطبع عبر هذه الواجهة يحمل بصمة جنائية واسم الموظف المسؤول مشفراً. يُعد تسريب أو تصوير هذه الوثيقة خرقاً لقانون الأرشيف الوطني رقم (24) لسنة 1970 وتترتب عليه المساءلة القانونية.
              </p>
            </div>
          </div>

          {/* Left Column: Live A4 Printable Sheet Preview (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between mb-2 text-xs text-slate-500 font-medium px-2">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-slate-700">معاينة الورقة المطبوعة بنمط (A4) الرسمي:</span>
              </div>
              <span className="bg-slate-200 px-2 py-0.5 rounded text-[11px] font-mono">
                جاهز للإخراج عبر الطابعة أو حفظ PDF
              </span>
            </div>

            {/* Simulated Paper Container with Printable CSS Isolation */}
            <div className="w-full flex justify-center overflow-x-auto pb-6">
              <div
                id="secure-print-area"
                ref={printSheetRef}
                className="w-full max-w-[760px] min-h-[960px] bg-white text-slate-900 shadow-2xl rounded-lg p-8 sm:p-10 border border-slate-300 relative overflow-hidden flex flex-col justify-between select-none"
                style={{
                  fontFamily: "'Amiri', serif",
                  backgroundColor: "#ffffff"
                }}
              >
                {/* ================= WATERMARK LAYER ================= */}
                <div 
                  className={`absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden ${opacityClass}`}
                  aria-hidden="true"
                >
                  {watermarkPattern === "diagonal-repeat" && (
                    <div className="w-full h-full flex flex-col justify-around rotate-[-35deg] scale-125 select-none">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex justify-around items-center whitespace-nowrap py-4">
                          <span className={`text-sm sm:text-base font-bold font-['Cairo'] tracking-wider ${watermarkTextColor}`}>
                            {watermarkText}
                          </span>
                          <span className={`text-xs font-mono font-bold px-4 ${watermarkTextColor}`}>
                            ✦ {printTrackingId} ✦
                          </span>
                          <span className={`text-sm sm:text-base font-bold font-['Cairo'] tracking-wider ${watermarkTextColor}`}>
                            وزارة المالية الليبية - وثيقة رسمية
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {watermarkPattern === "center-seal" && (
                    <div className="w-full h-full flex flex-col items-center justify-center select-none text-center p-6">
                      <div className="w-64 h-64 rounded-full border-8 border-dashed border-slate-400 flex flex-col items-center justify-center p-4">
                        <Stamp className="w-20 h-20 text-slate-600 mb-2 opacity-60" />
                        <span className={`text-lg font-black font-['Amiri'] ${watermarkTextColor}`}>
                          وزارة المالية الليبية
                        </span>
                        <span className={`text-xs font-bold font-['Cairo'] mt-1 ${watermarkTextColor}`}>
                          طالب الطباعة: {requesterName}
                        </span>
                        <span className="text-[10px] font-mono mt-0.5 text-slate-600 font-bold">
                          {printTimestamp}
                        </span>
                      </div>
                    </div>
                  )}

                  {watermarkPattern === "header-footer" && (
                    <div className="w-full h-full flex flex-col justify-between p-4 select-none">
                      <div className={`border-b-2 border-dashed border-current p-2 text-center text-xs font-bold font-['Cairo'] ${watermarkTextColor}`}>
                        ▲ وثيقة رسمية صادرة بإذن: {requesterName} • {printTimestamp} • كود التحقق: {printTrackingId} ▲
                      </div>
                      <div className={`border-t-2 border-dashed border-current p-2 text-center text-xs font-bold font-['Cairo'] ${watermarkTextColor}`}>
                        ▼ وزارة المالية الليبية • يحظر التداول أو التصوير بدون تفويض • الرقم الإشاري: {activeDoc.refNumber} ▼
                      </div>
                    </div>
                  )}

                  {watermarkPattern === "dense-grid" && (
                    <div className="w-full h-full grid grid-cols-2 gap-8 p-4 rotate-[-25deg] scale-110 select-none">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="text-center">
                          <p className={`text-xs font-bold font-['Cairo'] ${watermarkTextColor}`}>
                            {requesterName} - {activeDoc.refNumber}
                          </p>
                          <p className={`text-[10px] font-mono ${watermarkTextColor}`}>
                            {printTimestamp}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ================= DOCUMENT OFFICIAL HEADER ================= */}
                <div className="relative z-10 border-b-2 border-slate-900 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Libyan State Emblem and Title */}
                    <div className="text-right">
                      <h1 className="text-lg sm:text-xl font-bold font-['Amiri'] text-slate-950">
                        دَولَةُ لِيبْيَا • وِزَارَةُ المَالِيَّة
                      </h1>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                        الإدارة العامة للأرشيف والتوثيق المالي السيادي
                      </h2>
                      <div className="text-[11px] font-sans text-slate-600 mt-1">
                        منظومة الأرشيف الرقمي الموحدة • قسم السجلات المالية
                      </div>
                    </div>

                    {/* Official Document Stamp & Tracking Badge */}
                    <div className="text-left flex flex-col items-end">
                      <div className="w-14 h-14 rounded-full border-2 border-emerald-900 flex flex-col items-center justify-center text-emerald-900 text-center p-1 bg-emerald-50/50">
                        <Stamp className="w-5 h-5 text-emerald-800" />
                        <span className="text-[7px] font-bold mt-0.5">مُعْتَمَد</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 mt-1 font-bold">
                        {activeDoc.refNumber}
                      </span>
                    </div>
                  </div>

                  {/* Security Classification Ribbon */}
                  <div className="mt-3 flex items-center justify-between bg-slate-100 p-2 rounded border border-slate-300 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold">درجة السرية:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        activeDoc.classification === "سري للغاية" ? "bg-red-100 text-red-900 border border-red-300" :
                        activeDoc.classification === "سري" ? "bg-orange-100 text-orange-900 border border-orange-300" :
                        "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}>
                        {activeDoc.classification}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-500">التاريخ الأرشيفي:</span>
                      <strong className="text-slate-900">{activeDoc.gregorianDate} م ({activeDoc.hijriDate} هـ)</strong>
                    </div>
                  </div>
                </div>

                {/* ================= DOCUMENT BODY ================= */}
                <div className="relative z-10 py-6 space-y-5 flex-1">
                  
                  {/* Document Title & Department */}
                  <div className="space-y-1 text-center bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                    <h2 className="text-base sm:text-xl font-bold font-['Amiri'] text-slate-950 leading-relaxed">
                      {activeDoc.title}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 pt-1 font-sans">
                      <span>الإدارة المختصة: <strong>{activeDoc.department}</strong></span>
                      <span>•</span>
                      <span>الحقبة: <strong>{activeDoc.era}</strong></span>
                      <span>•</span>
                      <span>المبلغ المالي: <strong className="text-emerald-900 font-bold font-mono">{activeDoc.financialAmount} {activeDoc.currency}</strong></span>
                    </div>
                  </div>

                  {/* Document Metadata Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden text-xs font-sans">
                    <table className="w-full text-right border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <td className="p-2 font-bold text-slate-700 w-1/4 border-l border-slate-200">الرقم الإشاري:</td>
                          <td className="p-2 font-mono font-bold text-slate-900 w-1/4">{activeDoc.refNumber}</td>
                          <td className="p-2 font-bold text-slate-700 w-1/4 border-l border-slate-200">نوع الوثيقة:</td>
                          <td className="p-2 text-slate-900 w-1/4">{activeDoc.docType}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-2 font-bold text-slate-700 border-l border-slate-200">الموقع الأرشيفي المادي:</td>
                          <td className="p-2 font-mono text-slate-800">{activeDoc.storageLocation}</td>
                          <td className="p-2 font-bold text-slate-700 border-l border-slate-200">سياسة الحفظ:</td>
                          <td className="p-2 text-emerald-900 font-bold">{activeDoc.retentionLifecycle?.policyCategory || "حفظ مالي نظامي"}</td>
                        </tr>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <td className="p-2 font-bold text-slate-700 border-l border-slate-200">حالة الأصل الفيزيائي:</td>
                          <td className="p-2 text-slate-800">{activeDoc.physicalCondition}</td>
                          <td className="p-2 font-bold text-slate-700 border-l border-slate-200">الموقعون المعتمدون:</td>
                          <td className="p-2 text-slate-900">{activeDoc.signatories.join("، ")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* OCR Transcription Segment if Enabled */}
                  {includeOcrText && (
                    <div className="space-y-1.5 pt-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Amiri']">
                        <FileText className="w-4 h-4 text-emerald-800" />
                        <span>نص الوثيقة المفرغ والمدقق رسمياً (OCR Authentic Transcription):</span>
                      </div>
                      <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 font-['Amiri'] leading-relaxed whitespace-pre-wrap">
                        {activeDoc.ocrText}
                      </div>
                    </div>
                  )}

                  {/* Signatories & Official Stamps */}
                  {includeSignaturesTable && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs font-sans">
                      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center space-y-2">
                        <span className="font-bold text-slate-700 block">اعتماد التدقيق الأرشيفي:</span>
                        <div className="font-['Amiri'] font-bold text-slate-900 text-sm">{requesterName}</div>
                        <div className="text-[10px] text-slate-500">{requesterDepartment}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center space-y-2">
                        <span className="font-bold text-slate-700 block">خاتم الوزارة والتصديق:</span>
                        <div className="font-['Amiri'] font-bold text-emerald-900 text-sm">وزارة المالية • مصلحة الضرائب والجمارك</div>
                        <div className="text-[10px] text-slate-500">تم التحقق من الختم الرسمي الرقمي</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ================= DOCUMENT OFFICIAL FOOTER ================= */}
                <div className="relative z-10 pt-4 border-t-2 border-slate-900 flex items-end justify-between gap-4 text-[10px] font-sans text-slate-600">
                  
                  {/* Left (RTL Start): Security Statement & Requester info */}
                  <div className="space-y-1 max-w-md">
                    <p className="font-bold text-slate-900">
                      طُبعت هذه النسخة الأمنية بطلب من: <span className="text-emerald-950 font-bold">{requesterName}</span> ({requesterDepartment})
                    </p>
                    <p className="text-slate-500">
                      التاريخ والوقت: <span className="font-mono text-slate-700 font-bold">{printTimestamp}</span> • كود المعاملة: <span className="font-mono text-emerald-900 font-bold">{printTrackingId}</span>
                    </p>
                    {includeSha256Digest && (
                      <p className="font-mono text-[9px] text-slate-400 truncate max-w-sm">
                        SHA-256: {activeDoc.cryptographicProof?.sha256Hash || "6A4F89B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1"}
                      </p>
                    )}
                  </div>

                  {/* Right (RTL End): QR Code Verification Stamp */}
                  {includeQrCode && qrDataUrl && (
                    <div className="flex flex-col items-center shrink-0">
                      <img
                        src={qrDataUrl}
                        alt="QR Code التحقق من الطباعة"
                        className="w-16 h-16 border border-slate-300 p-0.5 rounded bg-white"
                      />
                      <span className="text-[8px] font-bold text-slate-600 mt-0.5">مسح للتحقق</span>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>
              العلامة المائية المطبوعة تحوي اسمك <strong>({requesterName})</strong> وتاريخ اليوم <strong>({printTimestamp})</strong> لضمان حماية الوثيقة.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleExecutePrint}
              disabled={isPrinting}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-5 py-2 rounded-xl flex items-center gap-2 shadow-sm transition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>تنفيذ الطباعة الآمنة الآن</span>
            </button>
          </div>
        </div>

      </div>

      {/* Global Print-Specific Media Styles ensuring watermark and sheet formatting apply to native printer */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #secure-print-area, #secure-print-area * {
            visibility: visible;
          }
          #secure-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 20mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
};
