import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Shield,
  Database,
  Key,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  Download,
  Copy,
  Check,
  Server,
  Activity,
  HardDrive,
  FileCode,
  Eye,
  LogOut,
  UserCheck,
  ChevronRight,
  Sparkles,
  Building2
} from "lucide-react";
import { OrgStructureManagement } from "./OrgStructureManagement";
import { useAuth } from "../context/AuthContext";
import {
  AppPermission,
  PermissionId,
  RoleDefinition,
  SecurityAuditLogEntry,
  SecurityClassification,
  UserAccount,
  VaultRole
} from "../types";

interface UserManagementConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLoginModal?: () => void;
}

export const UserManagementConsole: React.FC<UserManagementConsoleProps> = ({
  isOpen,
  onClose,
  onOpenLoginModal
}) => {
  const {
    currentUser,
    token,
    databaseStats,
    hasPermission,
    refreshDatabaseStats,
    switchDatabaseEngine,
    quickSwitchUser
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"users" | "roles" | "org" | "database" | "audit">("users");

  // State for Users Tab
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedClearanceFilter, setSelectedClearanceFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modals inside Console
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    title: "",
    role: "RESEARCHER" as VaultRole,
    clearanceLevel: "عام" as SecurityClassification,
    nationalId: "",
    department: "ديوان وزارة المالية",
    badgeNumber: "",
    phone: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Roles Tab
  const [rolesList, setRolesList] = useState<RoleDefinition[]>([]);
  const [allPermissions, setAllPermissions] = useState<AppPermission[]>([]);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<VaultRole | null>(null);
  const [editedRolePermissions, setEditedRolePermissions] = useState<PermissionId[]>([]);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // State for Database Tab
  const [pgHost, setPgHost] = useState("localhost");
  const [pgPort, setPgPort] = useState(5432);
  const [pgDatabase, setPgDatabase] = useState("libyan_archive_auth");
  const [pgUser, setPgUser] = useState("postgres");
  const [pgPassword, setPgPassword] = useState("");
  const [pgSsl, setPgSsl] = useState(false);
  const [pgTestResult, setPgTestResult] = useState<{ success: boolean; latencyMs?: number; message?: string } | null>(null);
  const [isTestingPg, setIsTestingPg] = useState(false);
  const [isSwitchingEngine, setIsSwitchingEngine] = useState(false);
  const [sqlExportContent, setSqlExportContent] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // State for Audit Logs Tab
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogEntry[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Toast / notification
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showAlert = (text: string, type: "success" | "error" = "success") => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedRoleFilter !== "ALL") params.append("role", selectedRoleFilter);
      if (selectedClearanceFilter !== "ALL") params.append("clearance", selectedClearanceFilter);
      if (selectedStatusFilter !== "ALL") params.append("status", selectedStatusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch Roles and Permissions
  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/auth/permissions")
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRolesList(rolesData.roles || []);
        if (!selectedRoleForEdit && rolesData.roles?.length > 0) {
          setSelectedRoleForEdit(rolesData.roles[0].id);
          setEditedRolePermissions(rolesData.roles[0].permissions || []);
        }
      }

      if (permsRes.ok) {
        const permsData = await permsRes.json();
        setAllPermissions(permsData.permissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch("/api/security-audit?limit=150");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Fetch SQL Export
  const fetchSqlExport = async () => {
    try {
      const res = await fetch("/api/database/export-sql");
      if (res.ok) {
        const text = await res.text();
        setSqlExportContent(text);
      }
    } catch (err) {
      console.error("Failed to export SQL:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchRolesAndPermissions();
      refreshDatabaseStats();
      fetchAuditLogs();
      fetchSqlExport();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [searchQuery, selectedRoleFilter, selectedClearanceFilter, selectedStatusFilter]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify(newUserForm)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر إنشاء الحساب");
      }

      showAlert(`تم إنشاء حساب الموظف [${newUserForm.fullName}] بنجاح`);
      setShowAddUserModal(false);
      setNewUserForm({
        username: "",
        email: "",
        password: "",
        fullName: "",
        title: "",
        role: "RESEARCHER",
        clearanceLevel: "عام",
        nationalId: "",
        department: "ديوان وزارة المالية",
        badgeNumber: "",
        phone: ""
      });
      await fetchUsers();
      await refreshDatabaseStats();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit User Submit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          fullName: editingUser.name,
          title: editingUser.title,
          role: editingUser.role,
          clearanceLevel: editingUser.clearanceLevel,
          department: editingUser.department,
          badgeNumber: editingUser.badgeNumber,
          phone: editingUser.phone
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر تحديث البيانات");
      }

      showAlert("تم تحديث بيانات المستخدم والتصريح الأمني بنجاح");
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle User Active / Suspended
  const handleToggleStatus = async (user: UserAccount) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/users/${user.id}/toggle-status`, {
        method: "POST",
        headers
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر تغيير حالة الحساب");
      }

      showAlert(`تم تغيير حالة الحساب إلى [${data.user.status === "active" ? "نشط" : "موقوف"}]`);
      await fetchUsers();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/users/${resetPwdUser.id}/reset-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ newPassword: newPasswordInput })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر إعادة تعيين كلمة المرور");
      }

      showAlert(`تم تعيين كلمة مرور جديدة للموظف: ${resetPwdUser.name}`);
      setResetPwdUser(null);
      setNewPasswordInput("");
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserAccount) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب [${user.name}] نهائياً من قاعدة البيانات؟`)) {
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر حذف الحساب");
      }

      showAlert(`تم حذف حساب [${user.name}] بنجاح`);
      await fetchUsers();
      await refreshDatabaseStats();
    } catch (err: any) {
      showAlert(err.message, "error");
    }
  };

  // Save Role Permissions
  const handleSaveRolePermissions = async () => {
    if (!selectedRoleForEdit) return;
    setIsSavingRole(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/roles/${selectedRoleForEdit}/permissions`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ permissions: editedRolePermissions })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر تحديث صلاحيات الدور");
      }

      showAlert("تم حفظ وتطبيق مصفوفة الصلاحيات المحدثة فورياً");
      await fetchRolesAndPermissions();
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setIsSavingRole(false);
    }
  };

  // Test PostgreSQL Connection
  const handleTestPostgres = async () => {
    setIsTestingPg(true);
    setPgTestResult(null);

    try {
      const res = await fetch("/api/database/test-postgres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: pgHost,
          port: pgPort,
          database: pgDatabase,
          user: pgUser,
          password: pgPassword,
          ssl: pgSsl
        })
      });

      const data = await res.json();
      setPgTestResult(data);
    } catch (err: any) {
      setPgTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingPg(false);
    }
  };

  // Switch Engine
  const handleSwitchEngine = async (targetEngine: "sqlite" | "postgresql") => {
    if (targetEngine === databaseStats?.currentEngine) {
      showAlert(`المحرك ${targetEngine.toUpperCase()} نشط بالفعل`);
      return;
    }

    if (!window.confirm(`هل تؤكد تبديل المحرك النشط إلى [${targetEngine.toUpperCase()}] وترحيل التهيئة الفورية؟`)) {
      return;
    }

    setIsSwitchingEngine(true);
    try {
      const res = await switchDatabaseEngine(targetEngine, {
        host: pgHost,
        port: pgPort,
        database: pgDatabase,
        user: pgUser,
        password: pgPassword,
        ssl: pgSsl
      });

      if (res.success) {
        showAlert(`تم تفعيل المحرك [${targetEngine.toUpperCase()}] بنجاح!`);
        await fetchSqlExport();
        await fetchUsers();
      } else {
        showAlert(res.error || "فشل تبديل المحرك", "error");
      }
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setIsSwitchingEngine(false);
    }
  };

  // Filtered Permissions grouped by category
  const permissionCategories = useMemo(() => {
    const map = new Map<string, AppPermission[]>();
    for (const p of allPermissions) {
      const existing = map.get(p.category) || [];
      existing.push(p);
      map.set(p.category, existing);
    }
    return Array.from(map.entries());
  }, [allPermissions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">منظومة إدارة المستخدمين والصلاحيات وقواعد البيانات</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  المحرك النشط: {databaseStats?.currentEngine?.toUpperCase() || "SQLITE"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                وزارة المالية الليبية - الأرشيف الرقمي السيادي والتحكم المزدوج (SQLite & PostgreSQL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Profile Info */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
                <span className="text-slate-400">الجلسة:</span>
                <span className="font-semibold text-amber-300">{currentUser.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUser.clearanceLevel}
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="إغلاق"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Global Toast Alert */}
        {alertMessage && (
          <div
            className={`px-6 py-2.5 text-sm flex items-center justify-between transition-all ${
              alertMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-rose-50 text-rose-800 border-b border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {alertMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{alertMessage.text}</span>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-xs opacity-75 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === "users"
                  ? "border-amber-600 text-amber-700 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>دليل الموظفين والحسابات</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-slate-200 text-slate-700">
                {databaseStats?.tableStats.usersCount || usersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === "roles"
                  ? "border-amber-600 text-amber-700 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>مصفوفة الأدوار والصلاحيات (RBAC)</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-slate-200 text-slate-700">
                {databaseStats?.tableStats.rolesCount || 4}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("org")}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === "org"
                  ? "border-amber-600 text-amber-700 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>الهيكل التنظيمي للوزارة</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-amber-100 text-amber-800 font-bold border border-amber-200">
                {databaseStats?.tableStats.orgUnitsCount || 12}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("database")}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === "database"
                  ? "border-amber-600 text-amber-700 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>محول قاعدة البيانات (SQLite / PostgreSQL)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Dual Engine
              </span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all ${
                activeTab === "audit"
                  ? "border-amber-600 text-amber-700 bg-white shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>سجل التدقيق والامتثال الأمني</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-slate-200 text-slate-700">
                {databaseStats?.tableStats.auditLogsCount || auditLogs.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => {
                fetchUsers();
                refreshDatabaseStats();
                fetchAuditLogs();
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors"
              title="تحديث البيانات اللحظية"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* TAB 1: USERS DIRECTORY */}
          {activeTab === "users" && (
            <div className="space-y-5">
              {/* Filter and Action Bar */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 flex items-center gap-2 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الرقم الوطني، الشارة، الإدارة..."
                    className="w-full pr-9 pl-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">جميع الأدوار</option>
                    <option value="CHIEF_CUSTODIAN">أمين الخزينة العامة</option>
                    <option value="AUDIT_INSPECTOR">مراقب ديوان المحاسبة</option>
                    <option value="SENIOR_ARCHIVIST">كبير أخصائيي الأرشفة</option>
                    <option value="RESEARCHER">باحث مالي</option>
                  </select>

                  <select
                    value={selectedClearanceFilter}
                    onChange={(e) => setSelectedClearanceFilter(e.target.value)}
                    className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">كافة التصاريح الأمنية</option>
                    <option value="سري للغاية">سري للغاية</option>
                    <option value="سري ومحدود">سري ومحدود</option>
                    <option value="سري">سري</option>
                    <option value="محدود">محدود</option>
                    <option value="عام">عام</option>
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">الحالة: الكل</option>
                    <option value="active">نشط</option>
                    <option value="suspended">موقوف</option>
                  </select>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>إضافة موظف جديد</span>
                  </button>
                </div>
              </div>

              {/* Users Grid */}
              {isLoadingUsers ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                  <p className="text-sm">جاري جلب سجلات الموظفين من قاعدة البيانات...</p>
                </div>
              ) : usersList.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 font-medium">لم يتم العثور على أي موظف يطابق معايير البحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usersList.map((user) => {
                    const isCurrentUser = currentUser?.id === user.id;
                    const isSuspended = user.status === "suspended";

                    return (
                      <div
                        key={user.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrentUser
                            ? "bg-amber-50/70 border-amber-300 shadow-md ring-1 ring-amber-400"
                            : isSuspended
                            ? "bg-rose-50/40 border-rose-200 opacity-80"
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                    أنت (الحساب الحالي)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600">{user.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{user.department}</p>
                            </div>
                          </div>

                          {/* Status and Clearance Badges */}
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                user.clearanceLevel === "سري للغاية"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : user.clearanceLevel === "سري"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : user.clearanceLevel === "محدود"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {user.clearanceLevel}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuspended
                                  ? "bg-rose-600 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {isSuspended ? "حساب موقوف" : "نشط"}
                            </span>
                          </div>
                        </div>

                        {/* Metadata Rows */}
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px]">الرقم الوطني:</span>
                            <span className="font-mono font-medium">{user.nationalId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">رقم الشارة السيادية:</span>
                            <span className="font-mono font-medium text-amber-700">{user.badgeNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">اسم المستخدم:</span>
                            <span className="font-mono text-slate-700">@{user.username}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">عدد الصلاحيات الممنوحة:</span>
                            <span className="font-semibold text-slate-800">
                              {user.role === "CHIEF_CUSTODIAN" ? "كاملة (24/24)" : `${user.permissions?.length || 0} صلاحية`}
                            </span>
                          </div>
                        </div>

                        {/* Fingerprint snippet */}
                        <div className="mt-2 text-[10px] font-mono text-slate-400 truncate" title={user.keyFingerprint}>
                          بصمة المفتاح: {user.keyFingerprint}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => quickSwitchUser(user.username)}
                              disabled={isCurrentUser || isSuspended}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                                isCurrentUser || isSuspended
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                              }`}
                              title="التبديل إلى هذا الحساب فوراً"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>تبديل الحساب</span>
                            </button>

                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="تعديل البيانات والرتبة"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setResetPwdUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="إعادة ضبط كلمة المرور"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={isCurrentUser}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                isCurrentUser
                                  ? "opacity-50 cursor-not-allowed border-slate-200 text-slate-400"
                                  : isSuspended
                                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  : "border-rose-300 text-rose-700 hover:bg-rose-50"
                              }`}
                              title={isSuspended ? "إعادة تفعيل الحساب" : "إيقاف الحساب مؤقتاً"}
                            >
                              {isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isCurrentUser}
                              className={`p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors ${
                                isCurrentUser ? "opacity-30 cursor-not-allowed" : ""
                              }`}
                              title="حذف الحساب نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROLES AND PERMISSIONS MATRIX */}
          {activeTab === "roles" && (
            <div className="space-y-6">
              {/* Role Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rolesList.map((r) => {
                  const isSelected = selectedRoleForEdit === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRoleForEdit(r.id);
                        setEditedRolePermissions(r.permissions || []);
                      }}
                      className={`p-4 rounded-xl border text-right transition-all ${
                        isSelected
                          ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-400/50"
                          : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{r.nameAr}</span>
                        {r.id === "CHIEF_CUSTODIAN" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            الكل
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{r.nameEn}</p>
                      <p className="text-[10px] text-amber-700 font-semibold mt-2">
                        {r.permissions?.length} صلاحيات مفعلة
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Role Permissions Detail & Matrix */}
              {selectedRoleForEdit && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        تعديل صلاحيات دور: {rolesList.find((r) => r.id === selectedRoleForEdit)?.nameAr}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rolesList.find((r) => r.id === selectedRoleForEdit)?.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRoleForEdit === "CHIEF_CUSTODIAN" ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-medium">
                          صلاحيات أمين الخزينة السيادية مطلقة ولا يمكن تقييدها
                        </span>
                      ) : (
                        <button
                          onClick={handleSaveRolePermissions}
                          disabled={isSavingRole}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
                        >
                          {isSavingRole ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>حفظ التعديلات في مصفوفة الصلاحيات</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions by Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {permissionCategories.map(([category, perms]) => (
                      <div key={category} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <h4 className="font-bold text-xs text-amber-900 mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                          <span>{category}</span>
                          <span className="text-[10px] text-slate-500">({perms.length} عمليات)</span>
                        </h4>

                        <div className="space-y-2.5">
                          {perms.map((p) => {
                            const isGranted =
                              selectedRoleForEdit === "CHIEF_CUSTODIAN" ||
                              editedRolePermissions.includes(p.id);

                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                  isGranted
                                    ? "bg-white border border-amber-200 shadow-2xs"
                                    : "bg-transparent opacity-60 hover:opacity-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  disabled={selectedRoleForEdit === "CHIEF_CUSTODIAN"}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditedRolePermissions([...editedRolePermissions, p.id]);
                                    } else {
                                      setEditedRolePermissions(
                                        editedRolePermissions.filter((id) => id !== p.id)
                                      );
                                    }
                                  }}
                                  className="mt-0.5 accent-amber-600 rounded"
                                />
                                <div className="text-xs">
                                  <div className="font-semibold text-slate-900">{p.nameAr}</div>
                                  <div className="text-[11px] text-slate-500 leading-relaxed">
                                    {p.description}
                                  </div>
                                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">{p.id}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ORGANIZATIONAL STRUCTURE MANAGEMENT (الهيكل التنظيمي للوزارة) */}
          {activeTab === "org" && (
            <div className="-m-6 flex-1 flex flex-col min-h-[680px]">
              <OrgStructureManagement
                onNotify={(msg, type) => showAlert(msg, type)}
                onRefreshStats={refreshDatabaseStats}
              />
            </div>
          )}

          {/* TAB 3: DUAL-ENGINE DATABASE SWITCHER & MONITOR */}
          {activeTab === "database" && (
            <div className="space-y-6">
              {/* Zero-Config Standalone Assurance Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                    <span>التشغيل المحلي الذاتي والمستقل (Zero-Config / Standalone Mode)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-800 border border-emerald-300">
                      لا يتطلب أي متغيرات بيئة (Zero Env Vars Required)
                    </span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    المنظومة تعمل بالكامل بشكل ذاتي ومحلي عبر محرك <strong>SQLite</strong> المدمج وملف التخزين السيادي المحمي. جميع الحسابات الأربعة المعتمدة، كلمات المرور المشفرة بـ <strong>Bcrypt</strong>، مصفوفة الصلاحيات (RBAC)، وجلسات العمل، وسجلات التدقيق الجنائي تعمل بنسبة 100% بدون الحاجة لضبط أي متغيرات بيئة، أو مفاتيح سرية، أو خوادم خارجية.
                  </p>
                </div>
              </div>

              {/* Engine Status Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Active Engine Card */}
                <div className="p-5 rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">محرك التخزين النشط حالياً</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-2xl font-black tracking-wider text-amber-400 mb-1">
                    {databaseStats?.currentEngine?.toUpperCase() || "SQLITE"}
                  </div>
                  <p className="text-xs text-slate-300">
                    {databaseStats?.currentEngine === "postgresql"
                      ? "قاعدة بيانات PostgreSQL عالية التوسع والأداء"
                      : "محرك SQLite خفيف وسريع بنمط WAL Mode مدمج بالنظام"}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
                    آخر تبديل: {new Date(databaseStats?.lastSwitchedAt || Date.now()).toLocaleTimeString("ar-LY")}
                  </div>
                </div>

                {/* Table Statistics Card */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-semibold">إحصائيات السجلات بالجداول</span>
                    <Server className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">المستخدمين:</span>
                      <span className="text-lg font-bold text-slate-900">
                        {databaseStats?.tableStats.usersCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">الأدوار:</span>
                      <span className="text-lg font-bold text-slate-900">
                        {databaseStats?.tableStats.rolesCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">الصلاحيات:</span>
                      <span className="text-lg font-bold text-slate-900">
                        {databaseStats?.tableStats.permissionsCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">سجلات التدقيق:</span>
                      <span className="text-lg font-bold text-slate-900">
                        {databaseStats?.tableStats.auditLogsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Database Path / Host */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-semibold">مسار التخزين / الاتصال</span>
                    <HardDrive className="w-4 h-4 text-blue-600" />
                  </div>
                  {databaseStats?.currentEngine === "sqlite" ? (
                    <div>
                      <span className="text-[10px] text-slate-400 block">ملف قاعدة البيانات المحلي:</span>
                      <span className="font-mono text-xs text-slate-800 break-all bg-slate-100 p-1.5 rounded block mt-1">
                        {databaseStats?.sqlitePath}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-slate-400 block">خادم PostgreSQL:</span>
                      <span className="font-mono text-xs text-slate-800 break-all bg-slate-100 p-1.5 rounded block mt-1">
                        {databaseStats?.postgresConfig.host}:{databaseStats?.postgresConfig.port} / {databaseStats?.postgresConfig.database}
                      </span>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">حالة الجلسات النشطة:</span>
                    <span className="font-bold text-emerald-600">
                      {databaseStats?.tableStats.sessionsCount || 0} جلسة
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Dual-Engine Switcher Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600" />
                      <span>التبديل بين المحركات (SQLite ⇄ PostgreSQL)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      النظام يدعم التحويل اللحظي مع الحفاظ على البيانات وتهيئة الجداول والمستخدمين تلقائياً.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSwitchEngine("sqlite")}
                      disabled={isSwitchingEngine || databaseStats?.currentEngine === "sqlite"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        databaseStats?.currentEngine === "sqlite"
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default"
                          : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                      }`}
                    >
                      {databaseStats?.currentEngine === "sqlite" ? "SQLite نشط حالياً" : "التبديل إلى SQLite"}
                    </button>

                    <button
                      onClick={() => handleSwitchEngine("postgresql")}
                      disabled={isSwitchingEngine || databaseStats?.currentEngine === "postgresql"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        databaseStats?.currentEngine === "postgresql"
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                      }`}
                    >
                      {databaseStats?.currentEngine === "postgresql" ? "PostgreSQL نشط حالياً" : "التبديل إلى PostgreSQL"}
                    </button>
                  </div>
                </div>

                {/* PostgreSQL Connection Settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>إعدادات الاتصال بخادم PostgreSQL المؤسسي</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        عنوان الخادم (Host):
                      </label>
                      <input
                        type="text"
                        value={pgHost}
                        onChange={(e) => setPgHost(e.target.value)}
                        placeholder="localhost أو ip"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        المنفذ (Port):
                      </label>
                      <input
                        type="number"
                        value={pgPort}
                        onChange={(e) => setPgPort(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        اسم قاعدة البيانات (Database):
                      </label>
                      <input
                        type="text"
                        value={pgDatabase}
                        onChange={(e) => setPgDatabase(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        اسم المستخدم (User):
                      </label>
                      <input
                        type="text"
                        value={pgUser}
                        onChange={(e) => setPgUser(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        كلمة المرور (Password):
                      </label>
                      <input
                        type="password"
                        value={pgPassword}
                        onChange={(e) => setPgPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pgSsl}
                          onChange={(e) => setPgSsl(e.target.checked)}
                          className="accent-blue-600 rounded"
                        />
                        <span>تشفير الاتصال (SSL / TLS)</span>
                      </label>
                    </div>
                  </div>

                  {/* Test Postgres Connection Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleTestPostgres}
                      disabled={isTestingPg}
                      className="px-4 py-2 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
                    >
                      {isTestingPg ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                      <span>اختبار الاتصال بـ PostgreSQL</span>
                    </button>

                    {pgTestResult && (
                      <span
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                          pgTestResult.success
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {pgTestResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>الاتصال ناجح! زمن الاستجابة: {pgTestResult.latencyMs}ms</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>فشل الاتصال: {pgTestResult.message}</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* PostgreSQL Migration Script Viewer and Exporter */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-amber-600" />
                        <span>سكربت الترحيل والتهيئة المعتمد لـ PostgreSQL (DDL & DML)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        مخطط قاعدة البيانات الكامل مع الجداول والفهارس والسجلات الأولية، جاهز للتنفيذ على أي خادم خارجي.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (sqlExportContent) {
                            navigator.clipboard.writeText(sqlExportContent);
                            setCopiedSql(true);
                            setTimeout(() => setCopiedSql(false), 2000);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? "تم النسخ!" : "نسخ السكربت"}</span>
                      </button>

                      <a
                        href="/api/database/export-sql"
                        download="libyan_mof_archive_postgres_schema.sql"
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل ملف .sql</span>
                      </a>
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-xl max-h-56 overflow-y-auto direction-ltr text-left">
                      {sqlExportContent || "جاري توليد سكربت الترحيل..."}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="فلترة السجل الأمني بالاسم أو نوع العملية..."
                    className="w-full pr-9 pl-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">إجمالي الحركات المرصودة: {auditLogs.length}</span>
                  <button
                    onClick={fetchAuditLogs}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                    title="تحديث"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-3 px-4">التاريخ والوقت</th>
                      <th className="py-3 px-4">المستخدم / الفاعل</th>
                      <th className="py-3 px-4">العملية الأمنية</th>
                      <th className="py-3 px-4">الهدف</th>
                      <th className="py-3 px-4">عنوان IP</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs
                      .filter((log) => {
                        if (!auditSearchQuery) return true;
                        const q = auditSearchQuery.toLowerCase();
                        return (
                          log.username.toLowerCase().includes(q) ||
                          log.action.toLowerCase().includes(q) ||
                          log.details.toLowerCase().includes(q)
                        );
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("ar-LY")}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            @{log.username}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-amber-900">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[10px] text-slate-600">
                            {log.targetType} {log.targetId ? `(${log.targetId})` : ""}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                            {log.ipAddress}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === "SUCCESS"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : log.status === "DENIED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate text-[11px]" title={log.details}>
                            {log.details}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>نظام الصلاحيات المؤسسي مفعل ومحصن بتشفير AES-256 و JWT و Bcrypt</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>

      </div>

      {/* MODAL 1: ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600" />
                <span>إضافة موظف جديد إلى منظومة الأرشيف الرقمي</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">الاسم الرباعي الرسمي للموظف *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  placeholder="مثال: أحمد عبد الله الفرجاني"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">الرقم الوطني الليبي (12 خانة) *</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{12}"
                    title="الرقم الوطني يتكون من 12 رقماً"
                    value={newUserForm.nationalId}
                    onChange={(e) => setNewUserForm({ ...newUserForm, nationalId: e.target.value })}
                    placeholder="119xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">رقم الشارة الوظيفية السيادية</label>
                  <input
                    type="text"
                    value={newUserForm.badgeNumber}
                    onChange={(e) => setNewUserForm({ ...newUserForm, badgeNumber: e.target.value })}
                    placeholder="LY-MOF-ARC-XXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    placeholder="ahmed.ferjani"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">البريد المؤسسي الرسمي *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="a.ferjani@mof.gov.ly"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">كلمة المرور الأولية للحساب *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">الدور الوظيفي (Role) *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as VaultRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="RESEARCHER">باحث مالي معتمد</option>
                    <option value="SENIOR_ARCHIVIST">كبير أخصائيي الأرشفة</option>
                    <option value="AUDIT_INSPECTOR">مراقب ديوان المحاسبة</option>
                    <option value="CHIEF_CUSTODIAN">أمين الخزينة السيادية (مسؤول كامل)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">مستوى التصريح الأمني *</label>
                  <select
                    value={newUserForm.clearanceLevel}
                    onChange={(e) => setNewUserForm({ ...newUserForm, clearanceLevel: e.target.value as SecurityClassification })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="عام">عام (سجلات متاحة للجمهور)</option>
                    <option value="محدود">محدود (تداول داخلي بالوزارة)</option>
                    <option value="سري">سري (وثائق الميزانية والمصالح)</option>
                    <option value="سري ومحدود">سري ومحدود (أرصدة وقيود حساسة)</option>
                    <option value="سري للغاية">سري للغاية (معاهدات واحتياطيات سيادية)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">الإدارة / الجهة التابع لها</label>
                  <input
                    type="text"
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={newUserForm.title}
                    onChange={(e) => setNewUserForm({ ...newUserForm, title: e.target.value })}
                    placeholder="أخصائي وثائق مالية"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>حفظ وإصدار البصمة التشفيرية</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                <span>تعديل بيانات ورتبة: {editingUser.name}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">الدور الوظيفي</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as VaultRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="RESEARCHER">باحث مالي معتمد</option>
                    <option value="SENIOR_ARCHIVIST">كبير أخصائيي الأرشفة</option>
                    <option value="AUDIT_INSPECTOR">مراقب ديوان المحاسبة</option>
                    <option value="CHIEF_CUSTODIAN">أمين الخزينة السيادية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">التصريح الأمني</label>
                  <select
                    value={editingUser.clearanceLevel}
                    onChange={(e) => setEditingUser({ ...editingUser, clearanceLevel: e.target.value as SecurityClassification })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="عام">عام</option>
                    <option value="محدود">محدود</option>
                    <option value="سري">سري</option>
                    <option value="سري ومحدود">سري ومحدود</option>
                    <option value="سري للغاية">سري للغاية</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={editingUser.title}
                  onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">الإدارة / القسم</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD MODAL */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>إعادة ضبط كلمة المرور</span>
              </h3>
              <button onClick={() => setResetPwdUser(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              سيتم تعيين كلمة مرور جديدة للموظف: <strong className="text-slate-900">{resetPwdUser.name}</strong> وإلغاء أي جلسات سابقة.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="أدخل 6 خانات على الأقل..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPwdUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                >
                  تأكيد التعيين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
