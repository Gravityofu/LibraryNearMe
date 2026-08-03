"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemedButton from "@/components/themed-button";
import AdminBackButton from "@/components/admin-back-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type SearchedMember = {
  id: number;
  name: string;
  phone: string | null;
  memberNo: string | null;
  status: string;
  memberType: { id: number; name: string } | null;
};

// '자료 검색' 결과 한 줄(복본 하나)의 모양입니다. reservable/reason은 개선106에서 만든
// 예약 가능 여부 판단 로직이 계산해서 내려줍니다.
type ReservableCopyRow = {
  copyId: number;
  registrationNo: string;
  callNumber: string | null;
  volume: string | null;
  copyNumber: string | null;
  status: string;
  materialId: number;
  materialTitle: string;
  creator: string | null;
  reservable: boolean;
  reason?: string;
};

// 회원의 현재 예약(RESERVED) 한 건의 모양입니다.
type MemberReservation = {
  id: number;
  status: string;
  reservedAt: string;
  holdDueDate: string | null;
  copy: {
    registrationNo: string;
    callNumber: string | null;
    volume: string | null;
    copyNumber: string | null;
    material: { title: string };
  };
};

// 회원 상태에 따라 글자 색을 다르게 보여주기 위한 도우미 함수입니다. (대출/반납 화면과 같은 규칙입니다.)
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

export default function ReservationNewPage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const router = useRouter();

  const [memberKeyword, setMemberKeyword] = useState("");
  const [memberResults, setMemberResults] = useState<SearchedMember[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SearchedMember | null>(null);

  const [materialKeyword, setMaterialKeyword] = useState("");
  const [rows, setRows] = useState<ReservableCopyRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [processingCopyId, setProcessingCopyId] = useState<number | null>(null);

  const [memberReservations, setMemberReservations] = useState<MemberReservation[]>([]);
  const [lastReservationId, setLastReservationId] = useState<number | null>(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completedRow, setCompletedRow] = useState<ReservableCopyRow | null>(null);

  // 이름/회원번호로 회원을 찾습니다. 결과가 1명이면 바로 선택하고, 여러 명이면 목록을 보여줍니다.
  async function handleSearchMember() {
    const token = localStorage.getItem("token");
    if (!token || !memberKeyword.trim()) return;
    const res = await fetch(`${API_URL}/loans/members?keyword=${encodeURIComponent(memberKeyword.trim())}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data: SearchedMember[] = await res.json();
    if (data.length === 1) {
      selectMember(data[0]);
    } else {
      setMemberResults(data);
      setShowMemberModal(true);
    }
  }

  function selectMember(member: SearchedMember) {
    setSelectedMember(member);
    setMemberResults([]);
    setMemberKeyword("");
    setShowMemberModal(false);
    setRows([]);
    setSearched(false);
    setMaterialKeyword("");
    setLastReservationId(null);
    loadMemberReservations(member.id);
  }

  // '초기화'를 눌러 다른 회원으로 다시 시작합니다.
  function changeMember() {
    setSelectedMember(null);
    setRows([]);
    setSearched(false);
    setMaterialKeyword("");
    setMemberReservations([]);
    setLastReservationId(null);
  }

  // 이 회원의 현재 예약(RESERVED) 목록을 불러옵니다. (하단 '이 회원의 예약 목록'에서 씁니다.)
  async function loadMemberReservations(userId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/reservations/members/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMemberReservations(await res.json());
    }
  }

  // 자료명/저자/등록번호로 복본을 검색하고, 각 복본이 이 회원에게 지금 예약 가능한지 함께 받아옵니다.
  async function handleSearchMaterial() {
    if (!selectedMember) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(
      `${API_URL}/reservations/search-copies?userId=${selectedMember.id}&keyword=${encodeURIComponent(materialKeyword.trim())}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setSearched(true);
    if (res.ok) {
      setRows(await res.json());
    } else {
      setRows([]);
    }
  }

  // '예약' 버튼을 눌렀을 때: 실제로 예약을 만들고, 완료 모달을 띄운 뒤, 검색 결과와 예약 목록을 새로고침합니다.
  async function handleReserve(row: ReservableCopyRow) {
    if (!selectedMember) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setProcessingCopyId(row.copyId);
    try {
      const res = await fetch(`${API_URL}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedMember.id, copyId: row.copyId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setCompletedRow(row);
        setShowCompleteModal(true);
        if (data?.id) setLastReservationId(data.id);
        await handleSearchMaterial();
        await loadMemberReservations(selectedMember.id);
      } else {
        notify("❌ " + (data?.message || t("loans.reservationNew.reserveFail")), "error");
      }
    } finally {
      setProcessingCopyId(null);
    }
  }

  // 탭을 누르면 '대출/반납' 화면으로 돌아가면서 그 탭이 선택된 채로 열립니다.
  function goToTab(tab: string) {
    router.push(`/admin/loans?tab=${tab}`);
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t("loans.reservationNew.pageTitle")}</h1>
        <AdminBackButton href="/admin/loans" />
      </div>

      {/* 대출/반납/예약/대출이력 탭: 지금은 '예약'이 선택된 모양으로 고정되어 있습니다. */}
      <div className="mb-4">
        <Tabs value="reservation" onValueChange={goToTab}>
          <TabsList className="gap-2">
            <TabsTrigger value="checkout">{t("loans.tabs.checkout")}</TabsTrigger>
            <TabsTrigger value="return">{t("loans.tabs.return")}</TabsTrigger>
            <TabsTrigger value="reservation">{t("loans.tabs.reservation")}</TabsTrigger>
            <TabsTrigger value="history">{t("loans.tabs.history")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 회원 검색 영역 */}
      <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">{t("loans.reservationNew.member.searchLabel")}</p>
          {selectedMember && (
            <button type="button" onClick={changeMember} className="cursor-pointer rounded border px-2 py-1 text-xs">
              {t("loans.member.changeBtn")}
            </button>
          )}
        </div>

        {!selectedMember ? (
          <div className="flex gap-2">
            <input
              value={memberKeyword}
              onChange={(e) => setMemberKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchMember()}
              placeholder={t("loans.member.searchPlaceholder")}
              className="w-full max-w-sm rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            />
            <ThemedButton preset="버튼1" onClick={handleSearchMember} className="shrink-0 whitespace-nowrap">
              {t("loans.member.searchBtn")}
            </ThemedButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="font-medium">{selectedMember.name}</span>
            <span className="text-neutral-500">{selectedMember.memberNo ?? "-"}</span>
            <span className="text-neutral-500">{selectedMember.memberType?.name ?? "-"}</span>
            <span className={`text-xs font-semibold ${statusColorClass(selectedMember.status)}`}>
              {t(`members.status.${selectedMember.status}`)}
            </span>
          </div>
        )}
      </div>

      {/* 자료 검색 영역: 회원을 고른 뒤에만 보입니다. */}
      {selectedMember && (
        <>
          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold">{t("loans.reservationNew.material.searchLabel")}</p>
            <div className="flex gap-2">
              <input
                value={materialKeyword}
                onChange={(e) => setMaterialKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchMaterial()}
                placeholder={t("loans.reservationNew.material.searchPlaceholder")}
                className="w-full max-w-sm rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              />
              <ThemedButton preset="버튼1" onClick={handleSearchMaterial} className="shrink-0 whitespace-nowrap">
                {t("loans.reservationNew.material.searchBtn")}
              </ThemedButton>
            </div>
          </div>

          <div className="mb-4 max-h-[50vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">{t("loans.reservationNew.col.title")}</th>
                  <th className="px-4 py-2.5">{t("loans.reservationNew.col.creator")}</th>
                  <th className="px-4 py-2.5">{t("loans.reservationNew.col.registrationNo")}</th>
                  <th className="px-4 py-2.5">{t("loans.reservationNew.col.callNumber")}</th>
                  <th className="px-4 py-2.5">{t("loans.reservationNew.col.status")}</th>
                  <th className="px-4 py-2.5">{t("loans.reservationNew.col.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!searched ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                      {t("loans.reservationNew.material.beforeSearch")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                      {t("loans.reservationNew.material.noResults")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.copyId}>
                      <td className="px-4 py-2">{row.materialTitle}</td>
                      <td className="px-4 py-2">{row.creator || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{row.registrationNo}</td>
                      <td className="whitespace-nowrap px-4 py-2">{row.callNumber || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{row.status}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {row.reservable ? (
                          <button
                            type="button"
                            disabled={processingCopyId === row.copyId}
                            onClick={() => handleReserve(row)}
                            className="cursor-pointer rounded-lg bg-[#383838] px-3 py-1.5 text-xs font-semibold text-[#F9F6F0] disabled:opacity-50"
                          >
                            {t("loans.reservationNew.reserveBtn")}
                          </button>
                        ) : (
                          <span
                            title={row.reason}
                            className="inline-block rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-400"
                          >
                            {t("loans.reservationNew.notReservable")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 하단: 이 회원의 예약 목록. 방금 예약한 항목은 옅은 초록색으로 표시되고 맨 위에 옵니다. */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold">{t("loans.reservationNew.memberReservations.title")}</p>
            {memberReservations.length === 0 ? (
              <p className="text-sm text-neutral-400">{t("loans.reservationNew.memberReservations.empty")}</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-neutral-100 text-neutral-500">
                    <tr>
                      <th className="px-3 py-2">{t("loans.reservationNew.col.title")}</th>
                      <th className="px-3 py-2">{t("loans.reservationNew.col.registrationNo")}</th>
                      <th className="px-3 py-2">{t("loans.reservationNew.col.reservedDate")}</th>
                      <th className="px-3 py-2">{t("loans.reservationNew.col.holdDueDate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {[...memberReservations]
                      .sort((a, b) => (a.id === lastReservationId ? -1 : b.id === lastReservationId ? 1 : 0))
                      .map((r) => (
                        <tr key={r.id} className={r.id === lastReservationId ? "bg-green-50" : undefined}>
                          <td className="px-3 py-2">{r.copy.material.title}</td>
                          <td className="whitespace-nowrap px-3 py-2">{r.copy.registrationNo}</td>
                          <td className="whitespace-nowrap px-3 py-2">{r.reservedAt.slice(0, 10)}</td>
                          <td className="whitespace-nowrap px-3 py-2">{r.holdDueDate ? r.holdDueDate.slice(0, 10) : "-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 회원 검색 결과 모달 */}
      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowMemberModal(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-semibold">{t("loans.member.searchModalTitle")}</p>
            {memberResults.length === 0 ? (
              <p className="text-sm text-neutral-400">{t("loans.member.noResults")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {memberResults.map((m) => (
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
              onClick={() => setShowMemberModal(false)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 예약 완료 모달 */}
      {showCompleteModal && completedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCompleteModal(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center text-base font-semibold">{t("loans.reservationNew.complete.title")}</p>
            <div className="space-y-1 rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm">
              <p className="font-medium">{completedRow.materialTitle}</p>
              <p className="text-neutral-500">{completedRow.registrationNo}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
              className="mt-4 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("loans.reservationNew.complete.confirmBtn")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}