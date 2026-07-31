"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Member = {
  id: number;
  name: string;
  phone: string | null;
  memberNo: string | null;
  status: string;
  birthDate: string | null;
  email: string | null;
  address: string | null;
  memberType: { id: number; name: string } | null;
};

// 서버에서 내려오는 대출제한 기록 1건의 모양입니다.
type RestrictionRecord = {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
};

// 서버에서 내려오는 대출 기록 1건의 모양 (실물 정보와 서지 정보를 포함해서 옵니다)
type LoanRecord = {
  id: number;
  loanDate: string;
  dueDate: string;
  renewCount: number;
  copy: {
    registrationNo: string;
    callNumber: string | null;
    volume: string | null;
    copyNumber: string | null;
    status: string;
    material: { title: string };
  };
};

const EMPTY_DETAIL_FORM = { name: "", memberNo: "", phone: "", loginId: "", email: "", address: "" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// 사용자가 입력한 글자에서 숫자만 뽑아, "YYYY-MM-DD" 형태로 하이픈을 자동으로 넣어줍니다.
// 예: "20140212" -> "2014-02-12", "202402" -> "2024-02"
function formatDateInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

// "YYYY-MM-DD" 형식이면서, 실제로 존재하는 날짜인지 확인합니다.
// (예: "2122-13-32"는 형식은 비슷해 보여도 13월, 32일이 없으므로 false를 돌려줍니다.)
function isValidDateStr(str: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// 회원 상태에 따라 글자 색을 다르게 보여주기 위한 도우미 함수입니다.
function statusColorClass(status: string | undefined) {
  switch (status) {
    case "ACTIVE":
      return "text-blue-600";
    case "PENDING":
      return "text-yellow-600";
    case "SUSPENDED":
      return "text-orange-600";
    case "WITHDRAWN":
      return "text-red-600";
    default:
      return "";
  }
}

// 회원 정보 박스 안에서 "라벨: 값" 한 줄을 보여주는 작은 부품입니다.
// valueClassName을 넘기면 값 글자에 추가로 스타일(예: 색상)을 입힐 수 있습니다.
function InfoRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-1.5 text-sm last:border-b-0">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className={`text-right font-medium ${valueClassName || ""}`}>{value}</span>
    </div>
  );
}

export default function AdminLoansPage() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [showDetailSearchModal, setShowDetailSearchModal] = useState(false);
  const [detailForm, setDetailForm] = useState(EMPTY_DETAIL_FORM);

  const [loanDateStr, setLoanDateStr] = useState(todayStr());

  const [registrationNo, setRegistrationNo] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loanedItems, setLoanedItems] = useState<LoanRecord[]>([]);
  const [restrictions, setRestrictions] = useState<RestrictionRecord[]>([]);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  // 등록번호가 아무리 빠르게 여러 번 들어와도, 이전 처리가 끝난 뒤 순서대로 하나씩 처리되도록
  // 여기(큐)에 작업을 이어붙입니다.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  // 회원이 선택되면 이 입력폼으로 커서를 옮기기 위해 사용합니다.
  const registrationInputRef = useRef<HTMLInputElement>(null);

  // '초기화'를 눌렀을 때 이 입력폼으로 커서를 옮기기 위해 사용합니다.
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // 마지막으로 정상적으로 입력되었던 대출일을 기억해둡니다. (잘못된 값을 입력했을 때 되돌리기 위함입니다.)
  const lastValidLoanDateRef = useRef(todayStr());
  const [showDateFormatError, setShowDateFormatError] = useState(false);

  // 대출 처리에 실패했을 때, 그 이유를 모달로 보여주기 위해 사용합니다.
  const [loanErrorMessage, setLoanErrorMessage] = useState<string | null>(null);

  // 화면에는 보이지 않지만, '대출/반납일 변경' 버튼을 누르면 이 입력 칸의 달력 팝업을 열어줍니다.
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // '대출/반납일 변경' 버튼을 눌렀을 때 호출됩니다. 보이지 않는 달력 입력 칸의 달력 팝업을 엽니다.
  function openDatePicker() {
    const el = hiddenDateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      // showPicker를 지원하지 않는 구형 브라우저를 위한 대안입니다.
      el.focus();
      el.click();
    }
  }

  // 선택된 회원이 지금 대출 중인 자료 목록을 새로 불러옵니다.
  async function loadLoanedItems(memberId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loans/members/${memberId}/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setLoanedItems(await res.json());
    }
  }

  // 선택된 회원의 대출제한 이력 전체를 새로 불러옵니다. (최신순)
  async function loadRestrictions(memberId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-restrictions/${memberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRestrictions(await res.json());
    }
  }

  // 선택된 회원이 바뀔 때마다 대출 자료 목록과 정지 이력을 새로 불러오고, 등록번호 입력폼으로 커서를 옮깁니다.
  useEffect(() => {
    if (selectedMember) {
      loadLoanedItems(selectedMember.id);
      loadRestrictions(selectedMember.id);
      registrationInputRef.current?.focus();
    } else {
      setLoanedItems([]);
      setRestrictions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember?.id]);

  async function handleSearchMember() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!keyword.trim()) return;

    const res = await fetch(`${API_URL}/loans/members?keyword=${encodeURIComponent(keyword.trim())}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const data: Member[] = await res.json();
    if (data.length === 1) {
      selectMember(data[0]);
    } else {
      setResults(data);
      setShowSearchModal(true);
    }
  }

  // 상세 검색 모달에서 '검색'을 눌렀을 때 호출됩니다.
  async function handleDetailSearch() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const params = new URLSearchParams();
    Object.entries(detailForm).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });

    const res = await fetch(`${API_URL}/loans/members/search-detail?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const data: Member[] = await res.json();
    setShowDetailSearchModal(false);
    setDetailForm(EMPTY_DETAIL_FORM);

    if (data.length === 1) {
      selectMember(data[0]);
    } else {
      setResults(data);
      setShowSearchModal(true);
    }
  }

  function selectMember(member: Member) {
    setSelectedMember(member);
    setResults([]);
    setKeyword("");
    setShowSearchModal(false);
  }

  function resetAll() {
    setSelectedMember(null);
    setResults([]);
    setKeyword("");
    setRegistrationNo("");
    setShowSearchModal(false);
    setLoanedItems([]);
    setRestrictions([]);
    setShowRestrictionModal(false);
    setLoanDateStr(todayStr());
    lastValidLoanDateRef.current = todayStr();
    setShowDatePicker(false);
    keywordInputRef.current?.focus();
  }

  // 대출일 입력 칸에서 포커스가 빠져나갈 때(다른 곳을 클릭했을 때) 호출됩니다.
  // 값이 올바른 날짜면 "마지막 정상 날짜"로 기억해두고, 아니라면 알림창을 띄우고 값을 되돌립니다.
  function handleLoanDateBlur() {
    if (isValidDateStr(loanDateStr)) {
      lastValidLoanDateRef.current = loanDateStr;
    } else {
      setLoanDateStr(lastValidLoanDateRef.current);
      setShowDateFormatError(true);
    }
  }

  // 실제로 서버에 대출 요청을 보내는 부분입니다. 큐에서 하나씩 순서대로 호출됩니다.
  async function processOne(regNo: string) {
    if (!selectedMember) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedMember.id, registrationNo: regNo, loanDate: loanDateStr }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        notify("✅ " + t("loans.success"), "success");
        await loadLoanedItems(selectedMember.id);
      } else {
        setLoanErrorMessage(data?.message || regNo);
      }
    } finally {
      setProcessing(false);
    }
  }

  // 등록번호 입력창에서 Enter를 누르면 호출됩니다. 큐 맨 뒤에 이번 작업을 이어붙입니다.
  function handleRegistrationSubmit() {
    const regNo = registrationNo.trim();
    if (!regNo) return;
    setRegistrationNo("");
    queueRef.current = queueRef.current.then(() => processOne(regNo));
  }

  // 정지 이력 중에서 "지금 아직 끝나지 않은" 것이 있으면 그것을 씁니다. (상태 값 아래에 작게 보여주기 위함)
  const activeRestriction = restrictions.find((r) => new Date(r.endDate) >= new Date()) || null;

  return (
    <div className="p-6">
      <Tabs defaultValue="checkout">
        <TabsList className="gap-2">
          <TabsTrigger value="checkout">{t("loans.tabs.checkout")}</TabsTrigger>
          <TabsTrigger value="return">{t("loans.tabs.return")}</TabsTrigger>
        </TabsList>

        <TabsContent value="checkout" className="mt-4">
          {/* 상단: 상세 검색 + 대출일 변경 */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setShowDetailSearchModal(true)}
              className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              {t("loans.detailSearch.btn")}
            </button>

            <div className="flex items-stretch rounded-lg border border-neutral-300">
              <button
                type="button"
                onClick={openDatePicker}
                className="cursor-pointer rounded-l-lg border-r border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200"
              >
                {t("loans.dateOverride.btn")}
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={loanDateStr}
                  onChange={(e) => setLoanDateStr(formatDateInput(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  onBlur={handleLoanDateBlur}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  placeholder={t("loans.dateOverride.placeholder")}
                  className="h-full w-32 rounded-r-lg border-0 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                />
                {/* 화면에는 보이지 않는 달력 입력 칸입니다. 버튼을 누르면 이 칸의 달력 팝업만 뜹니다. */}
                <input
                  ref={hiddenDateInputRef}
                  type="date"
                  value={loanDateStr}
                  onChange={(e) => {
                    const next = e.target.value || todayStr();
                    setLoanDateStr(next);
                    lastValidLoanDateRef.current = next;
                  }}
                  tabIndex={-1}
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                />
              </div>
            </div>

          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-10">
            {/* 왼쪽: 회원 검색 + 등록번호 입력 (전체 가로폭의 4/10) */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4 md:col-span-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{t("loans.member.searchLabel")}</p>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("loans.member.changeBtn")}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={keywordInputRef}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchMember()}
                  placeholder={t("loans.member.searchPlaceholder")}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
                <ThemedButton preset="버튼1" onClick={handleSearchMember} className="shrink-0 whitespace-nowrap">
                  {t("loans.member.searchBtn")}
                </ThemedButton>
              </div>

              {selectedMember && (
                <div className="mt-4">
                  <span className="mb-1 block text-sm text-neutral-500">{t("loans.registrationNo.label")}</span>
                  <input
                    ref={registrationInputRef}
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRegistrationSubmit()}
                    placeholder={t("loans.registrationNo.placeholder")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  {processing && <p className="mt-2 text-xs text-neutral-400">{t("loans.processing")}</p>}
                </div>
              )}
            </div>

            {/* 오른쪽: 회원 정보 (항목 이름은 항상 보이고, 값만 채워지거나 "-"로 보입니다) (전체 가로폭의 6/10) */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4 md:col-span-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{t("loans.member.info.title")}</p>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => setShowRestrictionModal(true)}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("loans.member.restrictionHistoryBtn")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <div className="flex flex-col">
                  <InfoRow label={t("members.form.field.name")} value={selectedMember?.name || "-"} />
                  <InfoRow label={t("members.form.field.memberNo")} value={selectedMember?.memberNo || "-"} />
                  <InfoRow label={t("members.form.field.phone")} value={selectedMember?.phone || "-"} />
                  <InfoRow
                    label={t("members.form.field.status")}
                    value={selectedMember ? t(`members.status.${selectedMember.status}`) : "-"}
                    valueClassName={statusColorClass(selectedMember?.status)}
                  />
                  {activeRestriction && (
                    <p className="pb-1.5 text-right text-xs text-orange-600">
                      {t("loans.restriction.badge.until")}
                      {activeRestriction.endDate.slice(0, 10)}
                      {t("loans.restriction.badge.reason")}
                      {activeRestriction.reason || "-"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col">
                  <InfoRow
                    label={t("members.form.field.memberType")}
                    value={selectedMember?.memberType?.name || "-"}
                  />
                  <InfoRow
                    label={t("members.form.field.birthDate")}
                    value={selectedMember?.birthDate ? selectedMember.birthDate.slice(0, 10) : "-"}
                  />
                  <InfoRow label={t("members.form.field.email")} value={selectedMember?.email || "-"} />
                  <InfoRow label={t("members.form.field.address")} value={selectedMember?.address || "-"} />
                </div>
              </div>
            </div>

            {/* 아래: 대출 자료 목록 (두 박스를 합한 가로 길이, 연한 파란색 배경) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 md:col-span-10">
              <p className="mb-2 text-sm font-semibold">{t("loans.history.title")}</p>
              {loanedItems.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("loans.history.empty")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-blue-100 bg-white">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">{t("loans.list.col.no")}</th>
                        <th className="px-3 py-2">{t("materials.copies.regNo")}</th>
                        <th className="px-3 py-2">{t("loans.list.col.title")}</th>
                        <th className="px-3 py-2">{t("materials.copies.callNumber")}</th>
                        <th className="px-3 py-2">{t("materials.copies.volume")}</th>
                        <th className="px-3 py-2">{t("materials.copies.copyNumber")}</th>
                        <th className="px-3 py-2">{t("loans.list.col.loanDate")}</th>
                        <th className="px-3 py-2">{t("loans.dueDateLabel")}</th>
                        <th className="px-3 py-2">{t("loans.list.col.copyStatus")}</th>
                        <th className="px-3 py-2">{t("loans.list.col.renewCount")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {loanedItems.map((item, i) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap px-3 py-2">{i + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2">{item.copy.registrationNo}</td>
                          <td className="whitespace-nowrap px-3 py-2">{item.copy.material.title}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.copy.callNumber || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.copy.volume || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.copy.copyNumber || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                            {new Date(item.loanDate).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                            {new Date(item.dueDate).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.copy.status}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.renewCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="return" className="mt-4">
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
            {t("loans.return.comingSoon")}
          </p>
        </TabsContent>
      </Tabs>

      {/* 회원 검색 결과 모달 */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{t("loans.member.searchModalTitle")}</p>

            {results.length === 0 ? (
              <p className="text-sm text-neutral-400">{t("loans.member.noResults")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMember(m)}
                    className="grid cursor-pointer grid-cols-[1fr_92px_130px_60px] items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="truncate text-neutral-500">{m.memberNo ?? "-"}</span>
                    <span className="truncate text-neutral-500">{m.phone ?? "-"}</span>
                    <span className={`truncate text-xs font-semibold ${statusColorClass(m.status)}`}>
                      {t(`members.status.${m.status}`)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSearchModal(false)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 정지 이력 모달 */}
      {showRestrictionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRestrictionModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{t("loans.restrictionHistory.modalTitle")}</p>

            {restrictions.length === 0 ? (
              <p className="text-sm text-neutral-400">{t("loans.restrictionHistory.empty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-100 text-neutral-500">
                    <tr>
                      <th className="px-3 py-2">{t("loans.restrictionHistory.col.startDate")}</th>
                      <th className="px-3 py-2">{t("loans.restrictionHistory.col.endDate")}</th>
                      <th className="px-3 py-2">{t("loans.restrictionHistory.col.reason")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {restrictions.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-3 py-2">{r.startDate.slice(0, 10)}</td>
                        <td className="whitespace-nowrap px-3 py-2">{r.endDate.slice(0, 10)}</td>
                        <td className="px-3 py-2">{r.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowRestrictionModal(false)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 상세 검색 모달 */}
      {showDetailSearchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetailSearchModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{t("loans.detailSearch.modalTitle")}</p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.name")}</span>
                <input
                  value={detailForm.name}
                  onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.memberNo")}</span>
                <input
                  value={detailForm.memberNo}
                  onChange={(e) => setDetailForm({ ...detailForm, memberNo: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.phone")}</span>
                <input
                  value={detailForm.phone}
                  onChange={(e) => setDetailForm({ ...detailForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.loginId")}</span>
                <input
                  value={detailForm.loginId}
                  onChange={(e) => setDetailForm({ ...detailForm, loginId: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.email")}</span>
                <input
                  value={detailForm.email}
                  onChange={(e) => setDetailForm({ ...detailForm, email: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.address")}</span>
                <input
                  value={detailForm.address}
                  onChange={(e) => setDetailForm({ ...detailForm, address: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <ThemedButton preset="버튼1" onClick={handleDetailSearch} className="mt-4 w-full">
              {t("loans.member.searchBtn")}
            </ThemedButton>
            <button
              type="button"
              onClick={() => setShowDetailSearchModal(false)}
              className="mt-2 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 대출일 형식 오류 알림 모달 */}
      {showDateFormatError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDateFormatError(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{t("loans.dateOverride.invalidTitle")}</p>
            <p className="text-sm text-neutral-600">{t("loans.dateOverride.invalidMessage")}</p>
            <button
              type="button"
              onClick={() => setShowDateFormatError(false)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 대출 실패 안내 모달 (정지 회원, 대출 한도 초과 등 서버가 알려주는 이유를 그대로 보여줍니다) */}
      {loanErrorMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setLoanErrorMessage(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-red-600">{t("loans.error.title")}</p>
            <p className="text-sm text-neutral-600">{loanErrorMessage}</p>
            <button
              type="button"
              onClick={() => setLoanErrorMessage(null)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}
    </div>

  );
}