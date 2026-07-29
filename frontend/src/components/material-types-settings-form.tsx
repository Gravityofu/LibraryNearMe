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

  useEffect(() => {
    loadTypes();
    loadMaxSubjectKeywords();
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

  function renderTable(category: "PHYSICAL" | "DIGITAL") {
    const rows = types.filter((mt) => mt.category === category);
    return (
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-3 py-2">{t("settings.materialTypes.col.nameKo")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.code")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.usesMarc")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{item.nameKo}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.code}</td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {item.usesMarc ? t("settings.materialTypes.yes") : t("settings.materialTypes.no")}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                  >
                    {t("settings.materialTypes.editBtn")}
                  </button>
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

      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionPhysical")}</p>
        {renderTable("PHYSICAL")}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.materialTypes.sectionDigital")}</p>
        {renderTable("DIGITAL")}
      </div>

      <div className="flex justify-end">
        <ThemedButton preset="버튼1" onClick={openAddModal}>
          {t("settings.materialTypes.addBtn")}
        </ThemedButton>
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
    </div>
  );
}