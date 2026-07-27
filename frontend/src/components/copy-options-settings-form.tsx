"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type OptionItem = { id: number; category: string; value: string; order: number };
type OptionsState = { STATUS: OptionItem[]; SPECIAL_CODE: OptionItem[]; LOCATION: OptionItem[] };

const EMPTY_OPTIONS: OptionsState = { STATUS: [], SPECIAL_CODE: [], LOCATION: [] };

const CATEGORIES: { key: keyof OptionsState; labelKey: string }[] = [
  { key: "STATUS", labelKey: "settings.copyOptions.category.status" },
  { key: "SPECIAL_CODE", labelKey: "settings.copyOptions.category.specialCode" },
  { key: "LOCATION", labelKey: "settings.copyOptions.category.location" },
];

export default function CopyOptionsSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [options, setOptions] = useState<OptionsState>(EMPTY_OPTIONS);
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<keyof OptionsState>("STATUS");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [valueText, setValueText] = useState("");

  async function loadOptions() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copy-options`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setOptions(await res.json());
    } else {
      notify("❌ " + t("settings.copyOptions.loadFail"), "error");
    }
  }

  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal(category: keyof OptionsState) {
    setModalCategory(category);
    setEditingId(null);
    setValueText("");
    setShowModal(true);
  }

  function openEditModal(category: keyof OptionsState, item: OptionItem) {
    setModalCategory(category);
    setEditingId(item.id);
    setValueText(item.value);
    setShowModal(true);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!valueText.trim()) {
      notify("❌ " + t("settings.copyOptions.valueRequired"), "error");
      return;
    }
    const url = editingId ? `${API_URL}/copy-options/${editingId}` : `${API_URL}/copy-options`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category: modalCategory, value: valueText.trim() }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.copyOptions.saveSuccess"), "success");
      setShowModal(false);
      await loadOptions();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.copyOptions.saveFail")), "error");
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    if (!window.confirm(t("settings.copyOptions.deleteConfirm"))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copy-options/${editingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("settings.copyOptions.deleteSuccess"), "success");
      setShowModal(false);
      await loadOptions();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.copyOptions.deleteFail")), "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {CATEGORIES.map((cat) => (
        <div key={cat.key}>
          <p className="mb-2 text-sm font-semibold">{t(cat.labelKey)}</p>
          <div className="flex flex-wrap gap-2">
            {options[cat.key].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEditModal(cat.key, item)}
                className="cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              >
                {item.value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => openAddModal(cat.key)}
              className="cursor-pointer rounded-full border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
            >
              {t("settings.copyOptions.addBtn")}
            </button>
          </div>
        </div>
      ))}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">
                {editingId ? t("settings.copyOptions.modal.editTitle") : t("settings.copyOptions.modal.addTitle")}
              </p>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("settings.copyOptions.field.value")} *</span>
                <input
                  value={valueText}
                  onChange={(e) => setValueText(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>

              <ThemedButton preset="버튼1" onClick={handleSave} className="mt-5 w-full">
                {t("settings.copyOptions.save")}
              </ThemedButton>

              {editingId && (
                <button
                  onClick={handleDelete}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("settings.copyOptions.deleteBtn")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}