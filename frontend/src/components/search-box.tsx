"use client";

import { useState } from "react";

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [hint, setHint] = useState("Enter를 누르면 바로 검색됩니다 (검색 버튼 없음)");

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // 실제 검색 연결은 '도서 관리' 단계에서 합니다.
      setHint(q ? `"${q}" 검색은 도서 관리 단계에서 연결됩니다` : "검색어를 입력해 주세요");
    }
  }

  return (
    <div className="mt-5">
      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="검색어를 입력하고 Enter를 누르세요"
          className="h-[54px] w-full rounded-full border border-[#ddd6c9] bg-white pl-12 pr-6 text-[15px] outline-none focus:border-neutral-400"
        />
      </div>
      <p className="mt-2 text-center text-xs text-neutral-400">{hint}</p>
    </div>
  );
}