"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemedButton from "@/components/themed-button";
import Pagination from "@/components/pagination";
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

// '대출이력' 탭에서 검색하는 조건의 모양입니다.
type LoanHistoryFilters = {
  memberNo?: string;
  memberName?: string;
  registrationNo?: string;
  loanDate?: string;
  returnedDate?: string;
};

// '대출이력' 탭 표에 나타나는 한 줄의 모양입니다.
type LoanHistoryRow = {
  id: number;
  status: "ON_LOAN" | "RETURNED";
  memberNo: string | null;
  memberName: string;
  registrationNo: string;
  loanDate: string;
  dueDate: string;
  returnedAt: string | null;
  title: string;
  creator: string | null;
  publisher: string | null;
  location: string | null;
};

const HISTORY_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const HISTORY_COLUMN_COUNT = 11;

// 글자가 max(기본 10자)를 넘으면 뒷부분을 "…"로 줄여줍니다.
function truncateText(text: string, max = 10) {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// 정규식에서 특별한 의미를 가지는 글자(. * + ? 등)를 그냥 글자 그대로 찾도록 앞에 \를 붙여줍니다.
function escapeForSearch(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// text 안에서 query와 일치하는 부분을 찾아 굵게 표시합니다. (대소문자 구분 안 함) — 개선89와 같은 방식입니다.
function HistoryHighlight({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim() || !text) return <>{text}</>;
  const q = query.trim();
  const parts = text.split(new RegExp(`(${escapeForSearch(q)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <strong key={i} className="font-bold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// 한국 시간(KST) 기준 날짜(YYYY-MM-DD)로 바꿔줍니다. 대출일/반납일 검색 조건과 비교할 때 씁니다.
function toKstDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

// 한국 시간(KST, UTC+9) 기준으로 오늘 날짜를 "YYYY-MM-DD" 형식으로 돌려줍니다.
// 이 화면을 보는 컴퓨터의 시간대 설정과 상관없이, 항상 한국 시간 기준으로 계산합니다.
function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
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
  // '대출/반납일 변경'으로 관리자가 직접 대출일을 지정했는지 기억합니다.
  // false면(직접 지정한 적 없으면) 대출 처리 시 이 값 대신 처리하는 그 순간의 실제 날짜·시간을 씁니다.
  const [loanDateManuallySet, setLoanDateManuallySet] = useState(false);

  const [registrationNo, setRegistrationNo] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loanedItems, setLoanedItems] = useState<LoanRecord[]>([]);
  const [restrictions, setRestrictions] = useState<RestrictionRecord[]>([]);
  // 방금 대출 처리를 완료한 대출 기록의 id입니다. 목록 맨 위로 올리고 옅은 녹색으로 표시하는 데 씁니다.
  const [lastLoanId, setLastLoanId] = useState<number | null>(null);
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

  // 지금 어느 탭('checkout' 대출 / 'return' 반납)이 열려 있는지 직접 관리합니다.
  // 반납 탭으로 넘어왔을 때 등록번호 입력폼으로 커서를 자동으로 옮기기 위해 필요합니다.
  const [activeTab, setActiveTab] = useState("checkout");

  // 화면에는 보이지 않지만, '대출/반납일 변경' 버튼을 누르면 이 입력 칸의 달력 팝업을 열어줍니다. (대출 탭용)
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // '대출/반납일 변경' 버튼을 눌렀을 때 호출됩니다. 넘겨받은 입력 칸의 달력 팝업을 엽니다.
  function openDatePicker(ref: { current: HTMLInputElement | null }) {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      // showPicker를 지원하지 않는 구형 브라우저를 위한 대안입니다.
      el.focus();
      el.click();
    }
  }

  // ── 여기부터는 '반납' 탭에서만 쓰는 상태와 함수들입니다. ──

  // 반납일 변경(대출 탭의 '대출일 변경'과 같은 방식)
  const [returnDateStr, setReturnDateStr] = useState(todayStr());
  // '대출/반납일 변경'으로 관리자가 직접 반납일을 지정했는지 기억합니다.
  // false면(직접 지정한 적 없으면) 반납 처리 시 이 값 대신 처리하는 그 순간의 실제 날짜·시간을 씁니다.
  const [returnDateManuallySet, setReturnDateManuallySet] = useState(false);
  const lastValidReturnDateRef = useRef(todayStr());
  const returnHiddenDateInputRef = useRef<HTMLInputElement>(null);

  // 등록번호 입력
  const [returnRegistrationNo, setReturnRegistrationNo] = useState("");
  const [returnProcessing, setReturnProcessing] = useState(false);
  const returnRegistrationInputRef = useRef<HTMLInputElement>(null);
  const returnQueueRef = useRef<Promise<void>>(Promise.resolve());

  // 방금 반납된 자료를 대출했던 회원의 정보, 방금 반납된 자료 1건, 그 회원이 아직 대출 중인 나머지 자료 목록
  const [returnMember, setReturnMember] = useState<Member | null>(null);
  const [returnedItem, setReturnedItem] = useState<LoanRecord | null>(null);
  const [returnActiveLoans, setReturnActiveLoans] = useState<LoanRecord[]>([]);
  const [returnRestrictions, setReturnRestrictions] = useState<RestrictionRecord[]>([]);
  const [showReturnRestrictionModal, setShowReturnRestrictionModal] = useState(false);

  // 반납 처리에 실패했을 때, 그 이유를 모달로 보여주기 위해 사용합니다.
  const [returnErrorMessage, setReturnErrorMessage] = useState<string | null>(null);

  // ── 여기부터는 '대출이력' 탭에서만 쓰는 상태와 함수들입니다. ──
  const [historyRows, setHistoryRows] = useState<LoanHistoryRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyFilters, setHistoryFilters] = useState<LoanHistoryFilters>({});
  const [historyHasSearched, setHistoryHasSearched] = useState(false);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [historyDetailForm, setHistoryDetailForm] = useState<LoanHistoryFilters>({});

  async function fetchHistory(p: number, size: number, f: LoanHistoryFilters) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("pageSize", String(size));
    if (f.memberNo) params.set("memberNo", f.memberNo);
    if (f.memberName) params.set("memberName", f.memberName);
    if (f.registrationNo) params.set("registrationNo", f.registrationNo);
    if (f.loanDate) params.set("loanDate", f.loanDate);
    if (f.returnedDate) params.set("returnedDate", f.returnedDate);

    const res = await fetch(`${API_URL}/loans/history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setHistoryRows(data.items);
      setHistoryTotal(data.total);
      setHistoryPage(data.page);
      setHistoryPageSize(data.pageSize);
      setHistoryHasSearched(true);
    }
  }

  function applyHistoryDetailSearch() {
    setHistoryFilters(historyDetailForm);
    setShowHistoryDetail(false);
    fetchHistory(1, historyPageSize, historyDetailForm);
  }

  function changeHistoryPageSize(size: number) {
    setHistoryPageSize(size);
    if (historyHasSearched) fetchHistory(1, size, historyFilters);
  }

  // 지금 적용된 검색 조건을 사람이 읽을 수 있는 문구로 만들어줍니다. (개선89와 같은 방식입니다.)
  function buildHistorySearchSummary(f: LoanHistoryFilters): string {
    const parts: string[] = [];
    if (f.memberNo) parts.push(`${t("loans.loanHistory.field.memberNo")} '${f.memberNo}'`);
    if (f.memberName) parts.push(`${t("loans.loanHistory.field.memberName")} '${f.memberName}'`);
    if (f.registrationNo) parts.push(`${t("materials.copies.regNo")} '${f.registrationNo}'`);
    if (f.loanDate) parts.push(`${t("loans.list.col.loanDate")} '${f.loanDate}'`);
    if (f.returnedDate) parts.push(`${t("loans.loanHistory.col.returnedAt")} '${f.returnedDate}'`);
    return parts.join(", ");
  }

  const historySearchSummary = historyHasSearched ? buildHistorySearchSummary(historyFilters) : "";
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));

  // 탭을 전환할 때마다(대출 ↔ 반납) 그 탭의 이전 작업 기록을 지우고, 등록번호 입력폼으로 커서를 옮깁니다.
  useEffect(() => {
    if (activeTab === "checkout") {
      resetAll();
    } else if (activeTab === "return") {
      resetReturnAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 반납일 입력 칸에서 포커스가 빠져나갈 때 호출됩니다. (대출 탭의 handleLoanDateBlur와 같은 방식)
  function handleReturnDateBlur() {
    if (isValidDateStr(returnDateStr)) {
      lastValidReturnDateRef.current = returnDateStr;
    } else {
      setReturnDateStr(lastValidReturnDateRef.current);
      setShowDateFormatError(true);
    }
  }

  // 방금 반납한 자료를 대출했던 회원의 대출제한 이력을 불러옵니다.
  async function loadReturnRestrictions(memberId: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-restrictions/${memberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setReturnRestrictions(await res.json());
    }
  }

  // 실제로 서버에 반납 요청을 보내는 부분입니다. 큐에서 하나씩 순서대로 처리됩니다.
  async function processReturn(regNo: string) {
    const token = localStorage.getItem("token");
    if (!token) return;

    setReturnProcessing(true);
    try {
      const res = await fetch(`${API_URL}/loans/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          registrationNo: regNo,
          // 관리자가 '대출/반납일 변경'으로 직접 날짜를 지정했을 때만 그 날짜를 보냅니다.
          // 직접 지정하지 않았다면 날짜를 아예 보내지 않아서, 서버가 처리하는 바로 그 순간의
          // 실제 날짜·시간을 그대로 쓰게 합니다.
          returnDate: returnDateManuallySet ? returnDateStr : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        // 반납 처리 알림창은 띄우지 않습니다. 목록 맨 위에 옅은 녹색 "반납완료"로 표시되는 것으로
        // 반납 처리가 잘 됐다는 걸 알 수 있습니다.
        setReturnedItem({
          id: data.id,
          loanDate: data.loanDate,
          dueDate: data.dueDate,
          renewCount: data.renewCount,
          copy: data.copy,
        });
        setReturnMember(data.member);
        await loadReturnRestrictions(data.member.id);

        // 이 회원이 아직 대출 중인 나머지 자료를 반납예정일이 가까운 순서로 불러옵니다.
        const activeRes = await fetch(`${API_URL}/loans/members/${data.member.id}/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (activeRes.ok) {
          const active: LoanRecord[] = await activeRes.json();
          active.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          setReturnActiveLoans(active);
        }
      } else {
        setReturnErrorMessage(data?.message || regNo);
      }
    } finally {
      setReturnProcessing(false);
      returnRegistrationInputRef.current?.focus();
    }
  }

  // 등록번호 입력창에서 Enter를 누르면 호출됩니다.
  function handleReturnSubmit() {
    const regNo = returnRegistrationNo.trim();
    if (!regNo) return;
    setReturnRegistrationNo("");
    returnQueueRef.current = returnQueueRef.current.then(() => processReturn(regNo));
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
    setLastLoanId(null);
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
    setLoanDateManuallySet(false);
    setLastLoanId(null);
    keywordInputRef.current?.focus();
  }

  // 반납 탭 전용 초기화입니다. resetAll()과 같은 역할을, 반납 탭에서 쓰는 상태들에 대해 합니다.
  function resetReturnAll() {
    setReturnRegistrationNo("");
    setReturnMember(null);
    setReturnedItem(null);
    setReturnActiveLoans([]);
    setReturnRestrictions([]);
    setShowReturnRestrictionModal(false);
    setReturnErrorMessage(null);
    setReturnDateStr(todayStr());
    lastValidReturnDateRef.current = todayStr();
    setReturnDateManuallySet(false);
    returnRegistrationInputRef.current?.focus();
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
        body: JSON.stringify({
          userId: selectedMember.id,
          registrationNo: regNo,
          // 관리자가 '대출/반납일 변경'으로 직접 날짜를 지정했을 때만 그 날짜를 보냅니다.
          // 직접 지정하지 않았다면 날짜를 아예 보내지 않아서, 서버가 처리하는 바로 그 순간의
          // 실제 날짜·시간을 그대로 쓰게 합니다.
          loanDate: loanDateManuallySet ? loanDateStr : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        // 대출 처리 성공 알림창은 더 이상 띄우지 않습니다. 목록 맨 위에 옅은 녹색으로 표시되는 것으로
        // 대출 처리가 잘 됐다는 걸 알 수 있습니다.
        if (data?.id) {
          setLastLoanId(data.id);
        }
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

  // 오늘 날짜의 자정(00:00) 시각을 구합니다. 백엔드와 같은 기준으로 "지금 제한 중인지"를 판단하기 위함입니다.
  // 한국 시간 기준 오늘 자정(00:00 KST)에 해당하는 실제 시각을 구합니다.
  // 백엔드와 같은 기준(한국 시간)으로 "지금 제한 중인지"를 판단하기 위함입니다.
  function todayStartKST() {
    return new Date(todayStr() + "T00:00:00+09:00");
  }

  // 날짜 문자열에 하루를 더한 "YYYY-MM-DD" 문자열을 돌려줍니다. (제한 마지막 날 다음 날 = 대출 가능일)
  function addOneDay(dateStr: string) {
    const d = new Date(dateStr.slice(0, 10) + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // 정지 이력 중에서 "제한 마지막 날이 오늘이거나 오늘보다 나중인" 것이 있으면 그것을 씁니다.
  const activeRestriction = restrictions.find((r) => new Date(r.endDate) >= todayStartKST()) || null;

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gap-2">
          <TabsTrigger value="checkout">{t("loans.tabs.checkout")}</TabsTrigger>
          <TabsTrigger value="return">{t("loans.tabs.return")}</TabsTrigger>
          <TabsTrigger value="reservation">{t("loans.tabs.reservation")}</TabsTrigger>
          <TabsTrigger value="history">{t("loans.tabs.history")}</TabsTrigger>
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
                onClick={() => openDatePicker(hiddenDateInputRef)}
                className="cursor-pointer rounded-l-lg border-r border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200"
              >
                {t("loans.dateOverride.btn")}
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={loanDateStr}
                  onChange={(e) => {
                    setLoanDateStr(formatDateInput(e.target.value));
                    setLoanDateManuallySet(true);
                  }}
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
                    setLoanDateManuallySet(true);
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
                      {addOneDay(activeRestriction.endDate)}
                      {t("loans.restriction.badge.availableFrom")}
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
                      {/* 방금 대출 처리한 행(lastLoanId)을 맨 위로 올리고, 나머지는 원래 순서를 유지합니다. */}
                      {[
                        ...loanedItems.filter((item) => item.id === lastLoanId),
                        ...loanedItems.filter((item) => item.id !== lastLoanId),
                      ].map((item, i) => (
                        <tr key={item.id} className={item.id === lastLoanId ? "bg-green-50" : undefined}>
                          <td className="whitespace-nowrap px-3 py-2">{i + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2">{item.copy.registrationNo}</td>
                          <td className="whitespace-nowrap px-3 py-2">{item.copy.material.title}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.callNumber || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.volume || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.copyNumber || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">
                            {new Date(item.loanDate).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">
                            {new Date(item.dueDate).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.status}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.renewCount}</td>
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
          {/* 상단: 반납일 변경 */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-stretch rounded-lg border border-neutral-300">
              <button
                type="button"
                onClick={() => openDatePicker(returnHiddenDateInputRef)}
                className="cursor-pointer rounded-l-lg border-r border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200"
              >
                {t("loans.dateOverride.btn")}
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={returnDateStr}
                  onChange={(e) => {
                    setReturnDateStr(formatDateInput(e.target.value));
                    setReturnDateManuallySet(true);
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={handleReturnDateBlur}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  placeholder={t("loans.dateOverride.placeholder")}
                  className="h-full w-32 rounded-r-lg border-0 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                />
                {/* 화면에는 보이지 않는 달력 입력 칸입니다. 버튼을 누르면 이 칸의 달력 팝업만 뜹니다. */}
                <input
                  ref={returnHiddenDateInputRef}
                  type="date"
                  value={returnDateStr}
                  onChange={(e) => {
                    const next = e.target.value || todayStr();
                    setReturnDateStr(next);
                    lastValidReturnDateRef.current = next;
                    setReturnDateManuallySet(true);
                  }}
                  tabIndex={-1}
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                />
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-10">
            {/* 왼쪽: 자료 등록번호 입력만 (회원 검색 없음) (전체 가로폭의 4/10) */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4 md:col-span-4">
              <p className="mb-2 text-sm font-semibold">{t("loans.return.boxTitle")}</p>
              <span className="mb-1 block text-sm text-neutral-500">{t("loans.registrationNo.label")}</span>
              <input
                ref={returnRegistrationInputRef}
                value={returnRegistrationNo}
                onChange={(e) => setReturnRegistrationNo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReturnSubmit()}
                placeholder={t("loans.registrationNo.placeholder")}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              />
              {returnProcessing && <p className="mt-2 text-xs text-neutral-400">{t("loans.processing")}</p>}
            </div>

            {/* 오른쪽: 회원 정보 (방금 반납한 자료를 대출했던 회원) (전체 가로폭의 6/10) */}
            <div className="rounded-lg border border-neutral-200 bg-white p-4 md:col-span-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{t("loans.member.info.title")}</p>
                {returnMember && (
                  <button
                    type="button"
                    onClick={() => setShowReturnRestrictionModal(true)}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("loans.member.restrictionHistoryBtn")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <div className="flex flex-col">
                  <InfoRow label={t("members.form.field.name")} value={returnMember?.name || "-"} />
                  <InfoRow label={t("members.form.field.memberNo")} value={returnMember?.memberNo || "-"} />
                  <InfoRow label={t("members.form.field.phone")} value={returnMember?.phone || "-"} />
                  <InfoRow
                    label={t("members.form.field.status")}
                    value={returnMember ? t(`members.status.${returnMember.status}`) : "-"}
                    valueClassName={statusColorClass(returnMember?.status)}
                  />
                  {returnRestrictions.find((r) => new Date(r.endDate) >= todayStartKST()) && (
                    <p className="pb-1.5 text-right text-xs text-orange-600">
                      {addOneDay(
                        (returnRestrictions.find((r) => new Date(r.endDate) >= todayStartKST()) as RestrictionRecord)
                          .endDate,
                      )}
                      {t("loans.restriction.badge.availableFrom")}
                      {t("loans.restriction.badge.reason")}
                      {(returnRestrictions.find((r) => new Date(r.endDate) >= todayStartKST()) as RestrictionRecord)
                        .reason || "-"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col">
                  <InfoRow
                    label={t("members.form.field.memberType")}
                    value={returnMember?.memberType?.name || "-"}
                  />
                  <InfoRow
                    label={t("members.form.field.birthDate")}
                    value={returnMember?.birthDate ? returnMember.birthDate.slice(0, 10) : "-"}
                  />
                  <InfoRow label={t("members.form.field.email")} value={returnMember?.email || "-"} />
                  <InfoRow label={t("members.form.field.address")} value={returnMember?.address || "-"} />
                </div>
              </div>
            </div>

            {/* 아래: 대출 자료 목록과 같은 위치, 배경색만 다르게 (연한 보라색) */}
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 md:col-span-10">
              <p className="mb-2 text-sm font-semibold">{t("loans.history.title")}</p>
              {!returnedItem && returnActiveLoans.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("loans.history.empty")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-purple-100 bg-white">
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
                      {/* 방금 반납한 자료를 맨 위에, 그 아래로 이 회원이 아직 대출 중인 자료를 반납예정일이 가까운 순으로 보여줍니다.
                          returnActiveLoans에서 방금 반납한 자료와 같은 항목은 항상 제외해서, 두 목록을 새로 받아오는
                          사이의 짧은 순간에도 같은 자료가 두 번 나타나는 일이 없도록 합니다. */}
                      {[
                        ...(returnedItem ? [returnedItem] : []),
                        ...returnActiveLoans.filter((item) => item.id !== returnedItem?.id),
                      ].map((item, i) => (
                        <tr key={item.id} className={item.id === returnedItem?.id ? "bg-green-50" : undefined}>
                          <td className="whitespace-nowrap px-3 py-2">{i + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2">{item.copy.registrationNo}</td>
                          <td className="whitespace-nowrap px-3 py-2">{item.copy.material.title}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.callNumber || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.volume || "-"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.copy.copyNumber || "-"}</td>                          
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">
                            {new Date(item.loanDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">
                            {new Date(item.dueDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">
                            {item.id === returnedItem?.id ? t("loans.return.status.completed") : item.copy.status}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[color:var(--default-text-color)]">{item.renewCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* '예약' 탭: 아직 기능이 없어서 안내 문구만 보여줍니다. (반납 탭이 처음 만들어지기 전과 같은 방식입니다.) */}
        <TabsContent value="reservation" className="mt-4">
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
            {t("loans.reservation.comingSoon")}
          </p>
        </TabsContent>

        {/* '대출이력' 탭: 회원 관리 화면과 비슷한 구조(상세 검색 → 표 → 페이지네이션)입니다. */}
        <TabsContent value="history" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistoryDetail(true)}
                className="cursor-pointer rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              >
                {t("loans.loanHistory.detailSearch")}
              </button>

              {historySearchSummary && (
                <span className="ml-2 text-sm text-neutral-500">
                  {t("loans.loanHistory.searchSummaryLabel")}: {historySearchSummary}
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-neutral-500">{t("loans.loanHistory.pageSizeLabel")}</span>
                <select
                  value={historyPageSize}
                  onChange={(e) => changeHistoryPageSize(Number(e.target.value))}
                  className="cursor-pointer rounded-lg border px-2 py-1.5 text-sm"
                >
                  {HISTORY_PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.col.no")}</th>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.col.status")}</th>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.field.memberNo")}</th>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.field.memberName")}</th>
                    <th className="px-4 py-2.5">{t("materials.copies.regNo")}</th>
                    <th className="px-4 py-2.5">{t("loans.list.col.loanDate")}</th>
                    <th className="px-4 py-2.5">{t("loans.dueDateLabel")}</th>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.col.returnedAt")}</th>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.col.materialTitle")}</th>
                    <th className="px-4 py-2.5">{t("loans.loanHistory.col.creator")}</th>
                    <th className="px-4 py-2.5">{t("materials.list.col.location")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {!historyHasSearched &&
                    Array.from({ length: historyPageSize }).map((_, i) => (
                      <tr key={`history-blank-${i}`}>
                        {Array.from({ length: HISTORY_COLUMN_COUNT }).map((__, j) => (
                          <td key={j} className="px-4 py-2.5">
                            &nbsp;
                          </td>
                        ))}
                      </tr>
                    ))}

                  {historyHasSearched && historyRows.length === 0 && (
                    <tr>
                      <td colSpan={HISTORY_COLUMN_COUNT} className="px-4 py-6 text-center text-neutral-400">
                        {t("loans.loanHistory.noResults")}
                      </td>
                    </tr>
                  )}

                  {historyHasSearched &&
                    historyRows.map((row, i) => {
                      // 대출상태에 따라 행 배경색을 다르게 보여줍니다.
                      // 반납완료: '반납' 메뉴의 '대출 자료 목록' 박스와 같은 연보라색
                      // 연체중: 옅은 주황색 / 대출중: 흰색
                      const rowBgClass =
                        row.status === "RETURNED"
                          ? "bg-purple-50"
                          : row.status === "OVERDUE"
                            ? "bg-orange-50"
                            : "bg-white";
                      const statusLabel =
                        row.status === "ON_LOAN"
                          ? t("loans.loanHistory.status.onLoan")
                          : row.status === "OVERDUE"
                            ? t("loans.loanHistory.status.overdue")
                            : t("loans.loanHistory.status.returned");
                      return (
                    <tr key={row.id} className={rowBgClass}>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {(historyPage - 1) * historyPageSize + i + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {statusLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {row.memberNo ? (
                            <HistoryHighlight text={row.memberNo} query={historyFilters.memberNo} />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <HistoryHighlight text={row.memberName} query={historyFilters.memberName} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <HistoryHighlight text={row.registrationNo} query={historyFilters.registrationNo} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[color:var(--default-text-color)]">
                          {historyFilters.loanDate && toKstDateStr(row.loanDate) === historyFilters.loanDate ? (
                            <strong className="font-bold">
                              {new Date(row.loanDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                            </strong>
                          ) : (
                            new Date(row.loanDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[color:var(--default-text-color)]">
                          {new Date(row.dueDate).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[color:var(--default-text-color)]">
                          {row.returnedAt ? (
                            historyFilters.returnedDate &&
                            toKstDateStr(row.returnedAt) === historyFilters.returnedDate ? (
                              <strong className="font-bold">
                                {new Date(row.returnedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                              </strong>
                            ) : (
                              new Date(row.returnedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5" title={row.title}>
                          {truncateText(row.title)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5" title={row.creator || undefined}>
                          {row.creator ? truncateText(row.creator) : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">{row.location || "-"}</td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {historyHasSearched && historyTotal > 0 && (
              <div className="flex flex-col items-center justify-center gap-2 text-sm">
                <span className="text-neutral-500">
                  {historyPage} / {historyTotalPages} {t("materials.pageWord")} ({t("materials.totalWord")}{" "}
                  {historyTotal}
                  {t("materials.countUnit")})
                </span>
                <Pagination
                  page={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={(p) => fetchHistory(p, historyPageSize, historyFilters)}
                />
              </div>
            )}
          </div>

          {/* 대출이력 상세 검색 모달 */}
          {showHistoryDetail && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setShowHistoryDetail(false)}
            >
              <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <p className="mb-4 text-sm font-semibold">{t("loans.loanHistory.detailSearch")}</p>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">
                      {t("loans.loanHistory.field.memberNo")}
                    </span>
                    <input
                      value={historyDetailForm.memberNo || ""}
                      onChange={(e) => setHistoryDetailForm({ ...historyDetailForm, memberNo: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">
                      {t("loans.loanHistory.field.memberName")}
                    </span>
                    <input
                      value={historyDetailForm.memberName || ""}
                      onChange={(e) => setHistoryDetailForm({ ...historyDetailForm, memberName: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.regNo")}</span>
                    <input
                      value={historyDetailForm.registrationNo || ""}
                      onChange={(e) =>
                        setHistoryDetailForm({ ...historyDetailForm, registrationNo: e.target.value })
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("loans.list.col.loanDate")}</span>
                    <input
                      type="date"
                      value={historyDetailForm.loanDate || ""}
                      onChange={(e) => setHistoryDetailForm({ ...historyDetailForm, loanDate: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">
                      {t("loans.loanHistory.col.returnedAt")}
                    </span>
                    <input
                      type="date"
                      value={historyDetailForm.returnedDate || ""}
                      onChange={(e) =>
                        setHistoryDetailForm({ ...historyDetailForm, returnedDate: e.target.value })
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  onClick={applyHistoryDetailSearch}
                  className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
                >
                  {t("materials.search")}
                </button>
              </div>
            </div>
          )}
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

      {/* 반납 실패 안내 모달 (등록번호가 잘못되었거나, 대출 중인 자료가 아닌 경우 서버가 알려주는 이유를 보여줍니다) */}
      {returnErrorMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setReturnErrorMessage(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-red-600">{t("loans.return.error.title")}</p>
            <p className="text-sm text-neutral-600">{returnErrorMessage}</p>
            <button
              type="button"
              onClick={() => setReturnErrorMessage(null)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 반납 탭에서 보는 정지 이력 모달 (대출 탭의 정지 이력 모달과 같은 모양입니다) */}
      {showReturnRestrictionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowReturnRestrictionModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{t("loans.restrictionHistory.modalTitle")}</p>

            {returnRestrictions.length === 0 ? (
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
                    {returnRestrictions.map((r) => (
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
              onClick={() => setShowReturnRestrictionModal(false)}
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