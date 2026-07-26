"use client";

import { useI18n } from "@/components/language-provider";

export default function AdminDashboardPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold">{t("admin.menu.dashboard")}</h1>
      <p className="mt-4 text-sm text-neutral-400">{t("admin.dashboard.wip")}</p>
    </div>
  );
}