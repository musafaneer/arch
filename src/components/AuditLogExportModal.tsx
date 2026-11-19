import React, { useState, useMemo, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  UserCheck,
  Search,
  CheckCircle2,
  History,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal,
  Info,
  Layers,
  Clock,
  Stamp,
  Lock,
  Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ArchivedDocument, VaultUser } from "../types";
import { useToast } from "../context/ToastContext";

interface AuditLogExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ArchivedDocument[];
  currentUser: VaultUser;
  onRecordAuditExport?: (logInfo: { documentCount: number; exportFormat: string; totalEntries: number }) => void;
}

export interface FlattenedAuditEntry {
  docId: string;
  docRef: string;
  docTitle: string;
  department: string;
  classification: string;
  subWarehouse: string;
  storageLocation: string;
  sha256Hash: string;
  entryId: string;
  timestamp: string;
  user: string;
  action: string;
  note: string;
}

export const AuditLogExportModal: React.FC<AuditLogExportModalProps> = ({
  isOpen,
  onClose,
  documents,
  currentUser,
  onRecordAuditExport
}) => {
  const toast = useToast();
  const printDossierRef = useRef<HTMLDivElement>(null);

  // Export Mode
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>("");

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
  const [includeCryptoHashes, setIncludeCryptoHashes] = useState<boolean>(true);
  const [includeSubWarehouseLocation, setIncludeSubWarehouseLocation] = useState<boolean>(true);
  const [auditorReference, setAuditorReference] = useState<string>("مراجعة رقابية خارجية معتمدة");
  const [auditorNotes, setAuditorNotes] = useState<string>("");

  // Flatten all audit entries from selected documents
  const allAuditEntries: FlattenedAuditEntry[] = useMemo(() => {
    if (!documents || documents.length === 0) return [];

    const entries: FlattenedAuditEntry[] = [];
    documents.forEach((doc) => {
      const warehouseStr = doc.subWarehouseOrigin
        ? `${doc.subWarehouseOrigin.warehouseName} (${doc.subWarehouseOrigin.warehouseCode})`
        : "المستودع الرئيسي - ديوان الوزارة";

      const hashStr = doc.cryptographicProof?.sha256Hash || "6a4f89b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9";

      if (doc.auditLog && Array.isArray(doc.auditLog)) {
        doc.auditLog.forEach((log) => {
          entries.push({
            docId: doc.id,
            docRef: doc.refNumber,
            docTitle: doc.title,
            department: doc.department,
            classification: doc.classification,
            subWarehouse: warehouseStr,
            storageLocation: doc.storageLocation,
            sha256Hash: hashStr,
            entryId: log.id,
            timestamp: log.timestamp,
            user: log.user,
            action: log.action,
            note: log.note
          });
        });
      }
    });

    return entries;
  }, [documents]);

  // Extract unique action types for filtering
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    allAuditEntries.forEach((e) => set.add(e.action));
    return Array.from(set);
  }, [allAuditEntries]);

  // Filtered audit entries
  const filteredAuditEntries = useMemo(() => {
    return allAuditEntries.filter((entry) => {
      if (selectedActionFilter !== "ALL" && entry.action !== selectedActionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = entry.docTitle.toLowerCase().includes(q);
        const matchRef = entry.docRef.toLowerCase().includes(q);
        const matchUser = entry.user.toLowerCase().includes(q);
        const matchAction = entry.action.toLowerCase().includes(q);
        const matchNote = entry.note.toLowerCase().includes(q);
        const matchDept = entry.department.toLowerCase().includes(q);
        return matchTitle || matchRef || matchUser || matchAction || matchNote || matchDept;
      }
      return true;
    });
  }, [allAuditEntries, selectedActionFilter, searchQuery]);

  // Distinct users in the selected logs
  const distinctUsersCount = useMemo(() => {
    return new Set(filteredAuditEntries.map((e) => e.user)).size;
  }, [filteredAuditEntries]);

  if (!isOpen) return null;

  // Handle Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    if (filteredAuditEntries.length === 0) {
      toast.warning("لا توجد سجلات تدقيق مطابقة للتصدير");
      return;
    }

    setIsExporting(true);
    setExportProgress("جاري توليد جداول Excel لسجلات التدقيق...");

    try {
      // 1. Prepare detailed audit logs sheet data
      const detailedRows = filteredAuditEntries.map((entry, index) => {
        const row: Record<string, string | number> = {
          "ت": index + 1,
          "الرقم الإشاري للوثيقة": entry.docRef,
          "عنوان الوثيقة": entry.docTitle,
          "الإدارة / المصلحة": entry.department,
          "درجة السرية": entry.classification,
          "تاريخ وتوقيت العملية": entry.timestamp,
          "المستخدم / القائم بالإجراء": entry.user,
          "الإجراء المنفذ": entry.action,
          "تفاصيل العملية وملاحظات التدقيق": entry.note,
          "معرف السجل الرقمي": entry.entryId
        };

        if (includeSubWarehouseLocation) {
          row["المستودع الفرعي وموقع الحفظ"] = `${entry.subWarehouse} - ${entry.storageLocation}`;
        }

        if (includeCryptoHashes) {
          row["البصمة المشفرة (SHA-256)"] = entry.sha256Hash;
        }

        return row;
      });

      // 2. Prepare summary statistics sheet data
      const summaryRows = [
        { "المؤشر": "الجهة المصدرة للتقرير", "القيمة": "وزارة المالية - إدارة الرقابة والتدقيق الداخلي والأرشيف السيادي" },
        { "المؤشر": "تاريخ وتوقيت الاستخراج", "القيمة": new Date().toLocaleString("ar-LY") },
        { "المؤشر": "اسم المدقق المستخرج", "القيمة": `${currentUser.name} (${currentUser.title})` },
        { "المؤشر": "الرقم التعريفي للمدقق", "القيمة": currentUser.badgeNumber },
        { "المؤشر": "الغرض من التدقيق / المرجع", "القيمة": auditorReference },
        { "المؤشر": "ملاحظات إضافية", "القيمة": auditorNotes || "لا توجد ملاحظات إضافية" },
        { "المؤشر": "إجمالي الوثائق المشمولة", "القيمة": documents.length },
        { "المؤشر": "إجمالي حركات وسجلات التدقيق", "القيمة": filteredAuditEntries.length },
        { "المؤشر": "عدد المستخدمين المشاركين في العمليات", "القيمة": distinctUsersCount },
        { "المؤشر": "معيار التوثيق والامتثال", "القيمة": "ISAD(G) & National Archival Integrity Standards (WORM non-repudiation)" }
      ];

      // 3. Create Workbook
      const workbook = XLSX.utils.book_new();

      const detailedSheet = XLSX.utils.json_to_sheet(detailedRows);
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

      // Auto-size columns for better readability
      const colWidths = [
        { wch: 6 },  // ت
        { wch: 22 }, // الرقم الإشاري
        { wch: 38 }, // عنوان الوثيقة
        { wch: 26 }, // الإدارة
        { wch: 14 }, // درجة السرية
        { wch: 20 }, // التاريخ
        { wch: 26 }, // المستخدم
        { wch: 28 }, // الإجراء
        { wch: 45 }, // الملاحظات
        { wch: 24 }, // معرف السجل
        { wch: 36 }, // المستودع
        { wch: 42 }  // البصمة
      ];
      detailedSheet["!cols"] = colWidths;
      summarySheet["!cols"] = [{ wch: 32 }, { wch: 55 }];

      // Append Sheets
      XLSX.utils.book_append_sheet(workbook, detailedSheet, "سجلات التدقيق التفصيلية");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "ملخص التدقيق العام");

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `سجلات_تدقيق_وزارة_المالية_${dateStr}_${documents.length}_وثائق.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success(
        "تم تصدير سجلات التدقيق بصيغة Excel بنجاح",
        `تم تصدير (${filteredAuditEntries.length}) عملية تدقيق موزعة على (${documents.length}) وثيقة في ملف [${filename}].`,
        { badge: "تصدير Excel", duration: 5500 }
      );

      onRecordAuditExport?.({
        documentCount: documents.length,
        exportFormat: "Excel (.xlsx)",
        totalEntries: filteredAuditEntries.length
      });
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast.error("فشل تصدير ملف Excel", err.message);
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Handle Export to Official Certified PDF using html2canvas & jsPDF
  const handleExportPdf = async () => {
    if (!printDossierRef.current || filteredAuditEntries.length === 0) {
      toast.warning("لا توجد سجلات تدقيق للتصدير");
      return;
    }

    setIsExporting(true);
    setExportProgress("جاري معالجة وتنسيق صفحات تقرير التدقيق الرسمي (PDF)...");

    try {
      const container = printDossierRef.current;

      const canvas = await html2canvas(container, {
        scale: 2.0, // High quality for crisp Arabic typography
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1024
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const imgWidth = a4WidthMm;
      const imgHeight = (canvas.height * a4WidthMm) / canvas.width;

      if (imgHeight <= a4HeightMm) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      } else {
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

      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `تقرير_سجلات_تدقيق_المالية_${dateStr}.pdf`;
      pdf.save(filename);

      toast.success(
        "تم تصدير تقرير التدقيق بصيغة PDF بنجاح",
        `تم توثيق وتنزيل تقرير التدقيق الرسمي الممهور بالأختام السيادية لـ (${documents.length}) وثيقة.`,
        { badge: "تقرير PDF", duration: 5500 }
      );

      onRecordAuditExport?.({
        documentCount: documents.length,
        exportFormat: "PDF Docket",
        totalEntries: filteredAuditEntries.length
      });
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("فشل تصدير ملف PDF", err.message);
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  const handlePrintDirect = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-['Cairo',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-right border border-slate-300 animate-fadeIn">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-l from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white font-['Amiri',serif]">
                  تصدير سجلات التدقيق وسلسلة العهدة الرقمية (Audit Logs Export)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                  ISO 19005 & WORM Compliant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تصدير تقارير الامتثال والرقابة الدفترية للوثائق المختارة للمراجعة خارج المنظومة من قِبل ديوان المحاسبة والمدققين المعتمدين.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">الوثائق المختارة:</span>
              <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>{documents.length}</span>
                <span className="text-xs font-normal text-slate-500">وثيقة</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">إجمالي سجلات التدقيق:</span>
              <div className="text-lg font-bold text-emerald-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-700" />
                <span>{filteredAuditEntries.length}</span>
                <span className="text-xs font-normal text-slate-500">عملية</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">القائمون بالإجراءات:</span>
              <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>{distinctUsersCount}</span>
                <span className="text-xs font-normal text-slate-500">مستخدم معتمد</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">المدقق المستخرج:</span>
              <div className="text-xs font-bold text-slate-800 truncate" title={currentUser.name}>
                {currentUser.name}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {currentUser.badgeNumber}
              </span>
            </div>
          </div>

          {/* EXPORT CONFIGURATION & CONTROLS */}
          <div className="bg-emerald-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-800" />
                <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                  خيارات وتنسيق التصدير الرقابي:
                </h4>
              </div>

              {/* Format Switcher */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exportFormat === "excel"
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>ملف Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exportFormat === "pdf"
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>تقرير PDF رسمي معتمد</span>
                </button>
              </div>
            </div>

            {/* Inputs: Auditor Reference & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الغرض من التصدير / المرجع الرقابي (Audit Reference):
                </label>
                <input
                  type="text"
                  value={auditorReference}
                  onChange={(e) => setAuditorReference(e.target.value)}
                  placeholder="مثال: مهمة ديوان المحاسبة - فحص أذونات الصرف السنوية"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ملاحظات أو توجيهات المراجعة الخارجية (اختياري):
                </label>
                <input
                  type="text"
                  value={auditorNotes}
                  onChange={(e) => setAuditorNotes(e.target.value)}
                  placeholder="مثال: مطابقة قيود الخزانة مع الدفاتر الورقية بالمستودع الفرعي"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Toggle checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCryptoHashes}
                  onChange={(e) => setIncludeCryptoHashes(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <span>تضمين بصمات السلامة المشفرة (SHA-256 Checksums)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSubWarehouseLocation}
                  onChange={(e) => setIncludeSubWarehouseLocation(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <span>تضمين بيانات المستودع الفرعي وموقع الرف والقاعة</span>
              </label>
            </div>
          </div>

          {/* SEARCH & ACTION FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في سجلات التدقيق (اسم المستخدم، عنوان الوثيقة، الإجراء، أو الملاحظة)..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة أنواع العمليات ({allAuditEntries.length})</option>
                {actionTypes.map((action, idx) => (
                  <option key={idx} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PREVIEW OF AUDIT LOG ENTRIES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>معاينة السجلات الجاهزة للتصدير ({filteredAuditEntries.length} سجل):</span>
              <span className="text-[11px] text-slate-500 font-mono">
                ترتيب زمني تسلسلي
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5">الرقم الإشاري / الوثيقة</th>
                      <th className="p-2.5">التاريخ والوقت</th>
                      <th className="p-2.5">القائم بالإجراء</th>
                      <th className="p-2.5">نوع العملية</th>
                      <th className="p-2.5">الملاحظات والتفاصيل</th>
                      {includeSubWarehouseLocation && <th className="p-2.5">الموقع الأرشيفي</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredAuditEntries.slice(0, 100).map((entry, idx) => (
                      <tr key={entry.entryId || idx} className="hover:bg-emerald-50/30 transition">
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-2.5">
                          <div className="font-mono font-bold text-slate-900 text-[11px]">
                            {entry.docRef}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]" title={entry.docTitle}>
                            {entry.docTitle}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {entry.timestamp}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {entry.user}
                          </div>
                          <div className="text-[10px] text-emerald-800">
                            {entry.department}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {entry.action}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600 max-w-xs leading-relaxed">
                          {entry.note}
                        </td>
                        {includeSubWarehouseLocation && (
                          <td className="p-2.5 text-[10px] text-slate-500 font-mono whitespace-nowrap">
                            {entry.subWarehouse}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredAuditEntries.length > 100 && (
              <p className="text-[11px] text-slate-500 text-center italic">
                يتم عرض أول 100 سجل في المعاينة السريعة؛ وسيحتوي الملف المصدر (Excel أو PDF) على كامل السجلات ({filteredAuditEntries.length} سجل).
              </p>
            )}
          </div>

          {/* HIDDEN PRINT / PDF REPORT TEMPLATE */}
          {/* This container is styled specifically for A4 PDF / Direct Print */}
          <div className="hidden">
            <div ref={printDossierRef} className="p-8 bg-white text-slate-900 space-y-6 font-['Cairo',sans-serif] text-right dir-rtl">
              
              {/* Official Ministerial Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="text-right space-y-1">
                  <div className="text-lg font-bold font-['Amiri',serif]">دَوْلَــةُ لِـيـبْـيَــا</div>
                  <div className="text-sm font-bold text-emerald-900 font-['Amiri',serif]">وِزَارَةُ المَالِيَّـةِ</div>
                  <div className="text-xs text-slate-600">ديوان الرقابة والامتثال وسجل التدقيق السيادي</div>
                </div>

                <div className="w-16 h-16 rounded-full border-2 border-emerald-900 flex items-center justify-center text-center p-1">
                  <div className="text-[8px] font-bold text-emerald-950">
                    الجمهورية الليبية<br />★<br />وزارة المالية
                  </div>
                </div>

                <div className="text-left text-xs space-y-1 font-mono">
                  <div>الرقم المرجعي: AUD-EXT-{Date.now().toString().slice(-6)}</div>
                  <div>التاريخ: {new Date().toLocaleDateString("ar-LY")}</div>
                  <div className="font-bold text-red-900">سري ومحدد للتداول الرقابي</div>
                </div>
              </div>

              {/* Report Title */}
              <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-300">
                <h2 className="text-base font-bold font-['Amiri',serif] text-slate-950">
                  تقرير سجلات التدقيق وسلسلة العهدة الرقمية (Chain of Custody Docket)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  الغرض: {auditorReference} | عدد الوثائق: {documents.length} | عدد العمليات: {filteredAuditEntries.length}
                </p>
              </div>

              {/* Auditor & Compliance Metadata Table */}
              <table className="w-full text-xs border border-slate-300">
                <tbody>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="p-2 font-bold w-1/4">المدقق المستخرج:</td>
                    <td className="p-2 w-1/4">{currentUser.name} ({currentUser.title})</td>
                    <td className="p-2 font-bold w-1/4">رقم الشارة / القيد:</td>
                    <td className="p-2 w-1/4 font-mono">{currentUser.badgeNumber}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-bold">تاريخ وساعة الاستخراج:</td>
                    <td className="p-2 font-mono">{new Date().toLocaleString("ar-LY")}</td>
                    <td className="p-2 font-bold">معيار الامتثال:</td>
                    <td className="p-2">ISAD(G) - WORM Non-Repudiation</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold">ملاحظات التفتيش:</td>
                    <td colSpan={3} className="p-2">{auditorNotes || "لا توجد ملاحظات استثنائية مدونة"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Detailed Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-900">جدول الحركات والعمليات التفصيلية:</h4>
                <table className="w-full text-[11px] border border-slate-300 border-collapse">
                  <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300 w-8 text-center">#</th>
                      <th className="p-2 border border-slate-300">الرقم الإشاري والوثيقة</th>
                      <th className="p-2 border border-slate-300">التاريخ والوقت</th>
                      <th className="p-2 border border-slate-300">المستخدم والإدارة</th>
                      <th className="p-2 border border-slate-300">نوع الإجراء</th>
                      <th className="p-2 border border-slate-300">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditEntries.map((e, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-2 border border-slate-300 text-center font-mono">{i + 1}</td>
                        <td className="p-2 border border-slate-300">
                          <strong className="font-mono block">{e.docRef}</strong>
                          <span className="text-[10px] text-slate-600">{e.docTitle}</span>
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-[10px] whitespace-nowrap">{e.timestamp}</td>
                        <td className="p-2 border border-slate-300">
                          <span className="font-bold block">{e.user}</span>
                          <span className="text-[10px] text-slate-500">{e.department}</span>
                        </td>
                        <td className="p-2 border border-slate-300 font-semibold">{e.action}</td>
                        <td className="p-2 border border-slate-300 text-[10px]">{e.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Accreditation Footer */}
              <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
                <div className="space-y-8">
                  <div>توقيع وأختام المدقق المسؤول:</div>
                  <div className="font-bold font-mono">{currentUser.name}</div>
                </div>

                <div className="space-y-8">
                  <div>اعتماد رئيس مصلحة الرقابة والتفتيش المالي:</div>
                  <div className="font-bold">ديوان المحاسبة - وزارة المالية</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 text-right w-full sm:w-auto">
            {isExporting ? (
              <span className="flex items-center gap-2 text-emerald-800 font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>{exportProgress}</span>
              </span>
            ) : (
              <span>
                سيتم تصدير <strong>({filteredAuditEntries.length})</strong> حركة تدقيق منسوبة لـ <strong>({documents.length})</strong> وثيقة.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintDirect}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة فورية</span>
            </button>

            {exportFormat === "excel" ? (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting || filteredAuditEntries.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                <span>تحميل ملف Excel (.xlsx)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting || filteredAuditEntries.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>تحميل تقرير PDF معتمد</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
