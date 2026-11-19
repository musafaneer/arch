import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { DatabaseAdapter } from "../db/databaseAdapter";
import {
  PermissionId,
  RoleDefinition,
  SecurityAuditLogEntry,
  SecurityClassification,
  UserAccount,
  VaultRole
} from "../../src/types";

const JWT_SECRET = process.env.JWT_SECRET || "libyan_mof_sovereign_auth_secret_key_2026";
const TOKEN_EXPIRY = "24h";

export interface LoginResult {
  user: UserAccount;
  token: string;
  expiresIn: string;
}

export class AuthService {
  private static instance: AuthService | null = null;
  private db: DatabaseAdapter;

  private constructor() {
    this.db = DatabaseAdapter.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Security Audit Logging helper
  public async logSecurityEvent(payload: {
    userId: string;
    username: string;
    action: string;
    targetType: string;
    targetId?: string;
    ipAddress?: string;
    status: "SUCCESS" | "DENIED" | "FAILED";
    details: string;
  }): Promise<void> {
    try {
      const id = `SEC-AUDIT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await this.db.execute(
        `INSERT INTO security_audit_logs (
          id, user_id, username, action, target_type, target_id, ip_address, status, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          payload.userId,
          payload.username,
          payload.action,
          payload.targetType,
          payload.targetId || null,
          payload.ipAddress || "127.0.0.1",
          payload.status,
          payload.details,
          new Date().toISOString()
        ]
      );
    } catch (err: any) {
      console.error("[AuthService] Failed to record security audit log:", err.message);
    }
  }

  // Find User by Username or Email
  public async findUserByLoginIdentifier(identifier: string): Promise<any | null> {
    const clean = identifier.trim().toLowerCase();
    const user = await this.db.queryOne<any>(
      `SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ? OR national_id = ?;`,
      [clean, clean, identifier.trim()]
    );
    return user;
  }

  // Load User with Permissions and Active Roles
  public async getUserAccountById(userId: string): Promise<UserAccount | null> {
    const rawUser = await this.db.queryOne<any>(
      `SELECT * FROM users WHERE id = ?;`,
      [userId]
    );
    if (!rawUser) return null;

    // Fetch user permissions through roles
    const permRows = await this.db.query<{ permission_id: PermissionId }>(
      `SELECT DISTINCT rp.permission_id
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       WHERE ur.user_id = ?;`,
      [userId]
    );

    const permissions = permRows.map((r) => r.permission_id);

    return {
      id: rawUser.id,
      username: rawUser.username,
      email: rawUser.email,
      name: rawUser.full_name,
      fullName: rawUser.full_name,
      title: rawUser.title,
      role: rawUser.role as VaultRole,
      clearanceLevel: rawUser.clearance_level as SecurityClassification,
      nationalId: rawUser.national_id,
      department: rawUser.department,
      badgeNumber: rawUser.badge_number,
      keyFingerprint: rawUser.key_fingerprint,
      status: rawUser.status,
      phone: rawUser.phone || undefined,
      permissions,
      failedLoginAttempts: rawUser.failed_login_attempts,
      lockedUntil: rawUser.locked_until,
      lastLoginAt: rawUser.last_login_at,
      createdAt: rawUser.created_at,
      updatedAt: rawUser.updated_at
    };
  }

  // Primary Login
  public async login(
    identifier: string,
    passwordPlain: string,
    ipAddress: string = "127.0.0.1",
    userAgent: string = "Mozilla/5.0"
  ): Promise<LoginResult> {
    const rawUser = await this.findUserByLoginIdentifier(identifier);

    if (!rawUser) {
      await this.logSecurityEvent({
        userId: "UNKNOWN",
        username: identifier,
        action: "محاولة تسجيل دخول فاشلة",
        targetType: "AUTH",
        ipAddress,
        status: "FAILED",
        details: "المستخدم أو الرقم الوطني غير موجود بالنظام الأرشيفي"
      });
      throw new Error("بيانات الاعتماد غير صحيحة أو الحساب غير موجود");
    }

    // Check account status
    if (rawUser.status === "suspended") {
      await this.logSecurityEvent({
        userId: rawUser.id,
        username: rawUser.username,
        action: "محاولة دخول لحساب موقوف",
        targetType: "AUTH",
        ipAddress,
        status: "DENIED",
        details: `محاولة دخول إلى حساب معطل إدارياً: ${rawUser.full_name}`
      });
      throw new Error("هذا الحساب موقوف إدارياً بقرار من ديوان الرقابة المالية");
    }

    // Check temporary lockout
    if (rawUser.locked_until) {
      const lockDate = new Date(rawUser.locked_until);
      if (lockDate > new Date()) {
        const remainingMinutes = Math.ceil((lockDate.getTime() - Date.now()) / (60 * 1000));
        throw new Error(`الحساب مقفل مؤقتاً لدواعي أمنية بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`);
      }
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(passwordPlain, rawUser.password_hash);
    if (!passwordMatch) {
      const newAttempts = (rawUser.failed_login_attempts || 0) + 1;
      let lockedUntil: string | null = null;
      if (newAttempts >= 5) {
        // Lock account for 15 minutes
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await this.db.execute(
        `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?;`,
        [newAttempts, lockedUntil, rawUser.id]
      );

      await this.logSecurityEvent({
        userId: rawUser.id,
        username: rawUser.username,
        action: "كلمة مرور خاطئة",
        targetType: "AUTH",
        ipAddress,
        status: "FAILED",
        details: `محاولة فاشلة رقم ${newAttempts} من أصل 5 محاولات مسموحة`
      });

      throw new Error(
        newAttempts >= 5
          ? "تم قفل الحساب مؤقتاً لمدة 15 دقيقة لتجاوز الحد الأقصى للمحاولات"
          : `كلمة المرور غير صحيحة. المحاولة ${newAttempts} من 5`
      );
    }

    // Reset failed attempts & update last_login_at
    const nowIso = new Date().toISOString();
    await this.db.execute(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?;`,
      [nowIso, rawUser.id]
    );

    // Issue JWT Token
    const payload = {
      sub: rawUser.id,
      username: rawUser.username,
      role: rawUser.role,
      clearanceLevel: rawUser.clearance_level
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sessionId = `SESS-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db.execute(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, created_at, expires_at, is_revoked)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
      [sessionId, rawUser.id, tokenHash, ipAddress, userAgent, nowIso, expiresAt]
    );

    await this.logSecurityEvent({
      userId: rawUser.id,
      username: rawUser.username,
      action: "تسجيل دخول ناجح",
      targetType: "AUTH",
      ipAddress,
      status: "SUCCESS",
      details: `تم توثيق الدخول بتصريح أمني: [${rawUser.clearance_level}] - الشارة: ${rawUser.badge_number}`
    });

    const userAccount = await this.getUserAccountById(rawUser.id);
    if (!userAccount) throw new Error("تعذر تحميل بيانات المستخدم بعد تسجيل الدخول");

    return {
      user: userAccount,
      token,
      expiresIn: TOKEN_EXPIRY
    };
  }

  // Quick Switch Token for Demo Institutional Profiles
  public async quickSwitch(username: string, ipAddress: string = "127.0.0.1"): Promise<LoginResult> {
    const rawUser = await this.findUserByLoginIdentifier(username);
    if (!rawUser) {
      throw new Error(`المستخدم الافتراضي [${username}] غير مسجل`);
    }

    const nowIso = new Date().toISOString();
    await this.db.execute(
      `UPDATE users SET last_login_at = ?, failed_login_attempts = 0 WHERE id = ?;`,
      [nowIso, rawUser.id]
    );

    const payload = {
      sub: rawUser.id,
      username: rawUser.username,
      role: rawUser.role,
      clearanceLevel: rawUser.clearance_level
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sessionId = `SESS-SW-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db.execute(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, created_at, expires_at, is_revoked)
       VALUES (?, ?, ?, ?, 'Quick-Role-Switcher', ?, ?, 0);`,
      [sessionId, rawUser.id, tokenHash, ipAddress, nowIso, expiresAt]
    );

    await this.logSecurityEvent({
      userId: rawUser.id,
      username: rawUser.username,
      action: "تبديل الحساب النشط",
      targetType: "AUTH",
      ipAddress,
      status: "SUCCESS",
      details: `تم الانتقال الفوري إلى حساب: ${rawUser.full_name} (${rawUser.title})`
    });

    const userAccount = await this.getUserAccountById(rawUser.id);
    if (!userAccount) throw new Error("تعذر تحميل الحساب");

    return {
      user: userAccount,
      token,
      expiresIn: TOKEN_EXPIRY
    };
  }

  // Verify JWT Token
  public async verifyToken(token: string): Promise<UserAccount | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      if (!decoded || !decoded.sub) return null;

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const session = await this.db.queryOne<any>(
        `SELECT * FROM user_sessions WHERE token_hash = ? AND is_revoked = 0;`,
        [tokenHash]
      );

      if (!session) return null;

      const user = await this.getUserAccountById(decoded.sub);
      if (!user || user.status === "suspended") return null;

      return user;
    } catch {
      return null;
    }
  }

  // Logout and Revoke Session
  public async logout(token: string, userId: string, username: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await this.db.execute(
      `UPDATE user_sessions SET is_revoked = 1 WHERE token_hash = ?;`,
      [tokenHash]
    );

    await this.logSecurityEvent({
      userId,
      username,
      action: "تسجيل خروج",
      targetType: "AUTH",
      status: "SUCCESS",
      details: "تم إنهاء الجلسة الأمنية وإبطال الرمز المميز"
    });
  }

  // Get All Users
  public async getAllUsers(filter?: { search?: string; role?: string; clearance?: string; status?: string }): Promise<UserAccount[]> {
    let sql = `SELECT id FROM users WHERE 1=1`;
    const params: any[] = [];

    if (filter?.search) {
      const s = `%${filter.search.trim().toLowerCase()}%`;
      sql += ` AND (lower(full_name) LIKE ? OR lower(username) LIKE ? OR national_id LIKE ? OR badge_number LIKE ? OR lower(department) LIKE ?)`;
      params.push(s, s, s, s, s);
    }

    if (filter?.role && filter.role !== "ALL") {
      sql += ` AND role = ?`;
      params.push(filter.role);
    }

    if (filter?.clearance && filter.clearance !== "ALL") {
      sql += ` AND clearance_level = ?`;
      params.push(filter.clearance);
    }

    if (filter?.status && filter.status !== "ALL") {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }

    sql += ` ORDER BY created_at DESC;`;

    const userRows = await this.db.query<{ id: string }>(sql, params);
    const users: UserAccount[] = [];

    for (const r of userRows) {
      const u = await this.getUserAccountById(r.id);
      if (u) users.push(u);
    }

    return users;
  }

  // Create User
  public async createUser(
    data: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      title: string;
      role: VaultRole;
      clearanceLevel: SecurityClassification;
      nationalId: string;
      department: string;
      badgeNumber: string;
      phone?: string;
    },
    actorUser: UserAccount
  ): Promise<UserAccount> {
    // Check uniqueness
    const existing = await this.db.queryOne<any>(
      `SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ? OR national_id = ?;`,
      [data.username.toLowerCase(), data.email.toLowerCase(), data.nationalId]
    );

    if (existing) {
      throw new Error("اسم المستخدم أو البريد الإلكتروني أو الرقم الوطني مسجل مسبقاً بالنظام");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const id = `user-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const nowIso = new Date().toISOString();

    // Generate SHA-256 fingerprint for key
    const keyFingerprint = crypto
      .createHash("sha256")
      .update(`${data.nationalId}:${data.badgeNumber}:${nowIso}`)
      .digest("hex")
      .slice(0, 32)
      .match(/.{2}/g)!
      .join(":")
      .toUpperCase();

    await this.db.execute(
      `INSERT INTO users (
        id, username, email, password_hash, full_name, title, role,
        clearance_level, national_id, department, badge_number,
        key_fingerprint, status, phone, failed_login_attempts,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?);`,
      [
        id,
        data.username.toLowerCase().trim(),
        data.email.toLowerCase().trim(),
        passwordHash,
        data.fullName.trim(),
        data.title.trim(),
        data.role,
        data.clearanceLevel,
        data.nationalId.trim(),
        data.department.trim(),
        data.badgeNumber.trim(),
        keyFingerprint,
        data.phone || null,
        nowIso,
        nowIso
      ]
    );

    await this.db.execute(
      `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?);`,
      [id, data.role]
    );

    await this.logSecurityEvent({
      userId: actorUser.id,
      username: actorUser.username,
      action: "إنشاء حساب موظف جديد",
      targetType: "USER",
      targetId: id,
      status: "SUCCESS",
      details: `تم إنشاء حساب ${data.fullName} بالرقم الوطني [${data.nationalId}] والرتبة [${data.role}]`
    });

    const created = await this.getUserAccountById(id);
    if (!created) throw new Error("تعذر إنشاء الحساب");
    return created;
  }

  // Update User
  public async updateUser(
    userId: string,
    updates: {
      fullName?: string;
      title?: string;
      role?: VaultRole;
      clearanceLevel?: SecurityClassification;
      department?: string;
      badgeNumber?: string;
      phone?: string;
      status?: "active" | "suspended" | "pending_review";
    },
    actorUser: UserAccount
  ): Promise<UserAccount> {
    const existing = await this.getUserAccountById(userId);
    if (!existing) throw new Error("المستخدم غير موجود");

    const nowIso = new Date().toISOString();
    const newFullName = updates.fullName ?? existing.name;
    const newTitle = updates.title ?? existing.title;
    const newRole = updates.role ?? existing.role;
    const newClearance = updates.clearanceLevel ?? existing.clearanceLevel;
    const newDepartment = updates.department ?? existing.department;
    const newBadge = updates.badgeNumber ?? existing.badgeNumber;
    const newPhone = updates.phone ?? existing.phone;
    const newStatus = updates.status ?? existing.status;

    await this.db.execute(
      `UPDATE users
       SET full_name = ?, title = ?, role = ?, clearance_level = ?,
           department = ?, badge_number = ?, phone = ?, status = ?, updated_at = ?
       WHERE id = ?;`,
      [newFullName, newTitle, newRole, newClearance, newDepartment, newBadge, newPhone || null, newStatus, nowIso, userId]
    );

    if (updates.role && updates.role !== existing.role) {
      await this.db.execute(`DELETE FROM user_roles WHERE user_id = ?;`, [userId]);
      await this.db.execute(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?);`, [userId, updates.role]);
    }

    await this.logSecurityEvent({
      userId: actorUser.id,
      username: actorUser.username,
      action: "تعديل بيانات الحساب",
      targetType: "USER",
      targetId: userId,
      status: "SUCCESS",
      details: `تحديث بيانات الموظف: ${existing.name} (التصريح: ${newClearance}, الدور: ${newRole}, الحالة: ${newStatus})`
    });

    const updated = await this.getUserAccountById(userId);
    if (!updated) throw new Error("تعذر تحديث بيانات الحساب");
    return updated;
  }

  // Toggle User Status
  public async toggleUserStatus(userId: string, actorUser: UserAccount): Promise<UserAccount> {
    const user = await this.getUserAccountById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (user.id === actorUser.id) throw new Error("لا يمكن للمسؤول تعطيل حسابه الخاص");

    const newStatus = user.status === "active" ? "suspended" : "active";
    await this.db.execute(
      `UPDATE users SET status = ?, updated_at = ? WHERE id = ?;`,
      [newStatus, new Date().toISOString(), userId]
    );

    // If suspended, revoke all active sessions
    if (newStatus === "suspended") {
      await this.db.execute(`UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?;`, [userId]);
    }

    await this.logSecurityEvent({
      userId: actorUser.id,
      username: actorUser.username,
      action: newStatus === "active" ? "تفعيل حساب موظف" : "إيقاف حساب موظف",
      targetType: "USER",
      targetId: userId,
      status: "SUCCESS",
      details: `تم تغيير حالة حساب [${user.name}] إلى: ${newStatus === "active" ? "نشط" : "موقوف"}`
    });

    return (await this.getUserAccountById(userId))!;
  }

  // Reset Password
  public async resetPassword(userId: string, newPasswordPlain: string, actorUser: UserAccount): Promise<void> {
    const user = await this.getUserAccountById(userId);
    if (!user) throw new Error("المستخدم غير موجود");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPasswordPlain, salt);
    await this.db.execute(
      `UPDATE users
       SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ?
       WHERE id = ?;`,
      [passwordHash, new Date().toISOString(), userId]
    );

    // Revoke previous sessions
    await this.db.execute(`UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?;`, [userId]);

    await this.logSecurityEvent({
      userId: actorUser.id,
      username: actorUser.username,
      action: "إعادة ضبط كلمة المرور",
      targetType: "USER",
      targetId: userId,
      status: "SUCCESS",
      details: `تم تعيين كلمة مرور جديدة للموظف: ${user.name}`
    });
  }

  // Delete User
  public async deleteUser(userId: string, actorUser: UserAccount): Promise<void> {
    const user = await this.getUserAccountById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (user.id === actorUser.id) throw new Error("لا يمكن حذف الحساب النشط حالياً");

    await this.db.execute(`DELETE FROM users WHERE id = ?;`, [userId]);

    await this.logSecurityEvent({
      userId: actorUser.id,
      username: actorUser.username,
      action: "حذف حساب موظف",
      targetType: "USER",
      targetId: userId,
      status: "SUCCESS",
      details: `تم حذف الحساب نهائياً: ${user.name} (${user.username})`
    });
  }

  // Get Roles and Permissions
  public async getRoles(): Promise<RoleDefinition[]> {
    const roles = await this.db.query<any>(`SELECT * FROM roles ORDER BY is_system DESC, id ASC;`);
    const result: RoleDefinition[] = [];

    for (const r of roles) {
      const perms = await this.db.query<{ permission_id: PermissionId }>(
        `SELECT permission_id FROM role_permissions WHERE role_id = ?;`,
        [r.id]
      );
      result.push({
        id: r.id as VaultRole,
        nameAr: r.name_ar,
        nameEn: r.name_en,
        description: r.description,
        isSystem: Boolean(r.is_system),
        badgeColor: r.badge_color,
        permissions: perms.map((p) => p.permission_id)
      });
    }

    return result;
  }

  // Update Role Permissions
  public async updateRolePermissions(
    roleId: VaultRole,
    permissionIds: PermissionId[],
    actorUser: UserAccount
  ): Promise<RoleDefinition> {
    // Cannot modify CHIEF_CUSTODIAN permissions
    if (roleId === "CHIEF_CUSTODIAN") {
      throw new Error("لا يمكن تعديل صلاحيات أمين الخزينة السيادية (دائماً كامل الصلاحيات)");
    }

    await this.db.execute(`DELETE FROM role_permissions WHERE role_id = ?;`, [roleId]);

    for (const pId of permissionIds) {
      await this.db.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?);`,
        [roleId, pId]
      );
    }

    await this.logSecurityEvent({
      userId: actorUser.id,
      username: actorUser.username,
      action: "تحديث مصفوفة صلاحيات الدور",
      targetType: "ROLE",
      targetId: roleId,
      status: "SUCCESS",
      details: `تم تحديث صلاحيات الرتبة [${roleId}] إلى (${permissionIds.length}) صلاحية معتمدة`
    });

    const roles = await this.getRoles();
    return roles.find((r) => r.id === roleId)!;
  }

  // Get Security Audit Logs
  public async getAuditLogs(limit: number = 100): Promise<SecurityAuditLogEntry[]> {
    const rows = await this.db.query<any>(
      `SELECT * FROM security_audit_logs ORDER BY created_at DESC LIMIT ?;`,
      [limit]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id || undefined,
      ipAddress: r.ip_address,
      status: r.status,
      details: r.details,
      createdAt: r.created_at
    }));
  }
}
