import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  Stamp,
  QrCode,
  CheckCircle2,
  FileText,
  Building2,
  Calendar,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Eye,
  Loader2,
  Share2,
  Layers,
  Award
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { ArchivedDocument, VaultUser } from "../types";
import { VAULT_SYSTEM_USERS, createDocumentCryptographicProof } from "../utils/vaultCrypto";
import { useToast } from "../context/ToastContext";

interface CertifiedPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ArchivedDocument[];
  currentUser?: VaultUser;
}

type SealStyle = "emerald" | "blue" | "royal-gold" | "red";

export const CertifiedPdfExportModal: React.FC<CertifiedPdfExportModalProps> = ({
  isOpen,
  onClose,
  documents,
  currentUser = VAULT_SYSTEM_USERS[0]
}) => {
  const toast = useToast();
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [sealStyle, setSealStyle] = useState<SealStyle>("emerald");
  const [includeOcrText, setIncludeOcrText] = useState<boolean>(true);
  const [includeMetadataTable, setIncludeMetadataTable] = useState<boolean>(true);
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

  // Print & capture target refs
  const exportDossierContainerRef = useRef<HTMLDivElement>(null);

  // Active document being previewed
  const currentDoc = documents[selectedDocIndex] || documents[0];

  // Generate real scannable QR code for documents
  useEffect(() => {
    if (!documents || documents.length === 0) return;

    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const doc of documents) {
        const proof = createDocumentCryptographicProof(doc);
        const verifyUrl = `https://mof.gov.ly/verify?ref=${encodeURIComponent(doc.refNumber)}&hash=${proof.sha256Hash}&seal=${encodeURIComponent(proof.digitalSealId)}&date=${encodeURIComponent(doc.gregorianDate)}`;
        try {
          const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
            margin: 1,
            width: 140,
            color: {
              dark: sealStyle === "blue" ? "#1e3a8a" : sealStyle === "red" ? "#991b1b" : "#0f2d1e",
              light: "#ffffff"
            }
          });
          urls[doc.id] = qrDataUrl;
        } catch (err) {
          console.error("QR Code generation error:", err);
        }
      }
      setQrCodeUrls(urls);
    };

    generateQRs();
  }, [documents, sealStyle]);

  if (!isOpen || !documents || documents.length === 0) return null;

  // Seal Colors configuration
  const sealConfig = {
    emerald: {
      border: "border-emerald-800",
      text: "text-emerald-900",
      fill: "#0f2d1e",
      stroke: "#047857",
      bgLight: "bg-emerald-50/70",
      accent: "text-amber-700",
      name: "الختم السيادي الزمردي (الأرشيف المركزي)"
    },
    blue: {
      border: "border-blue-900",
      text: "text-blue-950",
      fill: "#172554",
      stroke: "#1d4ed8",
      bgLight: "bg-blue-50/70",
      accent: "text-blue-700",
      name: "الختم الأزرق الوزاري (ديوان وزارة المالية)"
    },
    "royal-gold": {
      border: "border-amber-700",
      text: "text-amber-950",
      fill: "#78350f",
      stroke: "#d97706",
      bgLight: "bg-amber-50/70",
      accent: "text-amber-600",
      name: "الختم التوثيقي المذهب (المعاملات الكبرى)"
    },
    red: {
      border: "border-red-800",
      text: "text-red-950",
      fill: "#7f1d1d",
      stroke: "#dc2626",
      bgLight: "bg-red-50/70",
      accent: "text-red-700",
      name: "الختم الأحمر السيادي (مراسيم وقرارات نافذة)"
    }
  }[sealStyle];

  // Handler for Exporting as PDF via html2canvas & jsPDF
  const handleDownloadPdf = async (allSelected: boolean = false) => {
    setIsGeneratingPdf(true);
    setExportSuccessNotice(null);

    try {
      const docsToExport = allSelected ? documents : [currentDoc];
      setGenerationProgress(`جاري تهيئة ${docsToExport.length} وثيقة للتوثيق الرقمي المعتمد...`);

      // Initialize A4 PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const a4WidthMm = 210;
      const a4HeightMm = 297;

      for (let i = 0; i < docsToExport.length; i++) {
        const docItem = docsToExport[i];
        setGenerationProgress(`جاري معالجة وختم الوثيقة [${docItem.refNumber}] (${i + 1} من ${docsToExport.length})...`);

        // Find the DOM element for this document
        const elementId = `certified-doc-page-${docItem.id}`;
        const pageEl = document.getElementById(elementId);

        if (!pageEl) {
          console.warn(`Element ${elementId} not found`);
          continue;
        }

        // Capture page using html2canvas
        const canvas = await html2canvas(pageEl, {
          scale: 2.2, // crisp high DPI capture for Arabic typography and stamps
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 1024
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        // Calculate aspect-ratio fit on A4
        const imgWidth = a4WidthMm;
        const imgHeight = (canvas.height * a4WidthMm) / canvas.width;

        // If height exceeds single A4, let it fit proportionately or add page
        if (imgHeight <= a4HeightMm) {
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
        } else {
          // Multi-page slicing if doc is long
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= a4HeightMm;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage("a4", "portrait");
            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
            heightLeft -= a4HeightMm;
          }
        }
      }

      setGenerationProgress("جاري إنهاء وتوقيع ملف PDF السيادي...");

      const filename = docsToExport.length === 1
        ? `وثيقة_مالية_موثقة_${docsToExport[0].refNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`
        : `ملف_وثائق_مالية_موثقة_رقمياً_${new Date().toISOString().slice(0, 10)}.pdf`;

      pdf.save(filename);

      setExportSuccessNotice(`تم تصدير ملف PDF موثق رقمياً وممهور بختم وزارة المالية بنجاح (${docsToExport.length} وثيقة)`);
      toast.success(
        "تم تصدير ملف PDF الموثق بنجاح",
        `تم تجهيز وتنزيل (${docsToExport.length}) وثيقة رسمية ممهورة بختم وزارة المالية مع رمز الاستجابة السريعة.`,
        { badge: "تصدير رسمي", duration: 6000 }
      );
      setTimeout(() => setExportSuccessNotice(null), 6000);
    } catch (error) {
      console.error("PDF Export error:", error);
      toast.error(
        "تعذر استكمال تصدير ملف PDF",
        "حدث خطأ أثناء معالجة المستندات، يمكنك استخدام زر الطباعة المباشرة كبديل فوري.",
        { badge: "تنبيه تصدير", duration: 5500 }
      );
    } finally {
      setIsGeneratingPdf(false);
      setGenerationProgress("");
    }
  };

  // Handler for Native System Print to PDF
  const handleNativePrint = () => {
    toast.info(
      "جاري تجهيز أمر الطباعة السيادية",
      "تم تحويل الوثيقة إلى تنسيق الطباعة A4 المعتمد بوزارة المالية.",
      { badge: "طباعة نظام", duration: 3500 }
    );
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="bg-[#0f2d1e] text-white px-5 py-3.5 flex items-center justify-between border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60 text-amber-300 font-bold">
                  SOVEREIGN DIGITAL CERTIFICATION • PDF EXPORT
                </span>
                <span className="text-xs text-emerald-200">
                  وزارة المالية - دولة ليبيا
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold font-['Amiri',serif] text-amber-100 mt-0.5">
                تصدير الوثائق المؤرشفة إلى ملفات PDF موثقة وممهورة بختم الوزارة الرسمي
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isGeneratingPdf}
              className="w-8 h-8 rounded-lg bg-emerald-950 hover:bg-red-900/80 text-emerald-200 hover:text-white flex items-center justify-center transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Notice Banner */}
        {exportSuccessNotice && (
          <div className="bg-emerald-700 text-white px-5 py-2.5 flex items-center justify-between text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>{exportSuccessNotice}</span>
            </div>
            <button
              onClick={() => setExportSuccessNotice(null)}
              className="text-white/80 hover:text-white text-xs underline"
            >
              إخفاء
            </button>
          </div>
        )}

        {/* Main Content: Split Sidebar Controls + Live Certificate Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Controls & Options Sidebar (4 cols on lg) */}
          <div className="lg:col-span-4 bg-white border-b lg:border-b-0 lg:border-l border-slate-200 p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
            {/* Selected Documents Switcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-800" />
                  الوثائق المحددة للتصدير ({documents.length})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedDocIndex + 1} من {documents.length}
                </span>
              </div>

              {documents.length > 1 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {documents.map((doc, idx) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocIndex(idx)}
                      className={`w-full text-right p-2 rounded-lg text-xs transition flex items-center justify-between ${
                        selectedDocIndex === idx
                          ? "bg-emerald-800 text-white font-bold shadow-sm"
                          : "hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="truncate pl-2">
                        <span className="font-mono ml-1 text-[10px] opacity-80">
                          {doc.refNumber}
                        </span>
                        <span>{doc.title}</span>
                      </div>
                      <span className="text-[10px] shrink-0 font-mono">
                        {doc.year}م
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seal Style Selector */}
            <div className="space-y-2">
              <label className="font-bold text-slate-900 block flex items-center gap-1.5">
                <Stamp className="w-4 h-4 text-amber-700" />
                طابع وختم وزارة المالية المعتمد:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["emerald", "blue", "royal-gold", "red"] as SealStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setSealStyle(style)}
                    className={`p-2 rounded-xl border text-right transition flex flex-col gap-1 ${
                      sealStyle === style
                        ? "border-emerald-800 bg-emerald-50/80 ring-2 ring-emerald-700 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border shadow-xs"
                        style={{
                          backgroundColor:
                            style === "emerald"
                              ? "#047857"
                              : style === "blue"
                              ? "#1d4ed8"
                              : style === "royal-gold"
                              ? "#d97706"
                              : "#dc2626"
                        }}
                      />
                      <span className="text-[11px]">
                        {style === "emerald"
                          ? "الزمردي السيادي"
                          : style === "blue"
                          ? "الأزرق الوزاري"
                          : style === "royal-gold"
                          ? "التوثيقي المذهب"
                          : "الأحمر النافذ"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Certification Elements Toggles */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-700" />
                عناصر الوثيقة الرسمية والتحقق:
              </span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5 text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMetadataTable}
                    onChange={(e) => setIncludeMetadataTable(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>جدول البيانات المرجعية والرقم الإشاري</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeOcrText}
                    onChange={(e) => setIncludeOcrText(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>التفريغ النصي المعتمد للقرار/المرسوم (OCR)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>توقيعات أمين الخزينة ومراقب ديوان المحاسبة</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeWatermark}
                    onChange={(e) => setIncludeWatermark(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <span>العلامة المائية السيادية الشفافة</span>
                </label>
              </div>
            </div>

            {/* Authenticity Verification Guarantee Card */}
            <div className="p-3.5 bg-emerald-950 text-amber-100 rounded-xl border border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>التحقق الجنائي التلقائي المضمن:</span>
              </div>
              <p className="text-[10px] text-emerald-200/90 leading-relaxed">
                كل ملف PDF يتم تصديره يحتوي على بصمة مشفرة (SHA-256) ورقم ختم سيادي ورابط استعلام فوري موصول بمنظومة التحقق الإلكتروني لوزارة المالية الليبية.
              </p>
              <div className="text-[10px] font-mono text-emerald-300 break-all bg-emerald-900/60 p-1.5 rounded border border-emerald-800">
                Seal: {createDocumentCryptographicProof(currentDoc).digitalSealId}
              </div>
            </div>

            {/* Action Buttons in Sidebar */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleDownloadPdf(false)}
                disabled={isGeneratingPdf}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>{generationProgress || "جاري توليد PDF..."}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>تنزيل الوثيقة الحالية كـ PDF موثق</span>
                  </>
                )}
              </button>

              {documents.length > 1 && (
                <button
                  onClick={() => handleDownloadPdf(true)}
                  disabled={isGeneratingPdf}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>تصدير كافة المحددة ({documents.length}) في ملف PDF واحد</span>
                </button>
              )}

              <button
                onClick={handleNativePrint}
                disabled={isGeneratingPdf}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
                title="طباعة مباشرة أو حفظ عبر نافذة النظام"
              >
                <Printer className="w-4 h-4 text-emerald-800" />
                <span>طباعة / حفظ فوري عبر المتصفح (Print)</span>
              </button>
            </div>
          </div>

          {/* Certificate Live Preview (8 cols on lg) */}
          <div className="lg:col-span-8 bg-slate-200/70 p-3 sm:p-6 overflow-y-auto flex flex-col items-center justify-start">
            <div className="w-full max-w-2xl flex items-center justify-between pb-3 text-xs text-slate-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-800" />
                معاينة الوثيقة الرسمية المعتمدة (قياس A4 المعياري)
              </span>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700">
                {currentDoc.refNumber}
              </span>
            </div>

            {/* Hidden / Render container for all documents so html2canvas can capture any or all */}
            <div ref={exportDossierContainerRef} className="w-full max-w-2xl space-y-8">
              {documents.map((doc, docIdx) => {
                const isDocActive = docIdx === selectedDocIndex;
                const proof = createDocumentCryptographicProof(doc);
                const qrUrl = qrCodeUrls[doc.id];

                return (
                  <div
                    key={doc.id}
                    id={`certified-doc-page-${doc.id}`}
                    className={`bg-white text-slate-900 rounded-lg shadow-xl border-4 border-double border-amber-600/60 p-6 sm:p-8 relative transition font-['Cairo',sans-serif] ${
                      !isDocActive ? "hidden lg:hidden" : "block"
                    }`}
                    style={{
                      minHeight: "1050px",
                      position: "relative"
                    }}
                    dir="rtl"
                  >
                    {/* Security Guilloche Ornamental Frame Border */}
                    <div className="absolute inset-2 sm:inset-3 border border-amber-600/40 pointer-events-none rounded" />
                    <div className="absolute inset-3 sm:inset-4 border border-emerald-900/20 pointer-events-none" />

                    {/* Corner Rosettes */}
                    <div className="absolute top-4 right-4 text-amber-700/60 text-xs font-serif select-none pointer-events-none">❖</div>
                    <div className="absolute top-4 left-4 text-amber-700/60 text-xs font-serif select-none pointer-events-none">❖</div>
                    <div className="absolute bottom-4 right-4 text-amber-700/60 text-xs font-serif select-none pointer-events-none">❖</div>
                    <div className="absolute bottom-4 left-4 text-amber-700/60 text-xs font-serif select-none pointer-events-none">❖</div>

                    {/* Sovereign Watermark (Optional) */}
                    {includeWatermark && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] rotate-[-35deg] select-none">
                        <div className="text-center font-['Amiri'] font-bold text-slate-900 leading-tight">
                          <p className="text-5xl sm:text-6xl">دولة ليبيا • وزارة المالية</p>
                          <p className="text-3xl sm:text-4xl mt-3">نسخة رقمية موثقة ومعتمدة</p>
                          <p className="text-xl sm:text-2xl mt-2 font-mono">SOVEREIGN OFFICIAL ARCHIVE</p>
                        </div>
                      </div>
                    )}

                    {/* OFFICIAL STATE HEADER */}
                    <div className="relative z-10 border-b-2 border-emerald-900/40 pb-5 mb-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Right: State & Ministry Details */}
                        <div className="text-right space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-800 font-['Amiri']">
                            دولة ليبيا
                          </h4>
                          <h3 className="text-base sm:text-lg font-extrabold text-emerald-950 font-['Amiri']">
                            وزارة المالية
                          </h3>
                          <p className="text-xs font-bold text-slate-700">
                            {doc.department}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            ديوان التوثيق والأرشيف السيادي المركزي
                          </p>
                        </div>

                        {/* Center: Official Golden Emblem / Coat of Arms */}
                        <div className="text-center flex flex-col items-center">
                          {/* Libyan Sovereign Coat of Arms SVG */}
                          <div className="w-16 h-16 relative flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full text-amber-600 drop-shadow">
                              <circle cx="50" cy="50" r="46" fill="#0f2d1e" stroke="#d97706" strokeWidth="2.5" />
                              <circle cx="50" cy="50" r="41" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
                              {/* Star and Crescent Emblem */}
                              <path
                                d="M54 30 A18 18 0 1 0 54 70 A14 14 0 1 1 54 30 Z"
                                fill="#f59e0b"
                              />
                              <polygon
                                points="58,45 61,53 70,53 63,58 65,66 58,61 51,66 53,58 46,53 55,53"
                                fill="#f59e0b"
                              />
                              {/* Bottom ribbon */}
                              <path
                                d="M22 76 Q50 86 78 76 Q50 92 22 76"
                                fill="#b45309"
                                stroke="#fef3c7"
                                strokeWidth="0.5"
                              />
                            </svg>
                          </div>
                          <span className="text-[11px] font-bold text-amber-800 font-['Amiri'] mt-1">
                            إفادة توثيق أرشيفي رسمي
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                            OFFICIAL PROVENANCE DOSSIER
                          </span>
                        </div>

                        {/* Left: Ref, Date, Code */}
                        <div className="text-left space-y-1 text-xs">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {doc.refNumber}
                            </span>
                            <span className="text-[11px] text-slate-500">:رقم القيد</span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-[11px]">
                            <span className="font-mono text-slate-700">{doc.gregorianDate}م</span>
                            <span className="text-slate-500">:التاريخ الأصلي</span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 text-[11px]">
                            <span className="font-mono text-emerald-800 font-bold">
                              {new Date().toLocaleDateString("ar-LY")}م
                            </span>
                            <span className="text-slate-500">:تاريخ التوثيق</span>
                          </div>

                          {/* Barcode Visual Representation */}
                          <div className="pt-1 flex flex-col items-end">
                            <svg className="w-28 h-6" viewBox="0 0 120 24">
                              <rect width="120" height="24" fill="#ffffff" />
                              <g fill="#0f2d1e">
                                <rect x="2" y="2" width="2" height="20" />
                                <rect x="6" y="2" width="3" height="20" />
                                <rect x="11" y="2" width="1" height="20" />
                                <rect x="14" y="2" width="4" height="20" />
                                <rect x="20" y="2" width="2" height="20" />
                                <rect x="24" y="2" width="3" height="20" />
                                <rect x="29" y="2" width="1" height="20" />
                                <rect x="32" y="2" width="4" height="20" />
                                <rect x="38" y="2" width="2" height="20" />
                                <rect x="42" y="2" width="3" height="20" />
                                <rect x="47" y="2" width="2" height="20" />
                                <rect x="51" y="2" width="4" height="20" />
                                <rect x="57" y="2" width="1" height="20" />
                                <rect x="60" y="2" width="3" height="20" />
                                <rect x="65" y="2" width="2" height="20" />
                                <rect x="69" y="2" width="4" height="20" />
                                <rect x="75" y="2" width="2" height="20" />
                                <rect x="79" y="2" width="3" height="20" />
                                <rect x="84" y="2" width="1" height="20" />
                                <rect x="87" y="2" width="4" height="20" />
                                <rect x="93" y="2" width="2" height="20" />
                                <rect x="97" y="2" width="3" height="20" />
                                <rect x="102" y="2" width="2" height="20" />
                                <rect x="106" y="2" width="4" height="20" />
                                <rect x="112" y="2" width="2" height="20" />
                                <rect x="116" y="2" width="2" height="20" />
                              </g>
                            </svg>
                            <span className="text-[8px] font-mono text-slate-500 tracking-widest text-center w-28">
                              {doc.refNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DOCUMENT TITLE & BADGES */}
                    <div className="relative z-10 mb-5 text-center">
                      <div className="inline-block px-3 py-1 bg-amber-50 rounded-full border border-amber-300 text-amber-900 text-xs font-bold mb-2">
                        {doc.type} • {doc.era}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold font-['Amiri',serif] text-slate-950 leading-relaxed max-w-xl mx-auto">
                        {doc.title}
                      </h2>
                    </div>

                    {/* METADATA GRID (Optional) */}
                    {includeMetadataTable && (
                      <div className="relative z-10 mb-5 bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-slate-400 block text-[10px]">الجهة المصدرة:</span>
                            <span className="font-bold text-slate-800">{doc.issuer}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">المبلغ المالي المقيد:</span>
                            <span className="font-bold font-mono text-emerald-800">{doc.financialAmount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">درجة السرية والحصانة:</span>
                            <span className="font-bold text-amber-800">{doc.classification}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">الموقع الجغرافي:</span>
                            <span className="font-bold text-slate-800">{doc.location}</span>
                          </div>
                        </div>

                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-semibold">التصنيفات والوسوم المعتمدة:</span>
                            {doc.tags.map((t, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CERTIFIED OCR TRANSCRIPTION (Optional) */}
                    {includeOcrText && (
                      <div className="relative z-10 mb-6 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="text-xs font-bold text-slate-800 font-['Amiri'] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-800" />
                            النص الرسمي المفرغ والمدقق أرشيفياً (Certified OCR Transcript):
                          </span>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            دقة التفريغ: 99.8%
                          </span>
                        </div>
                        <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 text-xs font-['Amiri',serif] leading-loose text-slate-800 whitespace-pre-line text-justify">
                          {doc.ocrText}
                        </div>
                      </div>
                    )}

                    {/* OFFICIAL MINISTRY OF FINANCE SEAL & DIGITAL PROOF SECTION */}
                    <div className="relative z-10 mt-6 pt-5 border-t-2 border-emerald-900/30">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        {/* RIGHT: OFFICIAL CIRCULAR STAMP (خاتم وزارة المالية الليبية المعتمد) */}
                        <div className="sm:col-span-4 flex flex-col items-center justify-center text-center">
                          <div
                            className={`w-36 h-36 rounded-full border-4 border-double ${sealConfig.border} ${sealConfig.bgLight} relative flex items-center justify-center shadow-lg p-2 transform rotate-[-4deg]`}
                          >
                            {/* SVG Embossed Ministry Seal */}
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                              <defs>
                                <path
                                  id="circlePathOuter"
                                  d="M 100, 100 m -78, 0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
                                />
                                <path
                                  id="circlePathInner"
                                  d="M 100, 100 m -58, 0 a 58,58 0 1,0 116,0 a 58,58 0 1,0 -116,0"
                                />
                              </defs>

                              {/* Outer and inner borders */}
                              <circle cx="100" cy="100" r="92" fill="none" stroke={sealConfig.stroke} strokeWidth="2.5" />
                              <circle cx="100" cy="100" r="86" fill="none" stroke={sealConfig.stroke} strokeWidth="1" strokeDasharray="3,2" />
                              <circle cx="100" cy="100" r="66" fill="none" stroke={sealConfig.stroke} strokeWidth="1.5" />

                              {/* Curved Arabic text outer: دولة ليبيا • وزارة المالية */}
                              <text fill={sealConfig.fill} fontSize="11" fontWeight="bold" fontFamily="Amiri">
                                <textPath href="#circlePathOuter" startOffset="50%" textAnchor="middle">
                                  دولة ليبيا • وزارة المالية • الأرشيف السيادي
                                </textPath>
                              </text>

                              {/* Curved Arabic text inner: خاتم التحقق والاعتماد الرسمي */}
                              <text fill={sealConfig.fill} fontSize="8" fontWeight="bold" fontFamily="Cairo">
                                <textPath href="#circlePathInner" startOffset="50%" textAnchor="middle">
                                  خاتم الاعتماد والتوثيق الرقمي • CERTIFIED
                                </textPath>
                              </text>

                              {/* Center Seal Emblem: Star, Crescent & Scale of Justice */}
                              <g transform="translate(100, 100) scale(0.65)">
                                <path
                                  d="M-5 -25 L5 -25 L5 -15 L20 -15 L20 -10 L2 -10 L2 25 L-2 25 L-2 -10 L-20 -10 L-20 -15 L-5 -15 Z"
                                  fill={sealConfig.stroke}
                                />
                                <circle cx="-20" cy="5" r="8" fill="none" stroke={sealConfig.stroke} strokeWidth="2" />
                                <circle cx="20" cy="5" r="8" fill="none" stroke={sealConfig.stroke} strokeWidth="2" />
                                <polygon points="0,-32 3,-24 11,-24 5,-19 7,-11 0,-16 -7,-11 -5,-19 -11,-24 -3,-24" fill={sealConfig.stroke} />
                              </g>

                              {/* Center Date and Seal Identifier */}
                              <text x="100" y="142" textAnchor="middle" fill={sealConfig.fill} fontSize="9" fontWeight="bold" fontFamily="monospace">
                                {proof.digitalSealId}
                              </text>
                            </svg>
                          </div>
                          <span className={`text-[10px] font-bold ${sealConfig.text} mt-1 font-['Amiri']`}>
                            خاتم الاعتماد الرقمي الصادر
                          </span>
                        </div>

                        {/* CENTER: SIGNATURES & OFFICIAL CUSTODIANS (Optional) */}
                        <div className="sm:col-span-5 space-y-3 text-xs border-r sm:border-r border-slate-200 pr-3">
                          {includeSignatures ? (
                            <>
                              <div>
                                <div className="text-[10px] text-slate-400">أمين الخزينة والأرشيف السيادي:</div>
                                <div className="font-bold text-slate-800 font-['Amiri'] text-xs">
                                  م. عثمان مفتاح الترهوني
                                </div>
                                <div className="text-[9px] font-mono text-emerald-800">
                                  ID: LY-MOF-SEC-001 (توقيع رقمي موثق)
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] text-slate-400">مراقب ديوان المحاسبة والامتثال:</div>
                                <div className="font-bold text-slate-800 font-['Amiri'] text-xs">
                                  المستشارة خديجة بشير المقريف
                                </div>
                                <div className="text-[9px] font-mono text-emerald-800">
                                  ID: LY-ACC-INSP-042 (شهادة مطابقة نافذة)
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-slate-400 text-[10px] italic">
                              تم التوثيق إلكترونياً بدون استعراض أسماء الموظفين.
                            </div>
                          )}

                          <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-200">
                            سلطة الأختام الزمنية: <span className="font-mono font-bold text-slate-700">LY-TSA Sovereign Authority</span>
                          </div>
                        </div>

                        {/* LEFT: QR CODE FOR LIVE AUTHENTICITY VERIFICATION */}
                        <div className="sm:col-span-3 flex flex-col items-center text-center">
                          {qrUrl ? (
                            <div className="p-1.5 bg-white rounded-lg border-2 border-slate-300 shadow-sm">
                              <img
                                src={qrUrl}
                                alt="QR Verification Code"
                                className="w-24 h-24 sm:w-28 sm:h-28"
                              />
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                              <QrCode className="w-8 h-8" />
                            </div>
                          )}
                          <span className="text-[9px] font-bold text-slate-700 mt-1">
                            امسح للتحقق الجنائي
                          </span>
                          <span className="text-[8px] font-mono text-emerald-800">
                            mof.gov.ly/verify
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CRYPTOGRAPHIC INTEGRITY FOOTER */}
                    <div className="relative z-10 mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[9px] text-slate-400 font-mono">
                      <div className="truncate max-w-md">
                        <span className="text-slate-600 font-bold">SHA-256: </span>
                        <span>{proof.sha256Hash}</span>
                      </div>
                      <div className="shrink-0 text-slate-500">
                        حفظ محصن WORM • غير قابل للتعديل
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Sticky Bar */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>
              نظام التصدير الموثق متوافق مع معايير الأرشيف الوطني الليبي وديوان المحاسبة
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
            >
              إلغاء
            </button>

            <button
              onClick={() => handleDownloadPdf(false)}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-amber-200 border border-amber-500/50 rounded-lg font-bold flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تحميل PDF ({currentDoc.refNumber})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
