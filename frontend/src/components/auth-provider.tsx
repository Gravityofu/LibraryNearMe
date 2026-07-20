"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AuthState = {
  token: string | null;
  userName: string | null;
  role: string | null;
};

const AuthContext = createContext<
  (AuthState & {
    isLoggedIn: boolean;
    login: (d: { token: string; userName: string; role: string }) => void;
    logout: () => void;
  }) | null
>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    userName: null,
    role: null,
  });

  // 새로고침해도 로그인 유지: 서랍에 저장된 값을 불러옵니다.
  useEffect(() => {
    setState({
      token: localStorage.getItem("token"),
      userName: localStorage.getItem("userName"),
      role: localStorage.getItem("role"),
    });
  }, []);

  function login(d: { token: string; userName: string; role: string }) {
    localStorage.setItem("token", d.token);
    localStorage.setItem("userName", d.userName);
    localStorage.setItem("role", d.role);
    setState({ token: d.token, userName: d.userName, role: d.role });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    setState({ token: null, userName: null, role: null });
  }

  return (
    <AuthContext.Provider value={{ ...state, isLoggedIn: !!state.token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider 안에서 사용하세요.");
  return ctx;
}