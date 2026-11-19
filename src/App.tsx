import React, { useState, useMemo } from "react";
import { Header, AppTabType } from "./components/Header";
import { ArchiveCatalogue } from "./components/ArchiveCatalogue";
import { AdvancedSearchEngine } from "./components/AdvancedSearchEngine";
import { SecureDigitalVault } from "./components/SecureDigitalVault";
import { PaperlessScanner } from "./components/PaperlessScanner";
import { SmartArchiveAssistant } from "./components/SmartArchiveAssistant";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { DocumentViewerModal } from "./components/DocumentViewerModal";
import { RetentionAlertsDrawer } from "./components/RetentionAlertsDrawer";
import { RetentionActionModal } from "./components/RetentionActionModal";
import { WorkflowSpeedBar } from "./components/WorkflowSpeedBar";
import { initialHistoricalDocuments } from "./data/historicalDocuments";
import { ArchivedDocument, LibyanEra, VaultUser } from "./types";
import { VAULT_SYSTEM_USERS, ensureDocumentCryptographicProof } from "./utils/vaultCrypto";
import { 
  getProactiveRetentionAlerts, 
  extendDocumentRetention, 
  flagDocumentForDisposal 
} from "./utils/retentionLifecycle";
import { BatchUpdatePayload } from "./components/BatchTaggingModal";
import { DesktopTitleBar } from "./components/DesktopTitleBar";
import { Building2, ShieldCheck, CheckCircle2, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "./context/ToastContext";
import { useAuth } from "./context/AuthContext";
import { UserManagementConsole } from "./components/UserManagementConsole";
import { AuthLoginModal } from "./components/AuthLoginModal";

export default function App() {
  const toast = useToast();
  const { currentUser: authUser, quickSwitchUser } = useAuth();

  const [documents, setDocuments] = useState<ArchivedDocument[]>(initialHistoricalDocuments);
  const [activeTab, setActiveTab] = useState<AppTabType>("catalogue");
  const [selectedDocument, setSelectedDocument] = useState<ArchivedDocument | null>(null);
  const [selectedEraFilter, setSelectedEraFilter] = useState<LibyanEra | "ALL">("ALL");
  const [fallbackUser, setFallbackUser] = useState<VaultUser>(VAULT_SYSTEM_USERS[0]);

  // Auth modals state
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Active user priority: AuthContext (DB backed) -> fallback
  const currentUser: VaultUser = (authUser as VaultUser) || fallbackUser;

  // Retention Lifecycle Drawer & Action Modals State
  const [isRetentionDrawerOpen, setIsRetentionDrawerOpen] = useState<boolean>(false);
  const [retentionModalDoc, setRetentionModalDoc] = useState<ArchivedDocument | null>(null);
  const [retentionModalMode, setRetentionModalMode] = useState<"extend" | "dispose">("extend");

  // Proactive Retention Alerts memoization for zero-lag responsiveness
  const retentionAlerts = useMemo(() => {
    return getProactiveRetentionAlerts(documents);
  }, [documents]);

  const handleDocumentArchived = (newDoc: ArchivedDocument) => {
    // Ensure cryptographic proof is attached to freshly scanned document
    const securedDoc = ensureDocumentCryptographicProof(newDoc);
    setDocuments((prev) => [securedDoc, ...prev]);
    setSelectedDocument(securedDoc);
    setActiveTab("catalogue");

    // Display rich sovereign confirmation toast
    toast.success(
      "تمت أرشفة الوثيقة واعتمادها رسمياً",
      `تم إيداع "${newDoc.title}" بالرقم الإشاري [${newDoc.refNumber}] في المستودع الرقمي للوزارة وتوليد البصمة المشفرة.`,
      {
        badge: "أرشفة لاورقية",
        duration: 6500,
        action: {
          label: "معاينة الوثيقة",
          onClick: () => setSelectedDocument(securedDoc)
        }
      }
    );
  };

  const handleBatchUpdateDocuments = (
    docIds: string[],
    payload: BatchUpdatePayload
  ) => {
    const docIdSet = new Set(docIds);
    setDocuments((prev) =>
      prev.map((doc) => {
        if (!docIdSet.has(doc.id)) return doc;

        let updatedKeywords = [...doc.keywords];

        if (payload.tagAction === "add" && payload.tags.length > 0) {
          const existingSet = new Set(doc.keywords);
          payload.tags.forEach((t) => existingSet.add(t));
          updatedKeywords = Array.from(existingSet);
        } else if (payload.tagAction === "remove" && payload.tags.length > 0) {
          const removeSet = new Set(payload.tags);
          updatedKeywords = doc.keywords.filter((t) => !removeSet.has(t));
        } else if (payload.tagAction === "replace") {
          updatedKeywords = [...payload.tags];
        }

        const updatedDepartment = payload.updateDepartment && payload.department ? payload.department : doc.department;
        const updatedDocType = payload.updateDocType && payload.docType ? payload.docType : doc.docType;
        const updatedClassification = payload.updateClassification && payload.classification ? payload.classification : doc.classification;
        const updatedStatus = payload.updateStatus && payload.status ? payload.status : doc.status;

        // Build audit trail note
        const changeNotes: string[] = [];
        if (payload.tagAction !== "none" && payload.tags.length > 0) {
          changeNotes.push(`الوسوم (${payload.tagAction}): ${payload.tags.join("، ")}`);
        }
        if (payload.updateDepartment && payload.department) {
          changeNotes.push(`الإدارة: ${payload.department}`);
        }
        if (payload.updateDocType && payload.docType) {
          changeNotes.push(`نوع الوثيقة: ${payload.docType}`);
        }
        if (payload.updateClassification && payload.classification) {
          changeNotes.push(`السرية: ${payload.classification}`);
        }
        if (payload.updateStatus && payload.status) {
          changeNotes.push(`الحالة: ${payload.status}`);
        }

        const auditEntry = {
          id: `AUDIT-BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          action: "تحديث جماعي للوسوم والتصنيفات الأرشيفية (Batch Tagging)",
          user: currentUser.name,
          timestamp: new Date().toISOString().split("T")[0],
          note: `${payload.auditNote} [${changeNotes.join(" | ")}]`
        };

        const updatedDoc: ArchivedDocument = {
          ...doc,
          keywords: updatedKeywords,
          department: updatedDepartment,
          docType: updatedDocType,
          classification: updatedClassification,
          status: updatedStatus,
          auditLog: [auditEntry, ...doc.auditLog]
        };

        return ensureDocumentCryptographicProof(updatedDoc);
      })
    );

    // Display confirmation toast for batch operation
    toast.success(
      `تم التحديث الجماعي لـ (${docIds.length}) وثيقة بنجاح`,
      `تم تطبيق تعديلات الوسوم والتصنيف الأرشيفي وربطها بسجل التدقيق الجنائي للأرشيف الوطني.`,
      {
        badge: "تحديث جماعي",
        duration: 5500
      }
    );
  };

  const handleToggleVaultLock = (docId: string, locked: boolean) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const updated: ArchivedDocument = {
            ...doc,
            vaultLocked: locked,
            classification: locked ? "سري للغاية" : doc.classification,
            auditLog: [
              ...doc.auditLog,
              {
                id: `AUDIT-VAULT-${Date.now()}`,
                action: locked ? "إيداع وتحصين في الخزينة السيادية (WORM Lock)" : "فك تحصين الخزينة وتخفيض القيد",
                user: currentUser.name,
                timestamp: new Date().toISOString().split("T")[0],
                note: `تم تغيير حالة التحصين السيادي بواسطة ${currentUser.title}`
              }
            ]
          };
          return ensureDocumentCryptographicProof(updated);
        }
        return doc;
      })
    );

    if (locked) {
      toast.warning(
        "تم تحصين السجل في الخزينة السيادية (WORM)",
        "تم تفعيل قيد الكتابة لمرة واحدة والقراءة الدائمة مع رفع السرية إلى 'سري للغاية'.",
        { badge: "خزينة WORM", duration: 5000 }
      );
    } else {
      toast.info(
        "تم فك التحصين وتخفيض القيد الأمني",
        "أعيد السجل إلى فهرس التداول الاعتيادي مع قيد العملية في سجل التدقيق الرقابي.",
        { badge: "فك القيد", duration: 5000 }
      );
    }
  };

  const handleSwitchUser = async (user: VaultUser) => {
    setFallbackUser(user);
    const usernameMap: Record<string, string> = {
      "user-1": "admin",
      "user-2": "auditor",
      "user-3": "archivist",
      "user-4": "researcher"
    };
    const targetUsername = usernameMap[user.id] || "admin";
    try {
      await quickSwitchUser(targetUsername);
    } catch {
      // Fallback already assigned
    }
    toast.info(
      `تم تفعيل حساب: ${user.name}`,
      `تم ضبط الصلاحيات والتصريح الأمني إلى: [${user.clearanceLevel}] (${user.title}).`,
      { badge: "التصريح الأمني", duration: 4000 }
    );
  };

  // Retention Lifecycle actions
  const handleConfirmExtend = (
    docId: string,
    payload: {
      extensionYears: number;
      decisionNumber: string;
      justification: string;
    }
  ) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updated = extendDocumentRetention(targetDoc, {
      ...payload,
      user: currentUser
    });

    setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    if (selectedDocument?.id === docId) {
      setSelectedDocument(updated);
    }

    toast.success(
      "تم تمديد فترة الحفظ المالي بنجاح",
      `تم تمديد الوثيقة [${targetDoc.refNumber}] بموجب القرار الوزاري رقم (${payload.decisionNumber}) لمدة +${payload.extensionYears} سنوات.`,
      { badge: "تمديد الحفظ", duration: 6000 }
    );
  };

  const handleConfirmDisposal = (
    docId: string,
    payload: {
      committeeRef: string;
      headOfCommittee: string;
      auditBureauRep: string;
      destructionMethod: "إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم" | "أرشفة صامتة مع إلغاء التداول المالي";
      notes: string;
    }
  ) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updated = flagDocumentForDisposal(targetDoc, {
      committeeRef: payload.committeeRef,
      headOfCommittee: payload.headOfCommittee,
      auditBureauRepresentative: payload.auditBureauRep,
      destructionMethod: payload.destructionMethod,
      notes: payload.notes,
      user: currentUser
    });

    setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    if (selectedDocument?.id === docId) {
      setSelectedDocument(updated);
    }

    toast.warning(
      "تم قيد محضر الإتلاف النظامي",
      `تم إحالة الوثيقة [${targetDoc.refNumber}] لمراجعة لجنة الإتلاف [${payload.committeeRef}] بمشاركة ممثل ديوان المحاسبة.`,
      { badge: "إحالة للإتلاف", duration: 6500 }
    );
  };

  const handleRecordPrintAudit = (
    docId: string,
    auditEntry: { user: string; timestamp: string; action: string; note: string }
  ) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const updated: ArchivedDocument = {
            ...doc,
            auditLog: [
              {
                id: `audit-prnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                action: auditEntry.action,
                user: auditEntry.user,
                timestamp: auditEntry.timestamp,
                note: auditEntry.note
              },
              ...doc.auditLog
            ]
          };
          if (selectedDocument?.id === docId) {
            setSelectedDocument(updated);
          }
          return updated;
        }
        return doc;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-900 flex flex-col font-['Cairo',sans-serif]">
      {/* Cross-Platform Electron Desktop Title Bar (active only when running inside Electron shell) */}
      <DesktopTitleBar />

      {/* Official Libyan Ministerial Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        onOpenScanner={() => setActiveTab("scanner")}
        selectedEraFilter={selectedEraFilter}
        setSelectedEraFilter={setSelectedEraFilter}
        currentUser={currentUser}
        retentionAlertsCount={retentionAlerts.totalUrgentCount}
        onOpenRetentionAlerts={() => setIsRetentionDrawerOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Workflow & Productivity Speed Bar */}
      <WorkflowSpeedBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        retentionAlertsCount={retentionAlerts.totalUrgentCount}
        onOpenRetentionAlerts={() => setIsRetentionDrawerOpen(true)}
        onOpenScanner={() => setActiveTab("scanner")}
        onQuickFilterEra={(era) => {
          setSelectedEraFilter(era);
          setActiveTab("catalogue");
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8">
        {activeTab === "catalogue" && (
          <ArchiveCatalogue
            documents={documents}
            onSelectDocument={(doc) => setSelectedDocument(doc)}
            onOpenScanner={() => setActiveTab("scanner")}
            selectedEraFilter={selectedEraFilter}
            setSelectedEraFilter={setSelectedEraFilter}
            onOpenAdvancedSearch={() => setActiveTab("search-engine")}
            onOpenVault={() => setActiveTab("vault")}
            currentUser={currentUser}
            onBatchUpdateDocuments={handleBatchUpdateDocuments}
            onOpenAlertsCenter={() => setIsRetentionDrawerOpen(true)}
            onOpenExtendModal={(doc) => {
              setRetentionModalDoc(doc);
              setRetentionModalMode("extend");
            }}
            onOpenDisposalModal={(doc) => {
              setRetentionModalDoc(doc);
              setRetentionModalMode("dispose");
            }}
            onRecordPrintAudit={handleRecordPrintAudit}
          />
        )}

        {activeTab === "search-engine" && (
          <AdvancedSearchEngine
            documents={documents}
            onSelectDocument={(doc) => setSelectedDocument(doc)}
            currentUser={currentUser}
          />
        )}

        {activeTab === "vault" && (
          <SecureDigitalVault
            documents={documents}
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            onToggleVaultLock={handleToggleVaultLock}
            onInspectDocument={(doc) => setSelectedDocument(doc)}
            onOpenUserManagement={() => setIsUserManagementOpen(true)}
          />
        )}

        {activeTab === "scanner" && (
          <PaperlessScanner
            onDocumentArchived={handleDocumentArchived}
            onCancel={() => setActiveTab("catalogue")}
          />
        )}

        {activeTab === "ai-query" && (
          <SmartArchiveAssistant
            documents={documents}
            onOpenDocument={(doc) => setSelectedDocument(doc)}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsDashboard
            documents={documents}
            currentUser={currentUser}
            onOpenScanner={() => setActiveTab("scanner")}
            onSelectDocument={(doc) => setSelectedDocument(doc)}
            onOpenCatalogueWithEra={(era) => {
              if (era) setSelectedEraFilter(era);
              setActiveTab("catalogue");
            }}
            onOpenExtendModal={(doc) => {
              setRetentionModalDoc(doc);
              setRetentionModalMode("extend");
            }}
            onOpenDisposalModal={(doc) => {
              setRetentionModalDoc(doc);
              setRetentionModalMode("dispose");
            }}
          />
        )}
      </main>

      {/* Document Detailed Dossier Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          document={selectedDocument}
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
          onClose={() => setSelectedDocument(null)}
          onOpenExtend={(doc) => {
            setRetentionModalDoc(doc);
            setRetentionModalMode("extend");
          }}
          onOpenDisposal={(doc) => {
            setRetentionModalDoc(doc);
            setRetentionModalMode("dispose");
          }}
          onUpdateDocument={(updatedDoc) => {
            setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
            setSelectedDocument(updatedDoc);
          }}
          onRecordPrintAudit={handleRecordPrintAudit}
        />
      )}

      {/* Proactive Retention Alerts Drawer */}
      <RetentionAlertsDrawer
        isOpen={isRetentionDrawerOpen}
        onClose={() => setIsRetentionDrawerOpen(false)}
        documents={documents}
        currentUser={currentUser}
        onSelectDocument={(doc) => {
          setSelectedDocument(doc);
          setIsRetentionDrawerOpen(false);
        }}
        onOpenExtendModal={(doc) => {
          setRetentionModalDoc(doc);
          setRetentionModalMode("extend");
          setIsRetentionDrawerOpen(false);
        }}
        onOpenDisposalModal={(doc) => {
          setRetentionModalDoc(doc);
          setRetentionModalMode("dispose");
          setIsRetentionDrawerOpen(false);
        }}
      />

      {/* Retention Legal Action Modal (Extend Retention or Committee Disposal) */}
      <RetentionActionModal
        isOpen={!!retentionModalDoc}
        document={retentionModalDoc}
        initialMode={retentionModalMode}
        onClose={() => setRetentionModalDoc(null)}
        onConfirmExtend={handleConfirmExtend}
        onConfirmDisposal={handleConfirmDisposal}
        currentUser={currentUser}
      />

      {/* User Management & RBAC Console Modal */}
      <UserManagementConsole
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Institutional Authentication & Profile Switcher Modal */}
      <AuthLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
      />

      {/* Official Footer */}
      <footer className="bg-[#0b1f15] text-emerald-200/80 border-t border-emerald-900/60 mt-auto py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-emerald-900/60">
            {/* Column 1: Ministry Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold font-['Amiri',serif] text-base">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>دولة ليبيا - وزارة المالية</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-300/70">
                المركز الوطني للأرشيف الرقمي والتوثيق المالي الموحد، الجهة المسؤولة عن أرشفة ورقمنة التراث المالي والسيادي للدولة الليبية.
              </p>
            </div>

            {/* Column 2: Legal & Standards */}
            <div className="space-y-2">
              <div className="font-bold text-white text-xs">المعايير واللوائح</div>
              <ul className="space-y-1 text-[11px] text-emerald-300/70">
                <li className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>معيار الأرشفة الدولي العام ISAD(G)</span>
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>اللائحة المالية للعقود والميزانية</span>
                </li>
                <li>قانون الخزانة العامة وديوان المحاسبة الليبي</li>
              </ul>
            </div>

            {/* Column 3: Historical Branches */}
            <div className="space-y-2">
              <div className="font-bold text-white text-xs">الفروع والمستودعات المركزية</div>
              <ul className="space-y-1 text-[11px] text-emerald-300/70">
                <li className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>طرابلس: ديوان وزارة المالية - الظهرة</span>
                </li>
                <li className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>بنغازي: مجمع الخزانة وسجلات الجمارك</span>
                </li>
                <li className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>سبها: مراقبة المالية وسجلات الجنوب</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Paperless Verification */}
            <div className="space-y-2">
              <div className="font-bold text-white text-xs">منظومة التحول اللاورقي</div>
              <p className="text-[11px] leading-relaxed text-emerald-300/70">
                جميع الوثائق ممهورة بالباركود الأرشيفي والشهادة الرقمية المشفرة لضمان صحة السجلات التاريخية وعدم قابليتها للتزوير.
              </p>
              <div className="pt-1">
                <span className="inline-block bg-emerald-950 px-2 py-1 rounded border border-emerald-700/60 font-mono text-[10px] text-amber-300">
                  BUILD-ID: LY-MOF-ARCHIVE-V4.2
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-emerald-400/60 text-center sm:text-right">
            <div>
              جميع الحقوق محفوظة © {new Date().getFullYear()} - وزارة المالية، دولة ليبيا.
            </div>
            <div className="flex items-center gap-4">
              <span>النسخة الرقمية المعتمدة</span>
              <span>دعم اللغة العربية ar-LY (RTL)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
