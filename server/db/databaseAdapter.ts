import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import bcrypt from "bcryptjs";
import { AppPermission, RoleDefinition, SecurityClassification, VaultRole } from "../../src/types";

const { Pool } = pg;

export type DatabaseEngineType = "sqlite" | "postgresql";

export interface PostgresConnectionConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export interface DatabaseStats {
  engine: DatabaseEngineType;
  status: "connected" | "disconnected" | "error";
  sqlitePath: string;
  postgresConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    ssl: boolean;
  };
  tableStats: {
    usersCount: number;
    rolesCount: number;
    permissionsCount: number;
    auditLogsCount: number;
    sessionsCount: number;
    orgUnitsCount?: number;
  };
  lastSwitchedAt?: string;
  errorMessage?: string;
}

// Master Permissions List for Libyan Ministry of Finance Digital Archive
export const SYSTEM_PERMISSIONS: AppPermission[] = [
  // الوثائق والأرشفة
  { id: "documents:read", category: "الوثائق والأرشيف", nameAr: "اطلاع وقراءة الوثائق", description: "استعراض والبحث في فهرس السجلات والوثائق المتاحة وفق التصريح الأمني" },
  { id: "documents:create", category: "الوثائق والأرشيف", nameAr: "إيداع وثيقة جديدة", description: "أرشفة وإدخال وثائق مالية جديدة وإصدار القيود الدفترية" },
  { id: "documents:edit", category: "الوثائق والأرشيف", nameAr: "تعديل البيانات الوصفية", description: "تحديث الأرقام الإشارية والتواريخ والبيانات الوصفية للوثيقة" },
  { id: "documents:delete", category: "الوثائق والأرشيف", nameAr: "حذف وثيقة من الفهرس", description: "إزالة السجلات غير المعتمدة أو الخاطئة بموافقة ديوان المحاسبة" },
  { id: "documents:export_certified", category: "الوثائق والأرشيف", nameAr: "تصدير وثيقة رسمية معتمدة PDF", description: "توليد وتصدير نسخ PDF مختومة ومعتمدة بالباركود والختم السيادي" },
  { id: "documents:print_secure", category: "الوثائق والأرشيف", nameAr: "طباعة مؤمنة بعلامة مائية", description: "طباعة المستندات مع طباعة العلامة المائية المشفرة وهوية الموظف" },

  // الخزينة السيادية
  { id: "vault:access", category: "الخزينة السيادية", nameAr: "دخول الخزينة الرقمية المشفرة", description: "استعراض مستودع الوثائق المحصنة وسجلات التحقق التشفيري" },
  { id: "vault:lock_worm", category: "الخزينة السيادية", nameAr: "تحصين الوثائق WORM (غير قابلة للتعديل)", description: "قفل السجلات السيادية بشكل نهائي غير قابل للإلغاء لمنع العبث" },
  { id: "vault:verify_integrity", category: "الخزينة السيادية", nameAr: "فحص البصمات والمطابقة الرقمية", description: "التحقق اللحظي من شجرة ميركل (Merkle Tree) وبصمة SHA-256" },
  { id: "vault:manage_keys", category: "الخزينة السيادية", nameAr: "إدارة المفاتيح والأختام السيادية", description: "تجديد وتدوير شهادات التشفير والأختام الرقمية للوزارة" },

  // الفهرسة والـ OCR
  { id: "ocr:scan", category: "الفهرسة والـ OCR", nameAr: "تشغيل الماسح الضوئي", description: "التقاط الوثائق الورقية ومعالجتها بفلاتر الترميم الرقمي" },
  { id: "ocr:verify", category: "الفهرسة والـ OCR", nameAr: "تدقيق واعتماد نصوص الـ OCR", description: "مراجعة التفريغ النصي وتصحيح الكلمات ومطابقة الأرقام المالية" },
  { id: "ocr:batch_tag", category: "الفهرسة والـ OCR", nameAr: "الوسم الذكي والتحديث الجماعي", description: "تطبيق الوسوم والتصنيفات الدلالية على مجموعات الوثائق دفعة واحدة" },

  // دورة حياة الحفظ
  { id: "retention:view", category: "دورة حياة الحفظ", nameAr: "متابعة مدد الحفظ القانوني", description: "استعراض جداول التقادم والمدد الزمنية وإشعارات الاقتراب من الانتهاء" },
  { id: "retention:extend", category: "دورة حياة الحفظ", nameAr: "تمديد فترة الحفظ بقرار وزاري", description: "اعتماد مذكرات التمديد القانونية للوثائق المالية" },
  { id: "retention:flag_disposal", category: "دورة حياة الحفظ", nameAr: "إحالة الوثيقة للجنة الإتلاف النظامي", description: "إدراج السجلات المنتهية في محاضر لجان الجرد والإتلاف" },
  { id: "retention:execute_disposal", category: "دورة حياة الحفظ", nameAr: "تنفيذ محضر الإتلاف القانوني النهائي", description: "التوقيع على إتلاف الوثائق غير السيادية المنتهية نظامياً" },

  // إدارة المستخدمين والصلاحيات
  { id: "users:read", category: "إدارة المستخدمين", nameAr: "استعراض دليل الموظفين والمستخدمين", description: "الاطلاع على قائمة الموظفين والتصاريح الأمنية والإدارات" },
  { id: "users:create", category: "إدارة المستخدمين", nameAr: "إنشاء حساب موظف جديد", description: "إضافة مستخدم جديد وربطه بالرقم الوطني والشارة الوظيفية" },
  { id: "users:edit", category: "إدارة المستخدمين", nameAr: "تعديل بيانات ورتب الموظفين", description: "ترقية التصاريح وتغيير الإدارات والمسميات الوظيفية" },
  { id: "users:delete", category: "إدارة المستخدمين", nameAr: "إيقاف / تعطيل الحسابات", description: "تجميد حسابات الموظفين وسحب صلاحيات الدخول" },
  { id: "users:reset_pwd", category: "إدارة المستخدمين", nameAr: "إعادة ضبط كلمات المرور", description: "توليد كلمات مرور جديدة وفك الحظر الأمني" },
  { id: "roles:manage", category: "إدارة المستخدمين", nameAr: "إدارة مصفوفة الأدوار والصلاحيات", description: "تخصيص الصلاحيات الممنوحة لكل دور وظيفي بالوزارة" },

  // الرقابة والتدقيق
  { id: "audit:read", category: "الرقابة والتدقيق", nameAr: "استعراض سجل التدقيق الرقابي الكامل", description: "متابعة جميع العمليات وحركات الدخول والتعديلات اللحظية" },
  { id: "audit:export", category: "الرقابة والتدقيق", nameAr: "تصدير تقارير الامتثال الرقابي", description: "استخراج تقارير رسمية لديوان المحاسبة وهيئة الرقابة الإدارية" },

  // الهيكل التنظيمي لوزارة المالية
  { id: "org:read", category: "الهيكل التنظيمي", nameAr: "استعراض الهيكل التنظيمي للوزارة", description: "الاطلاع على شجرة الإدارات والمصالح والمكاتب والأقسام التابعة للوزارة" },
  { id: "org:manage", category: "الهيكل التنظيمي", nameAr: "إدارة وتعديل الهيكل التنظيمي", description: "إضافة وتعديل وحذف وتجميد الإدارات والمصالح والأقسام وتعيين المسؤولين من قبل مدير النظام" },

  // محرك قاعدة البيانات
  { id: "database:view_status", category: "قواعد البيانات", nameAr: "مراقبة حالة قاعدة البيانات", description: "فحص أداء SQLite و PostgreSQL وعدد السجلات والاتصال" },
  { id: "database:switch_provider", category: "قواعد البيانات", nameAr: "التبديل بين SQLite و PostgreSQL", description: "تغيير محرك التخزين النشط ونقل الجداول والتهيئة الفورية" },
  { id: "database:export_sql", category: "قواعد البيانات", nameAr: "تصدير سكربت الترحيل SQL", description: "تنزيل مخطط DDL الكامل وسجلات التهيئة بصيغة PostgreSQL" },
];

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    id: "CHIEF_CUSTODIAN",
    nameAr: "أمين الخزينة العامة والأرشيف السيادي",
    nameEn: "Chief Sovereign Custodian & Super Admin",
    description: "أعلى سلطة أرشيفية ورقابية، يملك كامل الصلاحيات السيادية والإدارية وإدارة التشفير وقواعد البيانات.",
    isSystem: true,
    badgeColor: "from-amber-600 to-amber-700",
    permissions: SYSTEM_PERMISSIONS.map((p) => p.id)
  },
  {
    id: "AUDIT_INSPECTOR",
    nameAr: "مراقب ديوان المحاسبة والامتثال المالي",
    nameEn: "Audit & Compliance Inspector",
    description: "صلاحيات رقابية شاملة للاطلاع على السجلات والتدقيق الجنائي والتشفيري والامتثال القانوني دون صلاحية الحذف أو تعديل القيود.",
    isSystem: true,
    badgeColor: "from-purple-600 to-indigo-700",
    permissions: [
      "documents:read",
      "documents:export_certified",
      "documents:print_secure",
      "vault:access",
      "vault:verify_integrity",
      "retention:view",
      "users:read",
      "audit:read",
      "audit:export",
      "org:read",
      "database:view_status"
    ]
  },
  {
    id: "SENIOR_ARCHIVIST",
    nameAr: "كبير أخصائيي الأرشفة والترميم التاريخي",
    nameEn: "Senior Historical Archivist",
    description: "مسؤول الفهرسة، المسح الضوئي، تدقيق الـ OCR، الوسم الذكي، وتمديد دورة الحفظ النظامية.",
    isSystem: true,
    badgeColor: "from-emerald-600 to-teal-700",
    permissions: [
      "documents:read",
      "documents:create",
      "documents:edit",
      "documents:export_certified",
      "documents:print_secure",
      "ocr:scan",
      "ocr:verify",
      "ocr:batch_tag",
      "vault:access",
      "vault:verify_integrity",
      "retention:view",
      "retention:extend",
      "audit:read"
    ]
  },
  {
    id: "RESEARCHER",
    nameAr: "باحث مالي معتمد (الاطلاع العام والمحدود)",
    nameEn: "Certified Financial Researcher",
    description: "باحث مالي معتمد للاستعلام والبحث في السجلات والوثائق المصرح بها دون صلاحيات التعديل أو الوصول للسجلات السرية.",
    isSystem: true,
    badgeColor: "from-blue-600 to-cyan-700",
    permissions: [
      "documents:read",
      "documents:export_certified",
      "vault:access"
    ]
  }
];

export class DatabaseAdapter {
  private static instance: DatabaseAdapter | null = null;
  private currentEngine: DatabaseEngineType = "sqlite";
  private sqliteDb: DatabaseSync | null = null;
  private pgPool: pg.Pool | null = null;
  private sqlitePath: string;
  private postgresConfig: PostgresConnectionConfig = {};
  private lastSwitchedAt: string = new Date().toISOString();
  private lastError: string | null = null;

  private constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create data directory:", err);
      }
    }
    this.sqlitePath = path.join(dataDir, "archive_auth.sqlite");

    // Initialize from environment
    const requestedEngine = (process.env.DATABASE_TYPE || "sqlite").toLowerCase();
    this.currentEngine = requestedEngine === "postgres" || requestedEngine === "postgresql" ? "postgresql" : "sqlite";
    if (process.env.DATABASE_URL) {
      this.postgresConfig = { connectionString: process.env.DATABASE_URL };
    }
  }

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  public async initialize(): Promise<void> {
    try {
      if (this.currentEngine === "postgresql" && (this.postgresConfig.connectionString || this.postgresConfig.host)) {
        await this.initPostgres();
      } else {
        this.initSqlite();
      }
      await this.runMigrationsAndSeed();
      console.log(`[DatabaseAdapter] Successfully initialized using engine: ${this.currentEngine.toUpperCase()}`);
    } catch (err: any) {
      console.error(`[DatabaseAdapter] Initialization error on ${this.currentEngine}:`, err.message);
      if (this.currentEngine === "postgresql") {
        console.log("[DatabaseAdapter] Falling back gracefully to SQLite storage engine.");
        this.currentEngine = "sqlite";
        this.initSqlite();
        await this.runMigrationsAndSeed();
      } else {
        throw err;
      }
    }
  }

  private initSqlite(): void {
    if (this.sqliteDb) {
      try {
        this.sqliteDb.close();
      } catch {}
    }
    this.sqliteDb = new DatabaseSync(this.sqlitePath);
    // Performance and safety pragmas
    this.sqliteDb.exec("PRAGMA journal_mode = WAL;");
    this.sqliteDb.exec("PRAGMA foreign_keys = ON;");
    this.currentEngine = "sqlite";
    this.lastError = null;
  }

  private async initPostgres(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end().catch(() => {});
    }

    const poolConfig: pg.PoolConfig = this.postgresConfig.connectionString
      ? { connectionString: this.postgresConfig.connectionString }
      : {
          host: this.postgresConfig.host || "localhost",
          port: this.postgresConfig.port || 5432,
          database: this.postgresConfig.database || "libyan_archive_auth",
          user: this.postgresConfig.user || "postgres",
          password: this.postgresConfig.password || "postgres",
          ssl: this.postgresConfig.ssl ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000
        };

    const pool = new Pool(poolConfig);
    // Test connectivity
    const client = await pool.connect();
    try {
      await client.query("SELECT 1 AS test;");
    } finally {
      client.release();
    }
    this.pgPool = pool;
    this.currentEngine = "postgresql";
    this.lastError = null;
  }

  public async runMigrationsAndSeed(): Promise<void> {
    if (this.currentEngine === "sqlite") {
      this.runSqliteMigrations();
    } else {
      await this.runPostgresMigrations();
    }
    await this.seedInitialData();
  }

  private runSqliteMigrations(): void {
    if (!this.sqliteDb) throw new Error("SQLite is not initialized");

    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        title TEXT NOT NULL,
        role TEXT NOT NULL,
        clearance_level TEXT NOT NULL,
        national_id TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        badge_number TEXT NOT NULL,
        key_fingerprint TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        phone TEXT,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        last_login_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        description TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        badge_color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        is_revoked INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        ip_address TEXT,
        status TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_logs(created_at DESC);

      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        parent_id TEXT,
        manager_name TEXT NOT NULL,
        manager_title TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        classification_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dept_code ON departments(code);
      CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
    `);
  }

  private async runPostgresMigrations(): Promise<void> {
    if (!this.pgPool) throw new Error("PostgreSQL pool is not initialized");

    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL,
        clearance_level VARCHAR(50) NOT NULL,
        national_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(255) NOT NULL,
        badge_number VARCHAR(100) NOT NULL,
        key_fingerprint VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        phone VARCHAR(50),
        failed_login_attempts INT NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(100) PRIMARY KEY,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        badge_color VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(100) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        action VARCHAR(255) NOT NULL,
        target_type VARCHAR(100) NOT NULL,
        target_id VARCHAR(100),
        ip_address VARCHAR(100),
        status VARCHAR(50) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_logs(created_at DESC);

      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(100) NOT NULL,
        parent_id VARCHAR(100),
        manager_name VARCHAR(255) NOT NULL,
        manager_title VARCHAR(255) NOT NULL,
        email VARCHAR(200),
        phone VARCHAR(50),
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        classification_level VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dept_code ON departments(code);
      CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
    `;

    await this.pgPool.query(sql);
  }

  private async seedInitialData(): Promise<void> {
    // 1. Seed Permissions
    for (const perm of SYSTEM_PERMISSIONS) {
      await this.execute(
        `INSERT INTO permissions (id, category, name_ar, description)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING;`,
        [perm.id, perm.category, perm.nameAr, perm.description]
      );
    }

    // 2. Seed Roles
    for (const role of SYSTEM_ROLES) {
      await this.execute(
        `INSERT INTO roles (id, name_ar, name_en, description, is_system, badge_color)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING;`,
        [role.id, role.nameAr, role.nameEn, role.description, role.isSystem ? 1 : 0, role.badgeColor]
      );

      // Seed Role Permissions
      for (const permId of role.permissions) {
        await this.execute(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES (?, ?)
           ON CONFLICT (role_id, permission_id) DO NOTHING;`,
          [role.id, permId]
        );
      }
    }

    // 3. Seed Default Institutional Libyan Ministry of Finance Users
    const defaultSalt = await bcrypt.genSalt(10);
    const standardPasswordHash = await bcrypt.hash("mof@Libya2026!", defaultSalt);
    const nowIso = new Date().toISOString();

    const seedUsers = [
      {
        id: "user-chief-custodian",
        username: "admin",
        email: "o.tarhuni@mof.gov.ly",
        fullName: "م. عثمان مفتاح الترهوني",
        title: "أمين الخزينة العامة والأرشيف السيادي",
        role: "CHIEF_CUSTODIAN" as VaultRole,
        clearanceLevel: "سري للغاية" as SecurityClassification,
        nationalId: "119680324881",
        department: "ديوان وزارة المالية - الأرشيف السيادي المركزي",
        badgeNumber: "LY-MOF-SEC-001",
        keyFingerprint: "E4:8B:22:9A:F0:17:3C:99:4D:A1:EE:55:72:09:1B:33",
        phone: "+218 91 234 5678"
      },
      {
        id: "user-audit-inspector",
        username: "auditor",
        email: "kh.magrief@audit.gov.ly",
        fullName: "المستشارة خديجة بشير المقريف",
        title: "مراقب ديوان المحاسبة والامتثال المالي",
        role: "AUDIT_INSPECTOR" as VaultRole,
        clearanceLevel: "سري" as SecurityClassification,
        nationalId: "219740192834",
        department: "ديوان المحاسبة والرقابة المالية العامة",
        badgeNumber: "LY-ACC-INSP-042",
        keyFingerprint: "A9:41:8F:CC:33:02:D5:77:E1:90:BB:64:18:2C:90:FE",
        phone: "+218 92 876 5432"
      },
      {
        id: "user-senior-archivist",
        username: "archivist",
        email: "s.fituri@mof.gov.ly",
        fullName: "أ. سالم عبد الحميد الفيتوري",
        title: "كبير أخصائيي الأرشفة والترميم التاريخي",
        role: "SENIOR_ARCHIVIST" as VaultRole,
        clearanceLevel: "محدود" as SecurityClassification,
        nationalId: "119810459201",
        department: "المركز الوطني للأرشيف والمخطوطات المالية",
        badgeNumber: "LY-MOF-ARC-118",
        keyFingerprint: "7C:EE:01:99:44:BA:23:66:88:DF:10:9C:55:40:2A:81",
        phone: "+218 91 555 4321"
      },
      {
        id: "user-researcher",
        username: "researcher",
        email: "o.zentani@uot.edu.ly",
        fullName: "د. عمر إبراهيم الزنتاني",
        title: "باحث مالي وأكاديمي معتمد (تاريخ الاقتصاد الليبي)",
        role: "RESEARCHER" as VaultRole,
        clearanceLevel: "عام" as SecurityClassification,
        nationalId: "119850294119",
        department: "مركز البحوث المالية والدراسات الاقتصادية - جامعة طرابلس",
        badgeNumber: "LY-RES-ACAD-507",
        keyFingerprint: "32:90:AB:44:81:62:CF:11:00:DE:89:12:47:33:FA:65",
        phone: "+218 94 333 9988"
      }
    ];

    for (const u of seedUsers) {
      await this.execute(
        `INSERT INTO users (
          id, username, email, password_hash, full_name, title, role,
          clearance_level, national_id, department, badge_number,
          key_fingerprint, status, phone, failed_login_attempts,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?)
        ON CONFLICT (id) DO NOTHING;`,
        [
          u.id, u.username, u.email, standardPasswordHash, u.fullName, u.title,
          u.role, u.clearanceLevel, u.nationalId, u.department, u.badgeNumber,
          u.keyFingerprint, u.phone, nowIso, nowIso
        ]
      );

      // Link User Role
      await this.execute(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES (?, ?)
         ON CONFLICT (user_id, role_id) DO NOTHING;`,
        [u.id, u.role]
      );
    }

    // 4. Seed Initial Organizational Units of Ministry of Finance
    const initialDepts = [
      {
        id: "org-diwan",
        code: "MOF-HQ",
        name: "ديوان وزارة المالية",
        type: "ministry_hq",
        parentId: null,
        managerName: "د. خالد المبروك عبد الله",
        managerTitle: "وزير المالية بحكومة الوحدة الوطنية",
        email: "diwan@mof.gov.ly",
        phone: "+218 21 333 4500",
        location: "مبنى ديوان الوزارة - طريق الشط، طرابلس",
        description: "القيادة العليا لوزارة المالية، الإشراف على السياسات المالية العامة، التخطيط الاستراتيجي وتوجيه المصالح السيادية.",
        classificationLevel: "سري للغاية",
        status: "active",
        orderIndex: 1
      },
      {
        id: "org-treasury",
        code: "MOF-TRS",
        name: "إدارة الخزانة العامة",
        type: "general_directorate",
        parentId: "org-diwan",
        managerName: "م. عثمان مفتاح الترهوني",
        managerTitle: "مدير عام إدارة الخزانة العامة",
        email: "treasury@mof.gov.ly",
        phone: "+218 21 333 4510",
        location: "المجمع الإداري المالي - الطابق الرابع - طرابلس",
        description: "إدارة السيولة النقدية للدولة، فتح ومتابعة الحسابات الحكومية، وإصدار أذونات الصرف وسندات الخزانة والقروض العامة.",
        classificationLevel: "سري للغاية",
        status: "active",
        orderIndex: 2
      },
      {
        id: "org-budget",
        code: "MOF-BDG",
        name: "إدارة الميزانية العامة والتخطيط المالي",
        type: "general_directorate",
        parentId: "org-diwan",
        managerName: "أ. عبد الرزاق مصطفى البوسيفي",
        managerTitle: "مدير عام الميزانية والإنفاق العام",
        email: "budget@mof.gov.ly",
        phone: "+218 21 333 4520",
        location: "المجمع الإداري المالي - الطابق الثالث - طرابلس",
        description: "إعداد تقديرات الموازنة العامة، وتوزيع ومتابعة المخصصات المالية لقطاعات الدولة والتحقق من بنود الإنفاق.",
        classificationLevel: "سري",
        status: "active",
        orderIndex: 3
      },
      {
        id: "org-customs",
        code: "MOF-CUS",
        name: "مصلحة الجمارك الليبية",
        type: "authority",
        parentId: "org-diwan",
        managerName: "اللواء سليمان علي سالم",
        managerTitle: "رئيس مصلحة الجمارك الليبية",
        email: "info@customs.gov.ly",
        phone: "+218 21 340 7000",
        location: "المقر الرئيسي لمصلحة الجمارك - ميناء طرابلس البحري",
        description: "تحصيل الرسوم والضرائب الجمركية، مكافحة التهريب وحماية الاقتصاد الوطني عبر المنافذ البحرية والبرية والجوية.",
        classificationLevel: "سري ومحدود",
        status: "active",
        orderIndex: 4
      },
      {
        id: "org-tax",
        code: "MOF-TAX",
        name: "مصلحة الضرائب",
        type: "authority",
        parentId: "org-diwan",
        managerName: "أ. مفتاح المهدي الفزاني",
        managerTitle: "رئيس مصلحة الضرائب",
        email: "tax@mof.gov.ly",
        phone: "+218 21 361 2200",
        location: "الإدارة العامة لمصلحة الضرائب - شارع الصريم، طرابلس",
        description: "جباية وتقدير الضرائب المباشرة وغير المباشرة، فحص الإقرارات الضريبية للشركات وكبار الممولين وتوسيع الوعاء الضريبي.",
        classificationLevel: "سري ومحدود",
        status: "active",
        orderIndex: 5
      },
      {
        id: "org-accounting",
        code: "MOF-ACC",
        name: "إدارة الحسابات والرقابة المالية",
        type: "general_directorate",
        parentId: "org-diwan",
        managerName: "المستشارة خديجة بشير المقريف",
        managerTitle: "مدير عام الحسابات والمراقبين الماليين",
        email: "accounts@mof.gov.ly",
        phone: "+218 21 333 4530",
        location: "مبنى ديوان الوزارة - الطابق الثاني - طرابلس",
        description: "الإشراف على المراقبين الماليين بالوزارات والهيئات، قفل الحسابات الختامية للدولة، ومراجعة مستندات الصرف والتحويلات.",
        classificationLevel: "سري",
        status: "active",
        orderIndex: 6
      },
      {
        id: "org-state-properties",
        code: "MOF-EST",
        name: "مصلحة أملاك الدولة",
        type: "authority",
        parentId: "org-diwan",
        managerName: "م. عبد السلام الصيد مسعود",
        managerTitle: "رئيس مصلحة أملاك الدولة",
        email: "state.property@mof.gov.ly",
        phone: "+218 21 334 1150",
        location: "شارع الجمهورية - المقر التاريخي لأملاك الدولة، طرابلس",
        description: "حصر وتوثيق وتسجيل العقارات والأراضي والأصول العينية المملوكة للدولة الليبية وإدارة عقود الاستغلال والتخصيص.",
        classificationLevel: "محدود",
        status: "active",
        orderIndex: 7
      },
      {
        id: "org-public-debt",
        code: "MOF-DEB",
        name: "إدارة الدين العام والالتزامات المالية",
        type: "general_directorate",
        parentId: "org-diwan",
        managerName: "د. طارق مصباح القاضي",
        managerTitle: "مدير إدارة الدين العام والالتزامات التعاقدية",
        email: "public.debt@mof.gov.ly",
        phone: "+218 21 333 4540",
        location: "ديوان وزارة المالية - الطابق الخامس - طرابلس",
        description: "حصر ومتابعة الدين العام المحلي والالتزامات التعاقدية الدولية، جدولة الاستحقاقات وسندات القروض والمطالبات المالية.",
        classificationLevel: "سري للغاية",
        status: "active",
        orderIndex: 8
      },
      {
        id: "org-info-center",
        code: "MOF-DOC",
        name: "مركز المعلومات والتوثيق المالي والأرشيف",
        type: "department",
        parentId: "org-diwan",
        managerName: "أ. سالم عبد الحميد الفيتوري",
        managerTitle: "مدير مركز التوثيق والأرشيف المالي",
        email: "archive@mof.gov.ly",
        phone: "+218 21 333 4590",
        location: "مبنى الخزينة الرقمية والأرشيف الوطني - شارع النصر، طرابلس",
        description: "حفظ المخطوطات والوثائق المالية والسيادية، التحول اللاورقي، والمسح الضوئي والفهرسة الرقمية وفق معايير ISAD(G).",
        classificationLevel: "محدود",
        status: "active",
        orderIndex: 9
      },
      {
        id: "org-minister-office",
        code: "MOF-SEC-01",
        name: "مكتب شؤون الوزير والتوثيق السري",
        type: "office",
        parentId: "org-diwan",
        managerName: "أ. عمر نوري الشريف",
        managerTitle: "مدير مكتب الوزير",
        email: "minister.office@mof.gov.ly",
        phone: "+218 21 333 4505",
        location: "ديوان وزارة المالية - جناح الوزير",
        description: "تنظيم المراسلات الوزارية السيادية، التوثيق السري، ومتابعة تنفيذ القرارات الصادرة عن الوزير.",
        classificationLevel: "سري للغاية",
        status: "active",
        orderIndex: 10
      },
      {
        id: "org-trs-records",
        code: "MOF-TRS-02",
        name: "قسم القيود والمطابقة الخزينية",
        type: "section",
        parentId: "org-treasury",
        managerName: "أ. عبد المنعم أحمد الورفلي",
        managerTitle: "رئيس قسم القيود الخزينية",
        email: "records@mof.gov.ly",
        phone: "+218 21 333 4515",
        location: "مبنى الخزانة العامة - الجناح الأرشيفي",
        description: "مطابقة القيود الدفترية التاريخية والمعاصرة، ومراجعة سجلات الإيداع الخزيني وأذونات الصرف اليومية.",
        classificationLevel: "سري ومحدود",
        status: "active",
        orderIndex: 11
      },
      {
        id: "org-cus-inspect",
        code: "MOF-CUS-02",
        name: "مكتب الرقابة الجمركية ومكافحة التهريب",
        type: "office",
        parentId: "org-customs",
        managerName: "العقيد محمد علي الفرجاني",
        managerTitle: "مدير مكتب الرقابة الجمركية",
        email: "anti-smuggle@customs.gov.ly",
        phone: "+218 21 340 7050",
        location: "مقر إدارة الرقابة - ميناء طرابلس وميناء الخمس",
        description: "تدقيق المعاملات الجمركية الحساسة، مكافحة التهرب، وتوثيق ضبطيات البضائع ومحاضر المصادرة القانونية.",
        classificationLevel: "سري",
        status: "active",
        orderIndex: 12
      }
    ];

    for (const d of initialDepts) {
      await this.execute(
        `INSERT INTO departments (
          id, code, name, type, parent_id, manager_name, manager_title,
          email, phone, location, description, classification_level, status,
          order_index, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING;`,
        [
          d.id, d.code, d.name, d.type, d.parentId, d.managerName, d.managerTitle,
          d.email, d.phone, d.location, d.description, d.classificationLevel, d.status,
          d.orderIndex, nowIso, nowIso
        ]
      );
    }
  }

  // Unified Query Helper: automatically converts ? to $1, $2 for Postgres
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.currentEngine === "sqlite") {
      if (!this.sqliteDb) throw new Error("SQLite is not initialized");
      const stmt = this.sqliteDb.prepare(sql);
      const results = stmt.all(...params) as T[];
      return results;
    } else {
      if (!this.pgPool) throw new Error("PostgreSQL pool is not initialized");
      const pgSql = this.convertPlaceholdersToDollar(sql);
      const res = await this.pgPool.query(pgSql, params);
      return res.rows as T[];
    }
  }

  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    if (this.currentEngine === "sqlite") {
      if (!this.sqliteDb) throw new Error("SQLite is not initialized");
      const stmt = this.sqliteDb.prepare(sql);
      const info = stmt.run(...params);
      return { changes: Number(info.changes) };
    } else {
      if (!this.pgPool) throw new Error("PostgreSQL pool is not initialized");
      const pgSql = this.convertPlaceholdersToDollar(sql);
      const res = await this.pgPool.query(pgSql, params);
      return { changes: res.rowCount || 0 };
    }
  }

  private convertPlaceholdersToDollar(sql: string): string {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  // Dynamic Engine Switcher & Tester
  public async testPostgresConnection(config: PostgresConnectionConfig): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    let tempPool: pg.Pool | null = null;
    try {
      const poolConfig: pg.PoolConfig = config.connectionString
        ? { connectionString: config.connectionString }
        : {
            host: config.host || "localhost",
            port: config.port || 5432,
            database: config.database || "libyan_archive_auth",
            user: config.user || "postgres",
            password: config.password || "postgres",
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: 5000
          };

      tempPool = new Pool(poolConfig);
      const client = await tempPool.connect();
      try {
        await client.query("SELECT 1;");
      } finally {
        client.release();
      }
      const latencyMs = Date.now() - start;
      return { success: true, latencyMs };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: err.message || "Failed to connect to PostgreSQL instance"
      };
    } finally {
      if (tempPool) {
        await tempPool.end().catch(() => {});
      }
    }
  }

  public async switchEngine(newEngine: DatabaseEngineType, pgConfig?: PostgresConnectionConfig): Promise<DatabaseStats> {
    if (newEngine === "postgresql") {
      if (pgConfig) {
        this.postgresConfig = pgConfig;
      }
      await this.initPostgres();
      await this.runMigrationsAndSeed();
    } else {
      this.initSqlite();
      await this.runMigrationsAndSeed();
    }
    this.currentEngine = newEngine;
    this.lastSwitchedAt = new Date().toISOString();
    return this.getStats();
  }

  public async getStats(): Promise<DatabaseStats> {
    try {
      const usersRes = await this.queryOne<{ count: number | string }>("SELECT count(*) AS count FROM users;");
      const rolesRes = await this.queryOne<{ count: number | string }>("SELECT count(*) AS count FROM roles;");
      const permsRes = await this.queryOne<{ count: number | string }>("SELECT count(*) AS count FROM permissions;");
      const auditRes = await this.queryOne<{ count: number | string }>("SELECT count(*) AS count FROM security_audit_logs;");
      const sessRes = await this.queryOne<{ count: number | string }>("SELECT count(*) AS count FROM user_sessions;");
      let orgCount = 0;
      try {
        const orgRes = await this.queryOne<{ count: number | string }>("SELECT count(*) AS count FROM departments;");
        orgCount = Number(orgRes?.count || 0);
      } catch {}

      return {
        engine: this.currentEngine,
        status: "connected",
        sqlitePath: this.sqlitePath,
        postgresConfig: {
          host: this.postgresConfig.host || "localhost",
          port: this.postgresConfig.port || 5432,
          database: this.postgresConfig.database || "libyan_archive_auth",
          user: this.postgresConfig.user || "postgres",
          ssl: Boolean(this.postgresConfig.ssl)
        },
        tableStats: {
          usersCount: Number(usersRes?.count || 0),
          rolesCount: Number(rolesRes?.count || 0),
          permissionsCount: Number(permsRes?.count || 0),
          auditLogsCount: Number(auditRes?.count || 0),
          sessionsCount: Number(sessRes?.count || 0),
          orgUnitsCount: orgCount
        },
        lastSwitchedAt: this.lastSwitchedAt,
        errorMessage: this.lastError || undefined
      };
    } catch (err: any) {
      return {
        engine: this.currentEngine,
        status: "error",
        sqlitePath: this.sqlitePath,
        postgresConfig: {
          host: this.postgresConfig.host || "localhost",
          port: this.postgresConfig.port || 5432,
          database: this.postgresConfig.database || "libyan_archive_auth",
          user: this.postgresConfig.user || "postgres",
          ssl: Boolean(this.postgresConfig.ssl)
        },
        tableStats: {
          usersCount: 0,
          rolesCount: 0,
          permissionsCount: 0,
          auditLogsCount: 0,
          sessionsCount: 0
        },
        lastSwitchedAt: this.lastSwitchedAt,
        errorMessage: err.message
      };
    }
  }

  // PostgreSQL DDL & DML Migration Export Script
  public generatePostgresSchemaScript(): string {
    return `-- =============================================================================
-- Libyan Ministry of Finance - Sovereign Digital Archive (الأرشيف الرقمي لوزارة المالية)
-- PostgreSQL Enterprise Database Schema & Initial RBAC Seed Script
-- Generated at: ${new Date().toISOString()}
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  clearance_level VARCHAR(50) NOT NULL,
  national_id VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(255) NOT NULL,
  badge_number VARCHAR(100) NOT NULL,
  key_fingerprint VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  phone VARCHAR(50),
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(100) PRIMARY KEY,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  badge_color VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id VARCHAR(100),
  ip_address VARCHAR(100),
  status VARCHAR(50) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_logs(created_at DESC);

-- Seed Permissions
${SYSTEM_PERMISSIONS.map((p) => `INSERT INTO permissions (id, category, name_ar, description) VALUES ('${p.id}', '${p.category}', '${p.nameAr.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}') ON CONFLICT (id) DO NOTHING;`).join("\n")}

-- Seed Roles
${SYSTEM_ROLES.map((r) => `INSERT INTO roles (id, name_ar, name_en, description, is_system, badge_color) VALUES ('${r.id}', '${r.nameAr.replace(/'/g, "''")}', '${r.nameEn.replace(/'/g, "''")}', '${r.description.replace(/'/g, "''")}', ${r.isSystem ? "TRUE" : "FALSE"}, '${r.badgeColor}') ON CONFLICT (id) DO NOTHING;`).join("\n")}

COMMIT;
`;
  }
}
