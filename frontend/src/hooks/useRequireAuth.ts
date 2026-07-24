"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { notify } = useNotify();
  const { t } = useI18n();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      notify("❌ " + t("auth.loginRequired"), "error");
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}