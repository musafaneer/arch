import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  GitBranch,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Printer,
  Users,
  FileText,
  ChevronRight,
  ChevronDown,
  Shield,
  Phone,
  Mail,
  MapPin,
  Layers,
  Eye,
  ArrowRightLeft,
  Check,
  Briefcase,
  ExternalLink,
  Award
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { OrgUnit, OrgUnitType, SecurityClassification } from "../types";

interface OrgStructureManagementProps {
  onNotify?: (msg: string, type?: "success" | "error") => void;
  onRefreshStats?: () => Promise<void>;
}

export const OrgStructureManagement: React.FC<OrgStructureManagementProps> = ({
  onNotify,
  onRefreshStats
}) => {
  const { currentUser, token, hasPermission } = useAuth();

  // Can the current user manage org units?
  const canManageOrg = hasPermission("org:manage" as any) || currentUser?.role === "CHIEF_CUSTODIAN";

  // Data states
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [treeUnits, setTreeUnits] = useState<OrgUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "grid" | "table">("tree");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Selection / Inspector Drawer
  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null);
  const [reassignModalUnit, setReassignModalUnit] = useState<OrgUnit | null>(null);
  const [targetReassignDept, setTargetReassignDept] = useState<string>("");
  const [deleteConfirmUnit, setDeleteConfirmUnit] = useState<OrgUnit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Tree expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "org-diwan": true,
    "org-treasury": true,
    "org-customs": true
  });

  // Form state for creating a new unit
  const [unitForm, setUnitForm] = useState({
    code: "",
    name: "",
    type: "department" as OrgUnitType,
    parentId: "" as string,
    managerName: "",
    managerTitle: "",
    email: "",
    phone: "",
    location: "مبنى ديوان وزارة المالية - طرابلس",
    description: "",
    classificationLevel: "سري" as SecurityClassification,
    status: "active" as "active" | "inactive",
    orderIndex: 10
  });

  // Fetch all Org Units and Tree
  const fetchOrgData = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [resUnits, resTree] = await Promise.all([
        fetch("/api/org-units", { headers }),
        fetch("/api/org-units/tree", { headers })
      ]);

      const dataUnits = await resUnits.json();
      const dataTree = await resTree.json();

      if (dataUnits.success && Array.isArray(dataUnits.units)) {
        setOrgUnits(dataUnits.units);
      }
      if (dataTree.success && Array.isArray(dataTree.tree)) {
        setTreeUnits(dataTree.tree);
      }
    } catch (err: any) {
      if (onNotify) onNotify(err.message || "فشل تحميل بيانات الهيكل التنظيمي", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  // Filtered Org Units for Grid / Table
  const filteredUnits = useMemo(() => {
    return orgUnits.filter((unit) => {
      const matchesSearch =
        searchQuery === "" ||
        unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.managerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedTypeFilter === "ALL" || unit.type === selectedTypeFilter;
      const matchesStatus = selectedStatusFilter === "ALL" || unit.status === selectedStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [orgUnits, searchQuery, selectedTypeFilter, selectedStatusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = orgUnits.length;
    const authorities = orgUnits.filter((u) => u.type === "authority" || u.type === "general_directorate").length;
    const officesAndSections = orgUnits.filter((u) => u.type === "office" || u.type === "section" || u.type === "unit").length;
    const totalUsers = orgUnits.reduce((acc, u) => acc + (u.usersCount || 0), 0);
    const totalDocs = orgUnits.reduce((acc, u) => acc + (u.documentsCount || 0), 0);
    const activeUnits = orgUnits.filter((u) => u.status === "active").length;

    return { total, authorities, officesAndSections, totalUsers, totalDocs, activeUnits };
  }, [orgUnits]);

  // Type labels in Arabic
  const typeLabels: Record<OrgUnitType, { label: string; badgeColor: string }> = {
    ministry_hq: { label: "ديوان الوزارة", badgeColor: "bg-amber-100 text-amber-900 border-amber-300" },
    authority: { label: "مصلحة سيادية", badgeColor: "bg-purple-100 text-purple-900 border-purple-300" },
    general_directorate: { label: "إدارة عامة", badgeColor: "bg-blue-100 text-blue-900 border-blue-300" },
    department: { label: "إدارة / مركز", badgeColor: "bg-teal-100 text-teal-900 border-teal-300" },
    office: { label: "مكتب تخصصي", badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300" },
    section: { label: "قسم تنفيذي", badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    unit: { label: "وحدة إدارية", badgeColor: "bg-slate-100 text-slate-800 border-slate-300" }
  };

  // Toggle tree node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Handle Create Unit Submit
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/org-units", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...unitForm,
          parentId: unitForm.parentId ? unitForm.parentId : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر إنشاء الوحدة التنظيمية");
      }

      if (onNotify) onNotify(`تم إضافة الوحدة [${unitForm.name}] بنجاح إلى الهيكل التنظيمي`, "success");
      setShowAddModal(false);
      // Reset form
      setUnitForm({
        code: "",
        name: "",
        type: "department",
        parentId: "org-diwan",
        managerName: "",
        managerTitle: "",
        email: "",
        phone: "",
        location: "مبنى ديوان وزارة المالية - طرابلس",
        description: "",
        classificationLevel: "سري",
        status: "active",
        orderIndex: 10
      });
      await fetchOrgData();
      if (onRefreshStats) await onRefreshStats();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Unit Submit
  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/org-units/${editingUnit.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          code: editingUnit.code,
          name: editingUnit.name,
          type: editingUnit.type,
          parentId: editingUnit.parentId || null,
          managerName: editingUnit.managerName,
          managerTitle: editingUnit.managerTitle,
          email: editingUnit.email,
          phone: editingUnit.phone,
          location: editingUnit.location,
          description: editingUnit.description,
          classificationLevel: editingUnit.classificationLevel,
          status: editingUnit.status,
          orderIndex: editingUnit.orderIndex
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر تحديث بيانات الوحدة التنظيمية");
      }

      if (onNotify) onNotify(`تم تحديث بيانات [${editingUnit.name}] بنجاح`, "success");
      setEditingUnit(null);
      await fetchOrgData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Unit Status
  const handleToggleStatus = async (unit: OrgUnit) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/org-units/${unit.id}/toggle-status`, {
        method: "POST",
        headers
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر تغيير حالة الوحدة");
      }

      const nextStatusText = data.unit.status === "active" ? "تفعيل" : "تجميد";
      if (onNotify) onNotify(`تم ${nextStatusText} [${unit.name}] بنجاح`, "success");
      await fetchOrgData();
      if (selectedUnit?.id === unit.id) {
        setSelectedUnit(data.unit);
      }
    } catch (err: any) {
      if (onNotify) onNotify(err.message, "error");
    }
  };

  // Handle Delete Unit
  const handleDeleteUnit = async (unit: OrgUnit) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/org-units/${unit.id}`, {
        method: "DELETE",
        headers
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر حذف الوحدة التنظيمية");
      }

      if (onNotify) onNotify(data.message || `تم حذف [${unit.name}] بنجاح`, "success");
      setDeleteConfirmUnit(null);
      if (selectedUnit?.id === unit.id) setSelectedUnit(null);
      await fetchOrgData();
      if (onRefreshStats) await onRefreshStats();
    } catch (err: any) {
      if (onNotify) onNotify(err.message, "error");
    }
  };

  // Handle Reassign Users Submit
  const handleReassignUsers = async () => {
    if (!reassignModalUnit || !targetReassignDept) return;
    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/org-units/reassign-users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromDeptName: reassignModalUnit.name,
          toDeptName: targetReassignDept
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر نقل الموظفين");
      }

      if (onNotify) {
        onNotify(
          `تم بنجاح نقل وتسكين (${data.affectedCount}) موظف من [${reassignModalUnit.name}] إلى [${targetReassignDept}]`,
          "success"
        );
      }
      setReassignModalUnit(null);
      setTargetReassignDept("");
      await fetchOrgData();
    } catch (err: any) {
      if (onNotify) onNotify(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print Official Organizational Chart
  const handlePrintOrgChart = () => {
    window.print();
  };

  // Recursive Tree Node Component
  const renderTreeNode = (unit: OrgUnit, depth: number = 0) => {
    const hasChildren = unit.children && unit.children.length > 0;
    const isExpanded = !!expandedNodes[unit.id];
    const isSelected = selectedUnit?.id === unit.id;
    const typeInfo = typeLabels[unit.type] || { label: unit.type, badgeColor: "bg-slate-100 text-slate-800" };

    return (
      <div key={unit.id} className="relative flex flex-col my-1">
        {/* Connection line for child items */}
        {depth > 0 && (
          <div
            className="absolute -right-5 top-5 w-5 h-0.5 bg-slate-300"
            style={{ width: "20px" }}
          />
        )}

        {/* Node Card */}
        <div
          onClick={() => setSelectedUnit(unit)}
          className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? "bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-400/20"
              : unit.status === "inactive"
              ? "bg-slate-100/60 border-slate-300 opacity-60 hover:opacity-100"
              : depth === 0
              ? "bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-white border-amber-400 shadow-sm"
              : depth === 1
              ? "bg-white border-slate-300 hover:border-amber-400 shadow-sm"
              : "bg-white/80 border-slate-200 hover:border-slate-300"
          }`}
          style={{ marginRight: `${depth * 28}px` }}
        >
          <div className="flex items-center gap-3">
            {/* Expand / Collapse Button */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(unit.id);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 border border-slate-200 flex items-center justify-center transition-colors"
                title={isExpanded ? "طي الفروع" : "توسيع الفروع"}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              </div>
            )}

            {/* Icon representation */}
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                depth === 0
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : unit.type === "authority"
                  ? "bg-purple-600 text-white border-purple-700"
                  : unit.type === "general_directorate"
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-slate-700 text-white border-slate-800"
              }`}
            >
              {depth === 0 ? (
                <Award className="w-5 h-5" />
              ) : unit.type === "authority" ? (
                <Shield className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>

            {/* Unit Basic Details */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                  {unit.name}
                </h4>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {unit.code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeInfo.badgeColor}`}>
                  {typeInfo.label}
                </span>
                {unit.status === "inactive" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
                    معطلة
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-700 font-medium">{unit.managerName}</span>
                  <span className="text-slate-400">({unit.managerTitle})</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-[180px]">{unit.location}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Metrics & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Users badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold"
              title="عدد الموظفين المسكنين بهذه الوحدة"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>{unit.usersCount || 0} موظف</span>
            </div>

            {/* Docs count badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
              title="عدد الوثائق التاريخية والسيادية المسجلة"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>{unit.documentsCount || 0} وثيقة</span>
            </div>

            {/* Admin Actions Dropdown / Quick Buttons */}
            {canManageOrg && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUnit(unit);
                    setFormError(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  title="تعديل بيانات الإدارة"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(unit)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    unit.status === "active"
                      ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                  }`}
                  title={unit.status === "active" ? "تجميد الوحدة التنظيمية" : "إعادة تفعيل الوحدة"}
                >
                  {unit.status === "active" ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUnitForm({
                      code: `${unit.code}-SUB`,
                      name: "",
                      type: unit.type === "authority" ? "department" : "section",
                      parentId: unit.id,
                      managerName: "",
                      managerTitle: "رئيس الوحدة",
                      email: "",
                      phone: "",
                      location: unit.location,
                      description: `وحدة تابعة لـ ${unit.name}`,
                      classificationLevel: unit.classificationLevel,
                      status: "active",
                      orderIndex: (unit.children?.length || 0) + 1
                    });
                    setShowAddModal(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  title="إضافة قسم أو إدارة تابعة"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmUnit(unit)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  title="حذف من الهيكل"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children Render with indentation */}
        {hasChildren && isExpanded && (
          <div className="relative pr-6 mr-3 border-r-2 border-slate-200 mt-1 space-y-1">
            {unit.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      {/* 1. Header Toolbar & Quick Stats */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                الهيكل التنظيمي المعتمد لوزارة المالية
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                إدارة مدير النظام (System Admin)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إدارة شجرة المصالح السيادية، الإدارات العامة، المكاتب التخصصية، ومطابقة تسكين الموظفين والوثائق الرقمية
            </p>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrgData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-600" : ""}`} />
              <span>تحديث</span>
            </button>

            <button
              onClick={handlePrintOrgChart}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              title="طباعة الهيكل التنظيمي المعتمد"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المخطط المعتمد</span>
            </button>

            {canManageOrg && (
              <button
                onClick={() => {
                  setUnitForm({
                    code: "",
                    name: "",
                    type: "department",
                    parentId: "org-diwan",
                    managerName: "",
                    managerTitle: "مدير الإدارة",
                    email: "",
                    phone: "",
                    location: "مبنى ديوان وزارة المالية - طرابلس",
                    description: "",
                    classificationLevel: "سري",
                    status: "active",
                    orderIndex: orgUnits.length + 1
                  });
                  setFormError(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وحدة تنظيمية جديدة</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">إجمالي الوحدات التنظيمية</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">المصالح والإدارات العامة</p>
              <p className="text-xl font-bold text-purple-900 mt-0.5">{stats.authorities}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">المكاتب والأقسام الفنية</p>
              <p className="text-xl font-bold text-blue-900 mt-0.5">{stats.officesAndSections}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">الموظفين المربوطين بالهيكل</p>
              <p className="text-xl font-bold text-emerald-900 mt-0.5">{stats.totalUsers}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <p className="text-[11px] font-medium text-slate-500">الوثائق المؤرشفة التابعة</p>
              <p className="text-xl font-bold text-amber-900 mt-0.5">{stats.totalDocs}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & View Switcher Bar */}
      <div className="px-6 py-3 bg-white/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الرمز الكودي، المسؤول..."
            className="w-full pr-9 pl-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Type filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">جميع المستويات التنظيمية</option>
            <option value="ministry_hq">ديوان الوزارة</option>
            <option value="authority">المصالح السيادية</option>
            <option value="general_directorate">الإدارات العامة</option>
            <option value="department">الإدارات والمراكز</option>
            <option value="office">المكاتب التخصصية</option>
            <option value="section">الأقسام والوحدات</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="active">نشطة فقط</option>
            <option value="inactive">معطلة</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "tree"
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>الشجرة الهرمية</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>جدول تفصيلي</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Area (Tree/Grid/Table + Inspector Drawer) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Primary View */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && orgUnits.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-sm">جاري تحميل وتكوين شجرة الهيكل التنظيمي لوزارة المالية...</p>
            </div>
          ) : viewMode === "tree" ? (
            /* --- TREE VIEW --- */
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/80 mb-4 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>
                    يعكس هذا المخطط الهرمي التسلسل الإداري السيادي المعتمد من قبل وزير المالية. انقر على أي إدارة لاستعراض بياناتها التخصصية وتسكين الكوادر.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allIds: Record<string, boolean> = {};
                      orgUnits.forEach((u) => (allIds[u.id] = true));
                      setExpandedNodes(allIds);
                    }}
                    className="text-xs text-amber-700 hover:underline font-semibold"
                  >
                    توسيع الكل
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setExpandedNodes({})}
                    className="text-xs text-amber-700 hover:underline font-semibold"
                  >
                    طي الكل
                  </button>
                </div>
              </div>

              {treeUnits.map((root) => renderTreeNode(root, 0))}
            </div>
          ) : viewMode === "grid" ? (
            /* --- GRID VIEW --- */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnits.map((unit) => {
                const typeInfo = typeLabels[unit.type] || { label: unit.type, badgeColor: "bg-slate-100 text-slate-800" };
                const isSelected = selectedUnit?.id === unit.id;

                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-amber-50/70 border-amber-500 shadow-md ring-2 ring-amber-400/20"
                        : "bg-white border-slate-200 hover:border-amber-400 shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeInfo.badgeColor}`}>
                          {typeInfo.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {unit.code}
                          </span>
                          {unit.status === "inactive" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                              معطلة
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Parent */}
                      <h3 className="font-bold text-base text-slate-900 leading-snug">
                        {unit.name}
                      </h3>
                      {unit.parentName && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-slate-400" />
                          <span>التبعية: {unit.parentName}</span>
                        </p>
                      )}

                      {/* Description */}
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {unit.description}
                      </p>

                      {/* Manager Profile */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {unit.managerName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{unit.managerName}</p>
                          <p className="text-[11px] text-slate-500">{unit.managerTitle}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Stats & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-blue-700 font-semibold">
                          <Users className="w-3.5 h-3.5" />
                          {unit.usersCount || 0} موظف
                        </span>
                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                          <FileText className="w-3.5 h-3.5" />
                          {unit.documentsCount || 0} وثيقة
                        </span>
                      </div>

                      {canManageOrg && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnit(unit);
                              setFormError(null);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUnit(unit)}
                            className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* --- TABLE VIEW --- */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="px-4 py-3">الرمز</th>
                    <th className="px-4 py-3">اسم الوحدة التنظيمية</th>
                    <th className="px-4 py-3">المستوى</th>
                    <th className="px-4 py-3">التبعية الإدارية</th>
                    <th className="px-4 py-3">المسؤول الحالي</th>
                    <th className="px-4 py-3">التصنيف</th>
                    <th className="px-4 py-3">الكوادر</th>
                    <th className="px-4 py-3">الوثائق</th>
                    <th className="px-4 py-3">الحالة</th>
                    {canManageOrg && <th className="px-4 py-3 text-center">إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnits.map((unit) => {
                    const typeInfo = typeLabels[unit.type] || { label: unit.type, badgeColor: "bg-slate-100 text-slate-800" };
                    const isSelected = selectedUnit?.id === unit.id;

                    return (
                      <tr
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-amber-50/70" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {unit.code}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {unit.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeInfo.badgeColor}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {unit.parentName || "— ديوان الوزارة —"}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium">
                          {unit.managerName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {unit.classificationLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700">
                          {unit.usersCount || 0}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-700">
                          {unit.documentsCount || 0}
                        </td>
                        <td className="px-4 py-3">
                          {unit.status === "active" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              نشط
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                              معطل
                            </span>
                          )}
                        </td>
                        {canManageOrg && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUnit(unit);
                                  setFormError(null);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(unit)}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                title="تغيير الحالة"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmUnit(unit)}
                                className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Inspector Drawer (Sidebar when unit clicked) */}
        {selectedUnit && (
          <div className="w-96 border-r border-slate-200 bg-white p-6 overflow-y-auto flex flex-col justify-between shadow-lg">
            <div>
              {/* Drawer Top */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedUnit.code}
                  </span>
                  <h3 className="font-bold text-lg text-slate-900 mt-2 leading-snug">
                    {selectedUnit.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {typeLabels[selectedUnit.type]?.label || selectedUnit.type}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUnit(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  title="إغلاق اللوحة الجانبية"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Classification */}
              <div className="flex items-center gap-2 mt-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    selectedUnit.status === "active"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  الحالة: {selectedUnit.status === "active" ? "نشطة ومعتمدة" : "مجمدة / معطلة"}
                </span>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-600" />
                  <span>التصريح: {selectedUnit.classificationLevel}</span>
                </span>
              </div>

              {/* Description */}
              <div className="mt-5">
                <h5 className="text-xs font-bold text-slate-500 mb-1">المهام والاختصاصات القانونية</h5>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/70 leading-relaxed">
                  {selectedUnit.description}
                </p>
              </div>

              {/* Responsible Manager Card */}
              <div className="mt-5">
                <h5 className="text-xs font-bold text-slate-500 mb-2">القيادة الإدارية والمسؤولية</h5>
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold text-sm">
                      {selectedUnit.managerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{selectedUnit.managerName}</p>
                      <p className="text-[11px] text-slate-500">{selectedUnit.managerTitle}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {selectedUnit.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px] text-slate-700">{selectedUnit.email}</span>
                      </div>
                    )}
                    {selectedUnit.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px] text-slate-700" dir="ltr">{selectedUnit.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedUnit.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Capacity Stats */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <p className="text-[11px] font-medium text-blue-700">الكوادر المسكنة</p>
                  <p className="text-lg font-bold text-blue-900 mt-0.5">{selectedUnit.usersCount || 0}</p>
                  <p className="text-[10px] text-blue-600 mt-1">موظف معتمد بالنظام</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <p className="text-[11px] font-medium text-amber-700">المحفوظات المؤرشفة</p>
                  <p className="text-lg font-bold text-amber-900 mt-0.5">{selectedUnit.documentsCount || 0}</p>
                  <p className="text-[10px] text-amber-600 mt-1">وثيقة تاريخية ورسمية</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions for Selected Unit */}
            {canManageOrg && (
              <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUnit(selectedUnit);
                    setFormError(null);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل بيانات هذه الإدارة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReassignModalUnit(selectedUnit);
                    setTargetReassignDept("");
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  <span>نقل وتسكين كوادر الإدارة</span>
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(selectedUnit)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                  >
                    {selectedUnit.status === "active" ? "تجميد الوحدة" : "إعادة التفعيل"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmUnit(selectedUnit)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-medium transition-colors"
                  >
                    حذف الإدارة
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Add New Org Unit Modal */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-amber-950 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">إضافة وحدة تنظيمية جديدة للهيكل السيادي</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرمز الكودي التنظيمي (مثل: MOF-REV) *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.code}
                    onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })}
                    placeholder="MOF-XXX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الوحدة التنظيمية الرسمي *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    placeholder="مثال: إدارة الإيرادات العامة والرسوم السيادية"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Unit Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المستوى والنوع التنظيمي *
                  </label>
                  <select
                    value={unitForm.type}
                    onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value as OrgUnitType })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="authority">مصلحة سيادية (Authority)</option>
                    <option value="general_directorate">إدارة عامة (General Directorate)</option>
                    <option value="department">إدارة أو مركز (Department)</option>
                    <option value="office">مكتب تخصصي (Specialized Office)</option>
                    <option value="section">قسم تنفيذي (Section)</option>
                    <option value="unit">وحدة إدارية (Unit)</option>
                  </select>
                </div>

                {/* Parent Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التبعية الإدارية المباشرة (الإدارة الأب)
                  </label>
                  <select
                    value={unitForm.parentId || ""}
                    onChange={(e) => setUnitForm({ ...unitForm, parentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="">ديوان الوزارة (قمة الهيكل)</option>
                    {orgUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Manager Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المدير / المسؤول المكلف *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.managerName}
                    onChange={(e) => setUnitForm({ ...unitForm, managerName: e.target.value })}
                    placeholder="مثال: أ. عبد السلام سالم الورفلي"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Manager Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المسمى الوظيفي للمسؤول *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.managerTitle}
                    onChange={(e) => setUnitForm({ ...unitForm, managerTitle: e.target.value })}
                    placeholder="مثال: مدير عام إدارة الإيرادات"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني الرسمي
                  </label>
                  <input
                    type="email"
                    value={unitForm.email}
                    onChange={(e) => setUnitForm({ ...unitForm, email: e.target.value })}
                    placeholder="dept@mof.gov.ly"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الهاتف الداخلي / المباشر
                  </label>
                  <input
                    type="text"
                    value={unitForm.phone}
                    onChange={(e) => setUnitForm({ ...unitForm, phone: e.target.value })}
                    placeholder="+218 21 333 XXXX"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Location */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المقر الجغرافي والمبنى *
                  </label>
                  <input
                    type="text"
                    required
                    value={unitForm.location}
                    onChange={(e) => setUnitForm({ ...unitForm, location: e.target.value })}
                    placeholder="مثال: مبنى ديوان وزارة المالية - الطابق الرابع - طريق الشط، طرابلس"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Security Classification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصريح الأمني الافتراضي لوثائق الإدارة *
                  </label>
                  <select
                    value={unitForm.classificationLevel}
                    onChange={(e) => setUnitForm({ ...unitForm, classificationLevel: e.target.value as SecurityClassification })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="سري للغاية">سري للغاية (Top Secret)</option>
                    <option value="سري">سري (Secret)</option>
                    <option value="سري ومحدود">سري ومحدود (Confidential)</option>
                    <option value="محدود">محدود (Restricted)</option>
                    <option value="عام">عام (Public)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة الوحدة
                  </label>
                  <select
                    value={unitForm.status}
                    onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="active">نشطة ومفعلة</option>
                    <option value="inactive">مجمدة / تحت التأسيس</option>
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المهام والاختصاصات القانونية
                  </label>
                  <textarea
                    rows={3}
                    value={unitForm.description}
                    onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                    placeholder="بيان بالاختصاصات والمهام الموكلة لهذه الوحدة وفق اللائحة التنظيمية لوزارة المالية..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Submit footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>اعتماد وإضافة الوحدة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Edit Org Unit Modal */}
      {/* ========================================================================= */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-amber-950 text-white">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">تعديل بيانات الوحدة: {editingUnit.name}</h3>
              </div>
              <button
                onClick={() => setEditingUnit(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرمز الكودي التنظيمي *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.code}
                    onChange={(e) => setEditingUnit({ ...editingUnit, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الوحدة التنظيمية *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.name}
                    onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المستوى والنوع التنظيمي *
                  </label>
                  <select
                    value={editingUnit.type}
                    onChange={(e) => setEditingUnit({ ...editingUnit, type: e.target.value as OrgUnitType })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="ministry_hq">ديوان الوزارة</option>
                    <option value="authority">مصلحة سيادية</option>
                    <option value="general_directorate">إدارة عامة</option>
                    <option value="department">إدارة أو مركز</option>
                    <option value="office">مكتب تخصصي</option>
                    <option value="section">قسم تنفيذي</option>
                    <option value="unit">وحدة إدارية</option>
                  </select>
                </div>

                {/* Parent */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التبعية الإدارية
                  </label>
                  <select
                    value={editingUnit.parentId || ""}
                    onChange={(e) => setEditingUnit({ ...editingUnit, parentId: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="">ديوان الوزارة (قمة الهيكل)</option>
                    {orgUnits
                      .filter((u) => u.id !== editingUnit.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Manager Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المدير / المسؤول *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.managerName}
                    onChange={(e) => setEditingUnit({ ...editingUnit, managerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Manager Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المسمى الوظيفي للمسؤول *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.managerTitle}
                    onChange={(e) => setEditingUnit({ ...editingUnit, managerTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الرسمي
                  </label>
                  <input
                    type="email"
                    value={editingUnit.email || ""}
                    onChange={(e) => setEditingUnit({ ...editingUnit, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الهاتف
                  </label>
                  <input
                    type="text"
                    value={editingUnit.phone || ""}
                    onChange={(e) => setEditingUnit({ ...editingUnit, phone: e.target.value })}
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Location */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المقر والمبنى *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.location}
                    onChange={(e) => setEditingUnit({ ...editingUnit, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصريح الأمني الافتراضي
                  </label>
                  <select
                    value={editingUnit.classificationLevel}
                    onChange={(e) => setEditingUnit({ ...editingUnit, classificationLevel: e.target.value as SecurityClassification })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="سري للغاية">سري للغاية</option>
                    <option value="سري">سري</option>
                    <option value="سري ومحدود">سري ومحدود</option>
                    <option value="محدود">محدود</option>
                    <option value="عام">عام</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحالة
                  </label>
                  <select
                    value={editingUnit.status}
                    onChange={(e) => setEditingUnit({ ...editingUnit, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="active">نشطة ومفعلة</option>
                    <option value="inactive">مجمدة / معطلة</option>
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المهام والاختصاصات
                  </label>
                  <textarea
                    rows={3}
                    value={editingUnit.description}
                    onChange={(e) => setEditingUnit({ ...editingUnit, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Submit footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Reassign Employees Modal */}
      {/* ========================================================================= */}
      {reassignModalUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">نقل وتسكين كوادر الإدارة</h3>
              </div>
              <button
                onClick={() => setReassignModalUnit(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
                <p className="font-bold">الإدارة المصدر: {reassignModalUnit.name}</p>
                <p>عدد الموظفين المسجلين حالياً: {reassignModalUnit.usersCount || 0} موظف</p>
                <p className="text-slate-600 mt-1">
                  سيتم تحديث سجلات جميع الموظفين التابعين لهذه الإدارة تلقائياً وربطهم بالإدارة الجديدة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اختر الإدارة البديلة المستهدفة للنقل *
                </label>
                <select
                  value={targetReassignDept}
                  onChange={(e) => setTargetReassignDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- اختر الإدارة المستهدفة --</option>
                  {orgUnits
                    .filter((u) => u.name !== reassignModalUnit.name)
                    .map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReassignModalUnit(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!targetReassignDept || isSubmitting}
                  onClick={handleReassignUsers}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>تأكيد النقل والتسكين</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Delete Confirmation */}
      {/* ========================================================================= */}
      {deleteConfirmUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">تأكيد حذف وحدة تنظيمية</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmUnit(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-800">
                هل أنت متأكد من رغبتك في حذف الوحدة التنظيمية:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">{deleteConfirmUnit.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{deleteConfirmUnit.code}</p>
              </div>

              {(deleteConfirmUnit.usersCount || 0) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  ⚠️ <strong>تنبيه:</strong> هذه الإدارة مسجل بها ({deleteConfirmUnit.usersCount}) موظف. يجب نقل الكوادر لإدارة بديلة قبل الحذف.
                </div>
              )}

              <p className="text-xs text-slate-500 leading-relaxed">
                سيتم توثيق عملية الحذف في سجل التدقيق الرقابي والأمني فور تأكيد الإجراء.
              </p>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUnit(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUnit(deleteConfirmUnit)}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all"
                >
                  نعم، حذف نهائي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
