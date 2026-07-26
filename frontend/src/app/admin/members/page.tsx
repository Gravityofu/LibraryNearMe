"use client";

"use client";

import { useState } from "react";
import Script from "next/script";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import { BirthDateField, isValidBirthDate } from "@/components/birth-date-field";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MemberRow = {
  id: number;
  loginId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  memberNo: string | null;
  birthDate: string | null;
  address: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type Filters = {
  name?: string;
  phone?: string;
  loginId?: string;
  memberNo?: string;
  status?: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const STATUS_VALUES = ["ACTIVE", "PENDING", "SUSPENDED"];
const COLUMN_COUNT = 10;

const EMPTY_FORM = {
  loginId: "",
  password: "",
  name: "",
  phone: "",
  email: "",
  memberNo: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  addressMain: "",
  addressDetail: "",
  role: "MEMBER",
  status: "ACTIVE",
};

// 숫자만 남기고, 3자리-4자리-4자리 모양으로 하이픈을 자동으로 붙여줍니다.
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11); // 숫자만, 최대 11자리
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 하이픈을 뺀 숫자가 정확히 11자리인지 확인합니다.
function isValidPhone(phone: string) {
  return phone.replace(/\D/g, "").length === 11;
}

// 이메일은 입력했을 때만(선택 항목이라) 형식을 확인합니다.
function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// 카카오 우편번호 서비스 팝업을 엽니다. 주소를 고르면 onSelect로 그 값을 전달합니다.
function openAddressSearch(onSelect: (address: string) => void) {
  const daum = (window as any).daum;
  if (!daum || !daum.Postcode) {
    // 스크립트가 아직 다 안 불러와졌을 때
    alert("주소 검색 창을 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
    return;
  }
  new daum.Postcode({
    oncomplete: function (data: any) {
      // 도로명 주소가 있으면 그걸, 없으면 지번 주소를 사용합니다.
      const address = data.roadAddress || data.jibunAddress || data.address;
      onSelect(address);
    },
  }).open();
}

export default function MembersPage() {
  const { notify } = useNotify();
  const { t } = useI18n();

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>({});
  const [hasSearched, setHasSearched] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailForm, setDetailForm] = useState<Filters>({});

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function fetchList(p: number, size: number, f: Filters) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("pageSize", String(size));
    if (f.name) params.set("name", f.name);
    if (f.phone) params.set("phone", f.phone);
    if (f.loginId) params.set("loginId", f.loginId);
    if (f.memberNo) params.set("memberNo", f.memberNo);
    if (f.status) params.set("status", f.status);
    const res = await fetch(`${API_URL}/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
      setHasSearched(true);
    } else {
      notify("❌ " + t("members.list.searchFail"), "error");
    }
  }

  function applyDetailSearch() {
    setFilters(detailForm);
    setShowDetail(false);
    fetchList(1, pageSize, detailForm);
  }

  function changePageSize(size: number) {
    setPageSize(size);
    if (hasSearched) fetchList(1, size, filters);
  }

  async function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);

    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/users/next-member-no`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setForm((prev) => ({ ...prev, memberNo: data.memberNo }));
    }
  }

  function openEditModal(row: MemberRow) {
    setEditingId(row.id);
    const [by, bm, bd] = row.birthDate ? row.birthDate.slice(0, 10).split("-") : ["", "", ""];
    setForm({
      loginId: row.loginId || "",
      password: "",
      name: row.name,
      phone: row.phone || "",
      email: row.email || "",
      memberNo: row.memberNo || "",
      birthYear: by,
      birthMonth: bm,
      birthDay: bd,
      addressMain: row.address || "",
      addressDetail: "",
      role: row.role,
      status: row.status,
    });
    setShowForm(true);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!editingId && (!form.loginId.trim() || !form.password.trim() || !form.name.trim())) {
      notify("❌ " + t("members.form.requiredFields"), "error");
      return;
    }

    if (!isValidPhone(form.phone)) {
      notify("❌ " + t("members.form.invalidPhone"), "error");
      return;
    }
    if (!isValidEmail(form.email)) {
      notify("❌ " + t("members.form.invalidEmail"), "error");
      return;
    }

    // 생년월일: 세 칸 중 하나라도 입력했으면 셋 다 채워져 있어야 하고, 진짜 존재하는 날짜여야 합니다.
    const anyBirthFilled = form.birthYear || form.birthMonth || form.birthDay;
    const allBirthFilled = form.birthYear && form.birthMonth && form.birthDay;
    if (anyBirthFilled && !allBirthFilled) {
      notify("❌ " + t("members.form.invalidBirthDate"), "error");
      return;
    }
    if (allBirthFilled && !isValidBirthDate(form.birthYear, form.birthMonth, form.birthDay)) {
      notify("❌ " + t("members.form.invalidBirthDate"), "error");
      return;
    }

    const birthDateValue = allBirthFilled
      ? `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`
      : undefined;

    const address = [form.addressMain, form.addressDetail].filter((v) => v.trim()).join(" ");

    const url = editingId ? `${API_URL}/users/${editingId}` : `${API_URL}/users/admin`;

    const body = editingId
      ? {
          name: form.name,
          phone: form.phone,
          email: form.email,
          memberNo: form.memberNo,
          birthDate: birthDateValue,
          address,
          status: form.status,
          role: form.role,
          password: form.password || undefined,
        }
      : {
          loginId: form.loginId,
          password: form.password,
          name: form.name,
          phone: form.phone,
          email: form.email,
          memberNo: form.memberNo,
          birthDate: birthDateValue,
          address,
          role: form.role,
        };

    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      notify("✅ " + t("members.form.saveSuccess"), "success");
      setShowForm(false);
      await fetchList(page, pageSize, filters);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("members.form.saveFail")), "error");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4 p-6">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      {/* 상단 버튼 영역 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="cursor-pointer rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          {t("members.list.detailSearch")}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-neutral-500">{t("members.list.pageSizeLabel")}</span>
          <select
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
            className="cursor-pointer rounded-lg border px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 표 영역 */}
      <div className="max-h-[65vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-4 py-2.5">{t("members.list.col.no")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.loginId")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.name")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.phone")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.email")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.memberNo")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.role")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.status")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.createdAt")}</th>
              <th className="px-4 py-2.5">{t("members.list.col.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {!hasSearched &&
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                    <td key={j} className="px-4 py-2.5">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
            {hasSearched && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-neutral-400">
                  {t("members.list.noResults")}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-2.5">{(page - 1) * pageSize + i + 1}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{row.loginId || "-"}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{row.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{row.phone || "-"}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{row.email || "-"}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{row.memberNo || "-"}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{t(`members.role.${row.role}`)}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {t(`members.status.${row.status}`)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
                  {row.createdAt?.slice(0, 10)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(row)}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("members.list.editBtn")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {hasSearched && total > 0 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => fetchList(page - 1, pageSize, filters)}
            className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("members.list.pagePrev")}
          </button>
          <span className="text-neutral-500">
            {page} / {totalPages} {t("members.pageWord")} ({t("members.totalWord")} {total}
            {t("members.countUnit")})
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchList(page + 1, pageSize, filters)}
            className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("members.list.pageNext")}
          </button>
        </div>
      )}

      {/* 하단 버튼 영역 */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={openAddModal}
          className="cursor-pointer rounded-lg bg-[#383838] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0]"
        >
          {t("members.list.addBtn")}
        </button>
      </div>

      {/* 상세 검색 모달 */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold">{t("members.list.detailSearch")}</p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.list.field.name")}</span>
                <input
                  value={detailForm.name || ""}
                  onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.list.field.phone")}</span>
                <input
                  value={detailForm.phone || ""}
                  onChange={(e) => setDetailForm({ ...detailForm, phone: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.list.field.loginId")}</span>
                <input
                  value={detailForm.loginId || ""}
                  onChange={(e) => setDetailForm({ ...detailForm, loginId: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.list.field.memberNo")}</span>
                <input
                  value={detailForm.memberNo || ""}
                  onChange={(e) => setDetailForm({ ...detailForm, memberNo: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.list.field.status")}</span>
                <select
                  value={detailForm.status || ""}
                  onChange={(e) => setDetailForm({ ...detailForm, status: e.target.value })}
                  className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">{t("members.list.anyStatus")}</option>
                  {STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {t(`members.status.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              onClick={applyDetailSearch}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("materials.search")}
            </button>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[85vh] overflow-auto p-6">
            <p className="mb-4 text-sm font-semibold">
              {editingId ? t("members.form.editTitle") : t("members.form.addTitle")}
            </p>
            <div className="space-y-3">

              {!editingId && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.loginId")} *</span>
                    <input
                      value={form.loginId}
                      onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.password")} *</span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.role")}</span>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="MEMBER">{t("members.role.MEMBER")}</option>
                      <option value="ADMIN">{t("members.role.ADMIN")}</option>
                    </select>
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.name")} *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.phone")} *</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="000-0000-0000"
                  inputMode="numeric"
                  maxLength={13}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.email")}</span>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.memberNo")}</span>
                <input
                  value={form.memberNo}
                  onChange={(e) => setForm({ ...form, memberNo: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.birthDate")}</span>
                <BirthDateField
                  value={{ year: form.birthYear, month: form.birthMonth, day: form.birthDay }}
                  onChange={(next) =>
                    setForm({ ...form, birthYear: next.year, birthMonth: next.month, birthDay: next.day })
                  }
                />
              </label>

              <label className="block">

                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm text-neutral-500">{t("members.form.field.address")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      openAddressSearch((address) => setForm((prev) => ({ ...prev, addressMain: address, addressDetail: "" })))
                    }
                    className="cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                  >
                    {t("members.form.findAddressBtn")}
                  </button>
                </div>

                {form.addressMain && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={form.addressMain}
                      disabled
                      className="w-full rounded-lg border bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                    />
                    <input
                      value={form.addressDetail}
                      onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                      placeholder={t("members.form.addressDetailPlaceholder")}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </label>

              {editingId && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.role")}</span>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="MEMBER">{t("members.role.MEMBER")}</option>
                      <option value="ADMIN">{t("members.role.ADMIN")}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">
                      {t("members.form.field.newPassword")}
                    </span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={t("members.form.field.newPasswordHint")}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("members.form.field.status")}</span>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm"
                    >
                      {STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                          {t(`members.status.${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

            </div>

            <button
              onClick={handleSave}
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#383838] py-2.5 text-sm font-semibold text-[#F9F6F0]"
            >
              {t("members.form.save")}
            </button>
            
            </div>
          </div>
        </div>
      )}
    </div>
  );
}