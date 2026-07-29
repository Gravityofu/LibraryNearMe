"use client";

import { useRef, useState } from "react";
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
  loginId: string | null;
  memberType: { id: number; name: string } | null;
};

type HistoryItem = {
  id: number;
  registrationNo: string;
  ok: boolean;
  message: string;
  memberName?: string;
  materialTitle?: string;
  dueDate?: string;
};

export default function AdminLoansPage() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [registrationNo, setRegistrationNo] = useState("");
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 등록번호가 아무리 빠르게 여러 번 들어와도, 이전 처리가 끝난 뒤 순서대로 하나씩 처리되도록
  // 여기(큐)에 작업을 이어붙입니다.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  async function handleSearchMember() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    const res = await fetch(`${API_URL}/loans/members?keyword=${encodeURIComponent(keyword.trim())}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setResults(await res.json());
    }
  }

  function selectMember(member: Member) {
    setSelectedMember(member);
    setResults([]);
    setKeyword("");
  }

  function changeMember() {
    setSelectedMember(null);
    setResults([]);
    setKeyword("");
    setRegistrationNo("");
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
        body: JSON.stringify({ userId: selectedMember.id, registrationNo: regNo }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setHistory((prev) => [
          {
            id: data.id,
            registrationNo: data.registrationNo,
            ok: true,
            message: t("loans.success"),
            memberName: data.memberName,
            materialTitle: data.materialTitle,
            dueDate: data.dueDate,
          },
          ...prev,
        ]);
      } else {
        setHistory((prev) => [
          {
            id: Date.now(),
            registrationNo: regNo,
            ok: false,
            message: data?.message || t("loans.processing"),
          },
          ...prev,
        ]);
        notify("❌ " + (data?.message || regNo), "error");
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

  return (
    <div className="p-6">
      <Tabs defaultValue="checkout">
        <TabsList className="gap-2">
          <TabsTrigger value="checkout">{t("loans.tabs.checkout")}</TabsTrigger>
          <TabsTrigger value="return">{t("loans.tabs.return")}</TabsTrigger>
        </TabsList>

        <TabsContent value="checkout" className="mt-4">
          <div className="flex max-w-xl flex-col gap-6">
            {!selectedMember ? (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold">{t("loans.member.searchLabel")}</p>
                <div className="flex gap-2">
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchMember()}
                    placeholder={t("loans.member.searchPlaceholder")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <ThemedButton preset="버튼1" onClick={handleSearchMember}>
                    {t("loans.member.searchBtn")}
                  </ThemedButton>
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  {results.length === 0 && keyword.trim() !== "" && (
                    <p className="text-sm text-neutral-400">{t("loans.member.noResults")}</p>
                  )}
                  {results.length === 0 && keyword.trim() === "" && (
                    <p className="text-sm text-neutral-400">{t("loans.member.selectHint")}</p>
                  )}
                  {results.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMember(m)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-neutral-500">
                        {m.memberType?.name ?? "-"} · {m.phone ?? "-"} · {m.memberNo ?? "-"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selectedMember.name}</p>
                    <p className="text-xs text-neutral-500">
                      {selectedMember.memberType?.name ?? "-"} · {selectedMember.phone ?? "-"} ·{" "}
                      {selectedMember.memberNo ?? "-"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={changeMember}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("loans.member.changeBtn")}
                  </button>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("loans.registrationNo.label")}</span>
                  <input
                    autoFocus
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRegistrationSubmit()}
                    placeholder={t("loans.registrationNo.placeholder")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                {processing && <p className="mt-2 text-xs text-neutral-400">{t("loans.processing")}</p>}
              </div>
            )}

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold">{t("loans.history.title")}</p>
              {history.length === 0 && <p className="text-sm text-neutral-400">{t("loans.history.empty")}</p>}
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      h.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="font-medium">
                      {h.registrationNo} — {h.ok ? "✅" : "❌"} {h.message}
                    </p>
                    {h.ok && (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {h.memberName} · {h.materialTitle} · {t("loans.dueDateLabel")}:{" "}
                        {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : "-"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="return" className="mt-4">
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
            {t("loans.return.comingSoon")}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}