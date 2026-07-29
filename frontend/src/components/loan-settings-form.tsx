"use client";

import { useEffect, useState } from "react";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useNotify } from "@/components/notify-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MemberLoanSetting = {
  memberTypeId: number;
  memberTypeName: string;
  maxLoanCount: number;
  maxReservationCount: number;
  maxSuspensionDays: number | null;
  reservationHoldDays: number;
};

type KdcRule = { id: number; kdcPrefix: string; label: string; maxLoanCount: number };
type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  category: "PHYSICAL" | "DIGITAL";
  maxLoanCount: number | null;
  loanPeriodDays: number | null;
  maxReservationCount: number | null;
  kdcRules: KdcRule[];
};

const EMPTY_MEMBER_FORM = {
  maxLoanCount: "",
  maxReservationCount: "",
  maxSuspensionDays: "",
  reservationHoldDays: "",
};

const EMPTY_MATERIAL_FORM = {
  maxLoanCount: "",
  loanPeriodDays: "",
  maxReservationCount: "",
};

const EMPTY_KDC_FORM = { kdcPrefix: "", label: "", maxLoanCount: "" };

export default function LoanSettingsForm() {
  const { t } = useI18n();
  const { notify } = useNotify();

  const [memberSettings, setMemberSettings] = useState<MemberLoanSetting[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberTypeId, setEditingMemberTypeId] = useState<number | null>(null);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL_FORM);

  const [showKdcModal, setShowKdcModal] = useState(false);
  const [showKdcForm, setShowKdcForm] = useState(false);
  const [kdcEditingId, setKdcEditingId] = useState<number | null>(null);
  const [kdcForm, setKdcForm] = useState(EMPTY_KDC_FORM);

  async function loadMemberSettings() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-settings/member-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMemberSettings(await res.json());
    } else {
      notify("❌ " + t("settings.loan.loadFail"), "error");
    }
  }

  async function loadMaterialTypes() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/material-types`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMaterialTypes(await res.json());
    }
  }

  useEffect(() => {
    loadMemberSettings();
    loadMaterialTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openMemberModal(item: MemberLoanSetting) {
    setEditingMemberTypeId(item.memberTypeId);
    setMemberForm({
      maxLoanCount: String(item.maxLoanCount),
      maxReservationCount: String(item.maxReservationCount),
      maxSuspensionDays: item.maxSuspensionDays !== null ? String(item.maxSuspensionDays) : "",
      reservationHoldDays: String(item.reservationHoldDays),
    });
    setShowMemberModal(true);
  }

  function closeMemberModal() {
    setShowMemberModal(false);
    setEditingMemberTypeId(null);
  }

  async function handleSaveMember() {
    if (!editingMemberTypeId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/loan-settings/member-types/${editingMemberTypeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxLoanCount: memberForm.maxLoanCount,
        maxReservationCount: memberForm.maxReservationCount,
        maxSuspensionDays: memberForm.maxSuspensionDays === "" ? null : memberForm.maxSuspensionDays,
        reservationHoldDays: memberForm.reservationHoldDays,
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.loan.saveSuccess"), "success");
      closeMemberModal();
      await loadMemberSettings();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.loan.saveFail")), "error");
    }
  }

  function openMaterialModal(item: MaterialType) {
    setEditingMaterialId(item.id);
    setMaterialForm({
      maxLoanCount: item.maxLoanCount !== null ? String(item.maxLoanCount) : "",
      loanPeriodDays: item.loanPeriodDays !== null ? String(item.loanPeriodDays) : "",
      maxReservationCount: item.maxReservationCount !== null ? String(item.maxReservationCount) : "",
    });
    setShowMaterialModal(true);
  }

  function closeMaterialModal() {
    setShowMaterialModal(false);
    setEditingMaterialId(null);
  }

  async function handleSaveMaterial() {
    if (!editingMaterialId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (
      !materialForm.maxLoanCount.trim() ||
      !materialForm.loanPeriodDays.trim() ||
      !materialForm.maxReservationCount.trim()
    ) {
      notify("❌ " + t("settings.loan.materialFieldsRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/material-types/${editingMaterialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        maxLoanCount: Number(materialForm.maxLoanCount),
        loanPeriodDays: Number(materialForm.loanPeriodDays),
        maxReservationCount: Number(materialForm.maxReservationCount),
      }),
    });
    if (res.ok) {
      notify("✅ " + t("settings.loan.saveSuccess"), "success");
      closeMaterialModal();
      await loadMaterialTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.loan.saveFail")), "error");
    }
  }

  const physicalTypes = materialTypes.filter((mt) => mt.category === "PHYSICAL");
  const bookType = physicalTypes.find((mt) => mt.code === "book");

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
      await loadMaterialTypes();
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
      await loadMaterialTypes();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("settings.materialTypes.kdc.deleteFail")), "error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.loan.sectionPhysical")}</p>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-neutral-600">{t("settings.loan.defaultTitle")}</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.loan.col.memberType")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxReservationCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.maxSuspensionDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.reservationHoldDays")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {memberSettings.map((item) => (
                  <tr
                    key={item.memberTypeId}
                    onClick={() => openMemberModal(item)}
                    className="cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{item.memberTypeName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxReservationCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                      {item.maxSuspensionDays !== null ? item.maxSuspensionDays : t("settings.loan.noLimit")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.reservationHoldDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-600">{t("settings.loan.materialTitle")}</p>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-3 py-2">{t("settings.loan.col.materialType")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.materialMaxLoanCount")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.loanPeriodDays")}</th>
                  <th className="px-3 py-2">{t("settings.loan.col.materialMaxReservationCount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {physicalTypes.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openMaterialModal(item)}
                    className="cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      <div className="flex items-center gap-3">
                        <span>{item.nameKo}</span>
                        {item.code === "book" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openKdcModal();
                            }}
                            className="cursor-pointer rounded border px-2 py-1 text-xs"
                          >
                            {t("settings.materialTypes.kdcBtn")}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxLoanCount ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.loanPeriodDays ?? "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{item.maxReservationCount ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t("settings.loan.sectionDigital")}</p>
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
          {t("settings.loan.digitalNotice")}
        </p>
      </div>

      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMemberModal}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.loan.member.modalTitle")}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxLoanCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxLoanCount}
                    onChange={(e) => setMemberForm({ ...memberForm, maxLoanCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxReservationCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxReservationCount}
                    onChange={(e) => setMemberForm({ ...memberForm, maxReservationCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.maxSuspensionDays")}</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.maxSuspensionDays}
                    onChange={(e) => setMemberForm({ ...memberForm, maxSuspensionDays: e.target.value })}
                    placeholder={t("settings.loan.maxSuspensionDaysPlaceholder")}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-neutral-400">{t("settings.loan.maxSuspensionDaysHint")}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.reservationHoldDays")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={memberForm.reservationHoldDays}
                    onChange={(e) => setMemberForm({ ...memberForm, reservationHoldDays: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <ThemedButton preset="버튼1" onClick={handleSaveMember} className="mt-5 w-full">
                {t("settings.loan.save")}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeMaterialModal}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <p className="mb-4 text-sm font-semibold">{t("settings.loan.material.modalTitle")}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.materialMaxLoanCount")} *</span>
                  <input
                    type="number"
                    min={1}
                    value={materialForm.maxLoanCount}
                    onChange={(e) => setMaterialForm({ ...materialForm, maxLoanCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.loanPeriodDays")} *</span>
                  <input
                    type="number"
                    min={1}
                    value={materialForm.loanPeriodDays}
                    onChange={(e) => setMaterialForm({ ...materialForm, loanPeriodDays: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("settings.loan.col.materialMaxReservationCount")} *</span>
                  <input
                    type="number"
                    min={0}
                    value={materialForm.maxReservationCount}
                    onChange={(e) => setMaterialForm({ ...materialForm, maxReservationCount: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <ThemedButton preset="버튼1" onClick={handleSaveMaterial} className="mt-5 w-full">
                {t("settings.loan.save")}
              </ThemedButton>
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
              <p className="mb-1 text-sm font-semibold">{t("settings.materialTypes.kdc.modalTitle")}</p>
              <p className="mb-4 text-xs text-neutral-400">
                {t("settings.materialTypes.kdc.parentMaxLoanCountLabel")}: {bookType.maxLoanCount ?? "-"}
                {bookType.maxLoanCount !== null ? t("settings.materialTypes.kdc.countUnit") : ""}
              </p>

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