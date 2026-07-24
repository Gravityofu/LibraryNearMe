"use client";

import Link from "next/link";
import { useI18n } from "@/components/language-provider";

export default function AdminBackButton({ href }: { href: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
    >
      ← {t("admin.backButton")}
    </Link>
  );
}