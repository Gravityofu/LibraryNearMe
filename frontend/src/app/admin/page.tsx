"use client";

import { useI18n } from "@/components/language-provider";

export default function AdminDashboardPage() {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <p className="text-sm text-neutral-400">{t("admin.dashboard.wip")}</p>
    </div>
  );
}