"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type KdcRule = { id: number; kdcPrefix: string; label: string; maxLoanCount: number };
type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  nameEn: string;
  category: "PHYSICAL" | "DIGITAL";
  usesMarc: boolean;
  maxLoanCount: number | null;
  loanPeriodDays: number | null;
  kdcRules: KdcRule[];
};

const EMPTY_FORM = {
  category: "PHYSICAL" as "PHYSICAL" | "DIGITAL",
  code: "",
  nameKo: "",
  nameEn: "",
  usesMarc: false,
  maxLoanCount: "",
  loanPeriodDays: "",
};

const EMPTY_KDC_FORM = { kdcPrefix: "", label: "", maxLoanCount: "" };

export default function MaterialTypesSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [types, setTypes] = useState<MaterialType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [showKdcModal, setShowKdcModal] = useState(false);
  const [showKdcForm, setShowKdcForm] = useState(false);
  const [kdcEditingId, setKdcEditingId] = useState<number | null>(null);
  const [kdcForm, setKdcForm] = useState(EMPTY_KDC_FORM);

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

  useEffect(() => {
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookType = types.find((mt) => mt.code === "book");

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
      maxLoanCount: item.maxLoanCount !== null ? String(item.maxLoanCount) : "",
      loanPeriodDays: item.loanPeriodDays !== null ? String(item.loanPeriodDays) : "",
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
    if (form.category === "PHYSICAL" && (!form.maxLoanCount.trim() || !form.loanPeriodDays.trim())) {
      notify("❌ " + t("settings.materialTypes.loanFieldsRequired"), "error");
      return;
    }

    // 새로 추가할 때만 코드/구분/MARC 사용 여부를 함께 보냅니다. (수정할 땐 서버가 이 값들을 바꾸지 않아요.)
    const body: any = {
      nameKo: form.nameKo.trim(),
      nameEn: form.nameEn.trim(),
    };
    if (!editingId) {
      body.code = form.code.trim();
      body.category = form.category;
      body.usesMarc = form.usesMarc;
    }
    if (form.category === "PHYSICAL") {
      body.maxLoanCount = Number(form.maxLoanCount);
      body.loanPeriodDays = Number(form.loanPeriodDays);
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

  function openKdcModal() {
    setShowKdcForm(false);
    setKdcEditingId(null);
    setKdcForm(EMPTY_KDC_FORM);
    setShowKdcModal(true);
  }

  function closeKdcModal() {
    setShowKdcModal(false);
    setShowKdcForm(false);
    setKdcEditingId(null);
    setKdcForm(EMPTY_KDC_FORM);
  }

  function openAddKdcForm() {
    setKdcEditingId(null);
    setKdcForm(EMPTY_KDC_FORM);
    setShowKdcForm(true);
  }

  function openEditKdcForm(rule: KdcRule) {
    setKdcEditingId(rule.id);
    setKdcForm({ kdcPrefix: rule.kdcPrefix, label: rule.label, maxLoanCount: String(rule.maxLoanCount) });
    setShowKdcForm(true);
  }

  async function handleSaveKdc() {
    if (!bookType) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!kdcForm.kdcPrefix.trim() || !kdcForm.label.trim() || !kdcForm.maxLoanCount.trim()) {
      notify("❌ " + t("settings.materialTypes.kdc.fieldsRequired"), "error");
      return;
    }
    const body = {
      kdcPrefix: kdcForm.kdcPrefix.trim(),
      label: kdcForm.label.trim(),
      maxLoanCount: Number(kdcForm.maxLoanCount),
    };
    const url = kdcEditingId
      ? `${API_URL}/material-types/kdc-rules/${kdcEditingId}`
      : `${API_URL}/material-types/${bookType.id}/kdc-rules`;
    const res = await fetch(url, {
      method: kdcEditingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.kdc.saveSuccess"), "success");
      setShowKdcForm(false);
      setKdcEditingId(null);
      setKdcForm(EMPTY_KDC_FORM);
      await loadTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.kdc.saveFail")), "error");
    }
  }

  async function handleDeleteKdc() {
    if (!kdcEditingId) return;
    if (!window.confirm(t("settings.materialTypes.kdc.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types/kdc-rules/${kdcEditingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.materialTypes.kdc.deleteSuccess"), "success");
      setShowKdcForm(false);
      setKdcEditingId(null);
      setKdcForm(EMPTY_KDC_FORM);
      await loadTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.kdc.deleteFail")), "error");
    }
  }

  function renderTable(category: "PHYSICAL" | "DIGITAL") {
    const rows = types.filter((mt) => mt.category === category);
    return (
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500">
            <tr>
              <th className="px-3 py-2">{t("settings.materialTypes.col.nameKo")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.code")}</th>
              <th className="px-3 py-2">{t("settings.materialTypes.col.usesMarc")}</th>
              {category === "PHYSICAL" && (
                <>
                  <th className="px-3 py-2">{t("settings.materialTypes.col.maxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.materialTypes.col.loanPeriodDays")}</th>
                </>
              )}
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
                {category === "PHYSICAL" && (
                  <>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.loanPeriodDays ?? "-"}</td>
                  </>
                )}
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="cursor-pointer rounded border px-2 py-1 text-xs"
                    >
                      {t("settings.materialTypes.editBtn")}
                    </button>
                    {item.code === "book" && (
                      <button
                        type="button"
                        onClick={openKdcModal}
                        className="cursor-pointer rounded border px-2 py-1 text-xs"
                      >
                        {t("settings.materialTypes.kdcBtn")}
                      </button>
                    )}
                  </div>
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

                {form.category === "PHYSICAL" && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.maxLoanCount")} *</span>
                      <input
                        type="number"
                        min={1}
                        value={form.maxLoanCount}
                        onChange={(e) => setForm({ ...form, maxLoanCount: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.field.loanPeriodDays")} *</span>
                      <input
                        type="number"
                        min={1}
                        value={form.loanPeriodDays}
                        onChange={(e) => setForm({ ...form, loanPeriodDays: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </>
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

      {showKdcModal && bookType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeKdcModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.materialTypes.kdc.modalTitle")}</p>

              <div className="flex flex-col gap-2">
                {bookType.kdcRules.length === 0 && (
                  <p className="text-sm text-neutral-400">{t("settings.materialTypes.kdc.empty")}</p>
                )}
                {bookType.kdcRules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => openEditKdcForm(rule)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      kdcEditingId === rule.id ? "border-neutral-800" : "border-neutral-200"
                    }`}
                  >
                    <span>{rule.label} ({rule.kdcPrefix})</span>
                    <span className="text-neutral-500">{rule.maxLoanCount}권</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={openAddKdcForm}
                className="mt-3 w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
              >
                {t("settings.materialTypes.kdc.addBtn")}
              </button>

              {showKdcForm && (
                <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                  <p className="text-sm font-semibold">
                    {kdcEditingId ? t("settings.materialTypes.kdc.modal.editTitle") : t("settings.materialTypes.kdc.modal.addTitle")}
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.kdc.field.kdcPrefix")}</span>
                    <input
                      value={kdcForm.kdcPrefix}
                      onChange={(e) => setKdcForm({ ...kdcForm, kdcPrefix: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.kdc.field.label")}</span>
                    <input
                      value={kdcForm.label}
                      onChange={(e) => setKdcForm({ ...kdcForm, label: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.materialTypes.kdc.field.maxLoanCount")}</span>
                    <input
                      type="number"
                      min={1}
                      value={kdcForm.maxLoanCount}
                      onChange={(e) => setKdcForm({ ...kdcForm, maxLoanCount: e.target.value })}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <ThemedButton preset="버튼1" onClick={handleSaveKdc} className="w-full">
                    {t("settings.materialTypes.kdc.save")}
                  </ThemedButton>

                  {kdcEditingId && (
                    <button
                      onClick={handleDeleteKdc}
                      className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      {t("settings.materialTypes.kdc.deleteBtn")}
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={closeKdcModal}
                className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
              >
                {t("settings.materialTypes.kdc.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}