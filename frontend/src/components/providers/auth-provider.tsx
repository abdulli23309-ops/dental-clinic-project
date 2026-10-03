"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, login as apiLogin, logout as apiLogout, refreshAuthToken, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt session restoration on mount via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const data = await refreshAuthToken();
        if (!isMounted) return;
        setAccessToken(data.accessToken);

        const profile = await getMe(data.accessToken);
        if (!isMounted) return;
        setUser(profile);
      } catch {
        // No active session or cookie expired
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    if (data.user.role === "admin") {
      router.push("/admin");
    }
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  };

  const refresh = async (): Promise<string | null> => {
    try {
      const data = await refreshAuthToken();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
