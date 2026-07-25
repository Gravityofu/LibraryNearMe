"use client";

import { useEffect, useRef, useState } from "react";

// 년/월/일을 각각 문자열로 담습니다. (예: {year:"1990", month:"03", day:"05"})
export type BirthDateValue = {
  year: string;
  month: string;
  day: string;
};

type Props = {
  value: BirthDateValue;
  onChange: (value: BirthDateValue) => void;
};

// 전화기 숫자패드처럼 1~9, 그리고 마지막 줄에 0과 지우기(⌫) 버튼이 있는 배열입니다.
const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1); // 1~31

export function BirthDateField({ value, onChange }: Props) {
  // 지금 열려있는 패널이 무엇인지 기억합니다. (년/월/일 중 하나, 또는 아무것도 안 열림)
  const [open, setOpen] = useState<"year" | "month" | "day" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 이 컴포넌트 바깥을 클릭하면 열려있던 패널을 닫습니다.
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 숫자패드에서 숫자를 누르면 년도 칸 뒤에 이어붙입니다. 4자리가 다 차면 패널을 닫습니다.
  function pressYearDigit(digit: string) {
    const next = (value.year + digit).slice(0, 4);
    onChange({ ...value, year: next });
    if (next.length === 4) setOpen(null);
  }

  // 지우기(⌫) 버튼: 년도 칸의 마지막 글자 하나를 지웁니다.
  function pressYearBackspace() {
    onChange({ ...value, year: value.year.slice(0, -1) });
  }

  function pickMonth(m: number) {
    onChange({ ...value, month: String(m).padStart(2, "0") });
    setOpen(null);
  }

  function pickDay(d: number) {
    onChange({ ...value, day: String(d).padStart(2, "0") });
    setOpen(null);
  }

  return (
    <div ref={wrapRef} className="flex items-center gap-1.5">
      {/* 년도 */}
      <div className="relative">
        <input
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          onFocus={() => setOpen("year")}
          placeholder="YYYY"
          inputMode="numeric"
          maxLength={4}
          className="w-20 rounded-lg border px-3 py-2 text-center text-sm"
        />

        {open === "year" && (
          <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-lg border bg-white p-2 shadow-lg">
            {KEYPAD_ROWS.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-1">
                {row.map((digit, j) =>
                  digit === "" ? (
                    <span key={j} />
                  ) : (
                    <button
                      key={j}
                      type="button"
                      onClick={() => (digit === "⌫" ? pressYearBackspace() : pressYearDigit(digit))}
                      className="cursor-pointer rounded-md border py-1.5 text-sm hover:bg-neutral-100"
                    >
                      {digit}
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
        )}

      </div>
      <span className="text-sm text-neutral-400">년</span>

      {/* 월 */}
      <div className="relative">
        <input
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value.replace(/\D/g, "").slice(0, 2) })}
          onFocus={() => setOpen("month")}
          placeholder="MM"
          inputMode="numeric"
          maxLength={2}
          className="w-14 rounded-lg border px-3 py-2 text-center text-sm"
        />
        {open === "month" && (
          <div className="absolute left-0 top-full z-20 mt-1 grid w-48 grid-cols-4 gap-1 rounded-lg border bg-white p-2 shadow-lg">
            {MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMonth(m)}
                className="cursor-pointer rounded-md border py-1.5 text-sm hover:bg-neutral-100"
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="text-sm text-neutral-400">월</span>

      {/* 일 */}
      <div className="relative">
        <input
          value={value.day}
          onChange={(e) => onChange({ ...value, day: e.target.value.replace(/\D/g, "").slice(0, 2) })}
          onFocus={() => setOpen("day")}
          placeholder="DD"
          inputMode="numeric"
          maxLength={2}
          className="w-14 rounded-lg border px-3 py-2 text-center text-sm"
        />
        {open === "day" && (
          <div className="absolute left-0 top-full z-20 mt-1 grid max-h-48 w-56 grid-cols-6 gap-1 overflow-auto rounded-lg border bg-white p-2 shadow-lg">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pickDay(d)}
                className="cursor-pointer rounded-md border py-1.5 text-sm hover:bg-neutral-100"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="text-sm text-neutral-400">일</span>
    </div>
  );
}

// 진짜 존재하는 날짜인지 확인합니다. (13월, 32일, 2월 30일 같은 건 걸러냅니다.)
export function isValidBirthDate(year: string, month: string, day: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const currentYear = new Date().getFullYear();

  if (!year || !month || !day) return false;
  if (year.length !== 4) return false;
  if (y < 1900 || y > currentYear) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // 예를 들어 2월 30일처럼 달력에 없는 날짜를 만들면, JS가 자동으로 3월로
  // 넘겨버리는데(3/2), 이렇게 "만든 날짜"와 "우리가 입력한 값"이 다르면 가짜 날짜인 거예요.
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}