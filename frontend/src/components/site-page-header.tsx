"use client";

import { ReactNode } from "react";

// 홈페이지 쪽 화면들의 공통 상단 레이아웃입니다.
// 위에서부터 "브레드크럼(현재 위치) → 가로줄 → 페이지 제목(+선택적 버튼)" 순서로 보여줍니다.
export default function SitePageHeader({
  crumbs,
  title,
  action,
}: {
  crumbs: string[];
  title: string;
  action?: ReactNode; // 제목과 같은 줄, 오른쪽 끝에 보여줄 버튼 등 (예: "목록으로" 버튼)
}) {
  return (
    <div className="mb-4">
      <div className="text-xs text-neutral-400">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-1.5">›</span>}
            {c}
          </span>
        ))}
      </div>
      <hr className="mb-3 mt-2 border-neutral-200" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-left text-lg font-bold">{title}</h1>
        {action}
      </div>
    </div>
  );
}