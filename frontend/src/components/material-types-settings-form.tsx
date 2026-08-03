"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  nameEn: string;
  category: "PHYSICAL" | "DIGITAL";
  usesMarc: boolean;
  maxLoanCount: number | null;
  loanPeriodDays: number | null;
  maxReservationCount: number | null;
};

type MaterialRequestType = {
  id: number;
  value: string;
  order: number;
};

const EMPTY_FORM = {
  category: "PHYSICAL" as "PHYSICAL" | "DIGITAL",
  code: "",
  nameKo: "",
  nameEn: "",
  usesMarc: false,
};

export default function MaterialTypesSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [types, setTypes] = useState<MaterialType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // 자료 등록 화면에서 주제어를 몇 개까지 입력할 수 있는지 정하는, 도서관 전체 공통 값이에요.
  const [maxSubjectKeywords, setMaxSubjectKeywords] = useState("10");

  // '자료를 신청합니다' 게시판 글쓰기 화면의 '자료 종류' 드롭다운 항목들입니다.
  const [requestTypes, setRequestTypes] = useState<MaterialRequestType[]>([]);
  const [showMrtModal, setShowMrtModal] = useState(false);
  const [editingMrtId, setEditingMrtId] = useState<number | null>(null);
  const [mrtValue, setMrtValue] = useState("");

  async function loadTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTypes(await res.json());
    } else {
      notify("❌ " + t("settings.materialTypes.loadFail"), "error");
    }
  }

  async function loadMaxSubjectKeywords() {
    const res = await fetch(`${API_URL}/library`);
    if (res.ok) {
      const data = await res.json();
      if (data?.maxSubjectKeywords) {
        setMaxSubjectKeywords(String(data.maxSubjectKeywords));
      }
    }
  }

  async function handleSaveMaxSubjectKeywords() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const value = Number(maxSubjectKeywords);
    if (!Number.isFinite(value) || value < 1) {
      notify("❌ " + t("settings.materialTypes.maxSubjectKeywords.invalid"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/library`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ maxSubjectKeywords: value }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.maxSubjectKeywords.saveSuccess"), "success");
    } else {
      notify("❌ " + t("settings.materialTypes.maxSubjectKeywords.saveFail"), "error");
    }
  }

  async function loadRequestTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-request-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRequestTypes(await res.json());
    } else {
      notify("❌ " + t("settings.materialTypes.requestTypes.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadTypes();
    loadMaxSubjectKeywords();
    loadRequestTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(item: MaterialType) {
    setEditingId(item.id);
    setForm({
      category: item.category,
      code: item.code,
      nameKo: item.nameKo,
      nameEn: item.nameEn,
      usesMarc: item.usesMarc,
    });
    setShowModal(true);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!form.nameKo.trim() || (!editingId && !form.code.trim())) {
      notify("❌ " + t("settings.materialTypes.codeRequired"), "error");
      return;
    }

    const body: any = {
      nameKo: form.nameKo.trim(),
      nameEn: form.nameEn.trim(),
    };
    if (!editingId) {
      body.code = form.code.trim();
      body.category = form.category;
      body.usesMarc = form.usesMarc;
    }

    const url = editingId ? `${API_URL}/material-types/${editingId}` : `${API_URL}/material-types`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.saveSuccess"), "success");
      setShowModal(false);
      await loadTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.saveFail")), "error");
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm(t("settings.materialTypes.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types/${editingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.deleteSuccess"), "success");
      setShowModal(false);
      await loadTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.deleteFail")), "error");
    }
  }

  function openAddMrtModal() {
    setEditingMrtId(null);
    setMrtValue("");
    setShowMrtModal(true);
  }

  function openEditMrtModal(item: MaterialRequestType) {
    setEditingMrtId(item.id);
    setMrtValue(item.value);
    setShowMrtModal(true);
  }

  async function handleSaveMrt() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!mrtValue.trim()) {
      notify("❌ " + t("settings.materialTypes.requestTypes.valueRequired"), "error");
      return;
    }
    const url = editingMrtId
      ? `${API_URL}/material-request-types/${editingMrtId}`
      : `${API_URL}/material-request-types`;
    const res = await fetch(url, {
      method: editingMrtId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ value: mrtValue.trim() }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.requestTypes.saveSuccess"), "success");
      setShowMrtModal(false);
      await loadRequestTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.requestTypes.saveFail")), "error");
    }
  }

  async function handleDeleteMrt(id: number) {
    if (!window.confirm(t("settings.materialTypes.requestTypes.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-request-types/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.requestTypes.deleteSuccess"), "success");
      await loadRequestTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.requestTypes.deleteFail")), "error");
    }
  }

  function renderTable(category: "PHYSICAL" | "DIGITAL") {
    const rows = types.filter((mt) => mt.category === category);
    return (
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-3 py-2">{t("settings.materialTypes.col.nameKo")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.code")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.usesMarc")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((item) => (
              <tr
                key={item.id}
                onClick={() => openEditModal(item)}
                className="cursor-pointer hover:bg-neutral-50"
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium">{item.nameKo}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.code}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {item.usesMarc ? t("settings.materialTypes.yes") : t("settings.materialTypes.no")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.maxSubjectKeywords.label")}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={maxSubjectKeywords}
            onChange={(e) => setMaxSubjectKeywords(e.target.value)}
            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <ThemedButton preset="버튼1" onClick={handleSaveMaxSubjectKeywords}>
            {t("settings.materialTypes.maxSubjectKeywords.save")}
          </ThemedButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionPhysical")}</p>
          {renderTable("PHYSICAL")}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionDigital")}</p>
          {renderTable("DIGITAL")}
        </div>
      </div>

      <div className="flex justify-end">
        <ThemedButton preset="버튼1" onClick={openAddModal}>
          {t("settings.materialTypes.addBtn")}
        </ThemedButton>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold">{t("settings.materialTypes.requestTypes.title")}</p>
        <p className="mb-3 text-xs text-neutral-400">{t("settings.materialTypes.requestTypes.desc")}</p>

        <div className="flex flex-wrap gap-2">
          {requestTypes.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
            >
              <span>{item.value}</span>
              <button
                type="button"
                onClick={() => openEditMrtModal(item)}
                className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800"
              >
                {t("settings.materialTypes.requestTypes.editBtn")}
              </button>
              {requestTypes.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteMrt(item.id)}
                  className="cursor-pointer text-xs text-red-500 hover:text-red-700"
                >
                  {t("settings.materialTypes.requestTypes.deleteBtn")}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <ThemedButton preset="버튼1" onClick={openAddMrtModal}>
            {t("settings.materialTypes.requestTypes.addBtn")}
          </ThemedButton>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <p className="mb-4 text-sm font-semibold">
                {editingId ? t("settings.materialTypes.modal.editTitle") : t("settings.materialTypes.modal.addTitle")}
              </p>

              <div className="space-y-3">
                {!editingId && (
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.category")}</span>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as "PHYSICAL" | "DIGITAL" })}
                      className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="PHYSICAL">{t("settings.materialTypes.field.categoryPhysical")}</option>
                      <option value="DIGITAL">{t("settings.materialTypes.field.categoryDigital")}</option>
                    </select>
                  </label>
                )}

                {!editingId && (
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.code")}</span>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.nameKo")} *</span>
                  <input
                    value={form.nameKo}
                    onChange={(e) => setForm({ ...form, nameKo: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.nameEn")}</span>
                  <input
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>

                {!editingId && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.usesMarc}
                      onChange={(e) => setForm({ ...form, usesMarc: e.target.checked })}
                    />
                    <span className="text-sm text-neutral-500">{t("settings.materialTypes.field.usesMarc")}</span>
                  </label>
                )}

                {!editingId && form.category === "PHYSICAL" && (
                  <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                    {t("settings.materialTypes.loanHint")}
                  </p>
                )}
              </div>

              <ThemedButton preset="버튼1" onClick={handleSave} className="mt-5 w-full">
                {t("settings.materialTypes.save")}
              </ThemedButton>

              {editingId && (
                <button
                  onClick={handleDelete}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("settings.materialTypes.deleteBtn")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showMrtModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowMrtModal(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold">
              {editingMrtId
                ? t("settings.materialTypes.requestTypes.modal.editTitle")
                : t("settings.materialTypes.requestTypes.modal.addTitle")}
            </p>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">
                {t("settings.materialTypes.requestTypes.field.value")} *
              </span>
              <input
                value={mrtValue}
                onChange={(e) => setMrtValue(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <ThemedButton preset="버튼1" onClick={handleSaveMrt} className="mt-5 w-full">
              {t("settings.materialTypes.requestTypes.save")}
            </ThemedButton>
          </div>
        </div>
      )}
    </div>
  );
}