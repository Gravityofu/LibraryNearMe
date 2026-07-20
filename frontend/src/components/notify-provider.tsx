"use client";

import { createContext, useContext, useState } from "react";

type NotifyType = "success" | "error" | "info";

const NotifyContext = createContext<{
  notify: (message: string, type?: NotifyType) => void;
} | null>(null);

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ message: string; type: NotifyType } | null>(null);

  function notify(message: string, type: NotifyType = "info") {
    setState({ message, type });
  }

  return (
    <NotifyContext.Provider value={{ notify }}>
      {children}

      {/* 알림이 있을 때만 화면 가운데에 팝업을 띄웁니다 */}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setState(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="whitespace-pre-line text-center text-[15px] leading-relaxed text-neutral-800">
              {state.message}
            </p>
            <button
              onClick={() => setState(null)}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("NotifyProvider 안에서 사용하세요.");
  return ctx;
}