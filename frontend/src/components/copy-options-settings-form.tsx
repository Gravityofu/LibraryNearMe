"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type OptionItem = {
  id: number;
  category: string;
  value: string;
  order: number;
  floor?: string | null;
  detail?: string | null;
  canLoan?: boolean;
  canReserve?: boolean;
};
type OptionsState = { STATUS: OptionItem[]; SPECIAL_CODE: OptionItem[]; LOCATION: OptionItem[]; FLOOR: OptionItem[] };

const EMPTY_OPTIONS: OptionsState = { STATUS: [], SPECIAL_CODE: [], LOCATION: [], FLOOR: [] };

const CATEGORIES: { key: keyof OptionsState; labelKey: string }[] = [
  { key: "STATUS", labelKey: "settings.copyOptions.category.status" },
  { key: "SPECIAL_CODE", labelKey: "settings.copyOptions.category.specialCode" },
  { key: "FLOOR", labelKey: "settings.copyOptions.category.floor" },
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
  // 지금 열려있는 수정 모달이 보호된 값(별치기호의 '(없음)')인지 여부입니다.
  const [editingIsProtected, setEditingIsProtected] = useState(false);

  // 소장처를 층 + 세부위치로 나눠서 입력할지 여부입니다.
  // 새로 추가할 때는 항상 true, 수정할 때는 그 소장처가 층 정보를 갖고 있을 때만 true입니다.
  const [locationHasFloor, setLocationHasFloor] = useState(false);
  const [floorValue, setFloorValue] = useState("");
  const [detailValue, setDetailValue] = useState("");

  // '상태' 값을 추가/수정할 때만 쓰는, 대출 가능 자료 / 예약 가능 자료 여부입니다.
  const [canLoanValue, setCanLoanValue] = useState(false);
  const [canReserveValue, setCanReserveValue] = useState(false);

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
    setEditingIsProtected(false);
    setCanLoanValue(false);
    setCanReserveValue(false);
    if (category === "LOCATION") {
      setLocationHasFloor(true);
      setFloorValue(options.FLOOR[0]?.value || "");
      setDetailValue("");
    } else {
      setLocationHasFloor(false);
    }
    setShowModal(true);
  }

  function openEditModal(category: keyof OptionsState, item: OptionItem) {
    setModalCategory(category);
    setEditingId(item.id);
    setValueText(item.value);
    setEditingIsProtected(category === "SPECIAL_CODE" && item.value === "(없음)");
    setCanLoanValue(!!item.canLoan);
    setCanReserveValue(!!item.canReserve);
    if (category === "LOCATION" && item.floor) {
      // 층 정보가 있는 소장처는 수정할 때도 층 선택 + 세부위치 입력 방식을 씁니다.
      setLocationHasFloor(true);
      setFloorValue(item.floor);
      setDetailValue(item.detail || "");
    } else {
      // 층 정보가 없는(예전에 자유롭게 입력한) 소장처는 자동으로 매칭이 안 됐을 수 있으니
      // 기존처럼 한 문장을 통째로 수정하는 방식으로 보여줍니다.
      setLocationHasFloor(false);
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;

    let body: any;

    if (modalCategory === "LOCATION" && locationHasFloor) {
      if (!floorValue) {
        notify("❌ " + t("settings.copyOptions.noFloorOptions"), "error");
        return;
      }
      if (!detailValue.trim()) {
        notify("❌ " + t("settings.copyOptions.detailRequired"), "error");
        return;
      }
      body = { category: modalCategory, floor: floorValue, detail: detailValue.trim() };
    } else {
      const finalValue = valueText.trim();
      if (!finalValue) {
        notify("❌ " + t("settings.copyOptions.valueRequired"), "error");
        return;
      }
      body = { category: modalCategory, value: finalValue };
    }

    // '상태'는 대출 가능 자료 / 예약 가능 자료 여부도 함께 보냅니다.
    if (modalCategory === "STATUS") {
      body.canLoan = canLoanValue;
      body.canReserve = canReserveValue;
    }

    const url = editingId ? `${API_URL}/copy-options/${editingId}` : `${API_URL}/copy-options`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      notify("✅ " + t("settings.copyOptions.saveSuccess"), "success");
      closeModal();
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
      closeModal();
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

          {cat.key === "STATUS" ? (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 text-neutral-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5">{t("settings.copyOptions.table.value")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5">{t("settings.copyOptions.canLoan")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5">{t("settings.copyOptions.canReserve")}</th>
                  </tr>
                </thead>
                <tbody>
                  {options.STATUS.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openEditModal("STATUS", item)}
                      className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium">{item.value}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {item.canLoan ? t("settings.copyOptions.yes") : t("settings.copyOptions.no")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {item.canReserve ? t("settings.copyOptions.yes") : t("settings.copyOptions.no")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => openAddModal("STATUS")}
                className="w-full cursor-pointer border-t border-dashed border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
              >
                {t("settings.copyOptions.addBtn")}
              </button>
            </div>
          ) : (
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
          )}
        </div>
      ))}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">
                {editingId ? t("settings.copyOptions.modal.editTitle") : t("settings.copyOptions.modal.addTitle")}
              </p>

              {modalCategory === "LOCATION" && locationHasFloor ? (
                options.FLOOR.length === 0 ? (
                  <p className="text-sm text-red-500">{t("settings.copyOptions.noFloorOptions")}</p>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm text-neutral-500">{t("settings.copyOptions.floorLabel")} *</span>
                      <select
                        value={floorValue}
                        onChange={(e) => setFloorValue(e.target.value)}
                        className="w-full cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      >
                        {options.FLOOR.map((o) => (
                          <option key={o.id} value={o.value}>
                            {o.value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block">
                      <span className="mb-1 block text-sm text-neutral-500">{t("settings.copyOptions.detailLabel")} *</span>
                      <input
                        value={detailValue}
                        onChange={(e) => setDetailValue(e.target.value)}
                        placeholder={t("settings.copyOptions.detailPlaceholder")}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </>
                )
              ) : (
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.copyOptions.field.value")} *</span>
                  <input
                    value={valueText}
                    onChange={(e) => setValueText(e.target.value)}
                    disabled={editingIsProtected}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                  {editingIsProtected && (
                    <p className="mt-1 text-xs text-neutral-400">{t("settings.copyOptions.protectedNote")}</p>
                  )}
                </label>
              )}

              {modalCategory === "STATUS" && (
                <div className="mt-3 flex flex-col gap-3">
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.copyOptions.canLoan")}</span>
                    <select
                      value={canLoanValue ? "Y" : "N"}
                      onChange={(e) => setCanLoanValue(e.target.value === "Y")}
                      className="w-full cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <option value="Y">{t("settings.copyOptions.yes")}</option>
                      <option value="N">{t("settings.copyOptions.no")}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-neutral-500">{t("settings.copyOptions.canReserve")}</span>
                    <select
                      value={canReserveValue ? "Y" : "N"}
                      onChange={(e) => setCanReserveValue(e.target.value === "Y")}
                      className="w-full cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <option value="Y">{t("settings.copyOptions.yes")}</option>
                      <option value="N">{t("settings.copyOptions.no")}</option>
                    </select>
                  </label>
                </div>
              )}

              <ThemedButton preset="버튼1" onClick={handleSave} className="mt-5 w-full">
                {t("settings.copyOptions.save")}
              </ThemedButton>

              {editingId && !editingIsProtected && (
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