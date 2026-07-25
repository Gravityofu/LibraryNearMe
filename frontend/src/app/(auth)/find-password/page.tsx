"use client";

import Link from "next/link";
import { useI18n } from "@/components/language-provider";
import AuthPageBox from "@/components/auth-page-box";

export default function FindPasswordPage() {
  const { t } = useI18n();

  return (
    <AuthPageBox title={t("findPassword.title")}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">{t("findPassword.message")}</p>
        <Link href="/login" className="text-center text-sm text-neutral-500 hover:text-neutral-800">
          {t("findPassword.backToLogin")}
        </Link>
      </div>
    </AuthPageBox>
  );
}