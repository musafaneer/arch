import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  DatabaseConfigInfo,
  PermissionId,
  SecurityClassification,
  UserAccount,
  VaultUser
} from "../types";

interface AuthContextType {
  currentUser: UserAccount | null;
  token: string | null;
  databaseStats: DatabaseConfigInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: PermissionId) => boolean;
  hasClearance: (requiredClearance: SecurityClassification) => boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  quickSwitchUser: (username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshDatabaseStats: () => Promise<void>;
  switchDatabaseEngine: (
    engine: "sqlite" | "postgresql",
    postgresConfig?: any
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLEARANCE_HIERARCHY: Record<SecurityClassification, number> = {
  "عام": 1,
  "محدود": 2,
  "سري": 3,
  "سري ومحدود": 4,
  "سري للغاية": 5
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("mof_auth_token"));
  const [databaseStats, setDatabaseStats] = useState<DatabaseConfigInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user and database stats
  const fetchSession = useCallback(async (authToken?: string | null) => {
    try {
      const activeToken = authToken !== undefined ? authToken : token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const res = await fetch("/api/auth/me", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
        if (data.dbStats) {
          setDatabaseStats(data.dbStats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch database status
  const refreshDatabaseStats = useCallback(async () => {
    try {
      const res = await fetch("/api/database/status");
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setDatabaseStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch db status:", err);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Permission Check
  const hasPermission = useCallback((permission: PermissionId): boolean => {
    if (!currentUser) return false;
    // Super Admin / Chief Custodian bypasses restrictions
    if (currentUser.role === "CHIEF_CUSTODIAN") return true;
    return currentUser.permissions?.includes(permission) ?? false;
  }, [currentUser]);

  // Clearance Check
  const hasClearance = useCallback((requiredClearance: SecurityClassification): boolean => {
    if (!currentUser) return false;
    const userRank = CLEARANCE_HIERARCHY[currentUser.clearanceLevel] || 1;
    const reqRank = CLEARANCE_HIERARCHY[requiredClearance] || 1;
    return userRank >= reqRank;
  }, [currentUser]);

  // Primary Login
  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "فشل تسجيل الدخول" };
      }

      localStorage.setItem("mof_auth_token", data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      await refreshDatabaseStats();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ في الاتصال بالخادم" };
    }
  };

  // Quick Switch between Institutional Profiles (Demo/Field Testing)
  const quickSwitchUser = async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/quick-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "فشل تبديل الحساب" };
      }

      localStorage.setItem("mof_auth_token", data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      await refreshDatabaseStats();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ أثناء تبديل الحساب" };
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("mof_auth_token");
      setToken(null);
      // Fallback to default chief custodian
      await fetchSession(null);
    }
  };

  // Switch Database Engine (SQLite or PostgreSQL)
  const switchDatabaseEngine = async (
    engine: "sqlite" | "postgresql",
    postgresConfig?: any
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/database/switch", {
        method: "POST",
        headers,
        body: JSON.stringify({ engine, postgresConfig })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "فشل تبديل محرك قاعدة البيانات" };
      }

      if (data.stats) {
        setDatabaseStats(data.stats);
      }
      await fetchSession();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "خطأ أثناء الاتصال بالخادم" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        databaseStats,
        isLoading,
        isAuthenticated: Boolean(token && currentUser),
        hasPermission,
        hasClearance,
        login,
        quickSwitchUser,
        logout,
        refreshUser: () => fetchSession(),
        refreshDatabaseStats,
        switchDatabaseEngine
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
