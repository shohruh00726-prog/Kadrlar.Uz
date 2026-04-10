"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type SessionUser = {
  id: string;
  userType: string;
  fullName: string;
  email: string;
  city?: string;
  profilePhotoUrl?: string | null;
  theme?: "light" | "dark" | "system";
  isVerified?: boolean;
  onboardingEmployeeCompleted?: boolean;
  onboardingEmployerCompleted?: boolean;
  employeeProfile?: Record<string, unknown> | null;
  employerProfile?: Record<string, unknown> | null;
  teamMemberships?: Record<string, unknown>[];
  [key: string]: unknown;
};

type SessionState = {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  user: null,
  isLoading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const j = await r.json();
      setUser((j.user as SessionUser) ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, isLoading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
