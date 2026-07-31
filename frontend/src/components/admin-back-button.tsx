"use client";

import Link from "next/link";
import { useI18n } from "@/components/language-provider";

type Props = {
  href?: string;
  onClick?: () => void;
};

export default function AdminBackButton({ href, onClick }: Props) {
  const { t } = useI18n();
  const className =
    "inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50";

  // onClick이 주어지면(같은 화면 안에서 이전 단계로 돌아가는 경우) 버튼으로,
  // href만 주어지면(다른 화면으로 이동하는 경우) 기존처럼 링크로 동작합니다.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        ← {t("admin.backButton")}
      </button>
    );
  }

  return (
    <Link href={href || "#"} className={className}>
      ← {t("admin.backButton")}
    </Link>
  );
}