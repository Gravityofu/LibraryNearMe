"use client";

import ThemedButton from "@/components/themed-button";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNotify } from "@/components/notify-provider";
import { useI18n } from "@/components/language-provider";
import MarcEditor, { DEFAULT_FIELDS, MarcField } from "@/components/marc-editor";
import AdminBackButton from "@/components/admin-back-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CopyItem = {
  id: number;
  registrationNo: string;
  callNumber?: string;
  authorCode?: string;
  specialCode?: string;
  shelfNo?: string;
  location?: string;
  memo?: string;
  status: string;
  volume?: string;
  copyNumber?: string;
};

type MaterialFull = {
  id: number;
  type: string;
  title: string;
  creator?: string;
  publisher?: string;
  pubYear?: string;
  classNumber?: string;
  marc?: MarcField[];
  copies: CopyItem[];
};

type MaterialType = {
  id: number;
  code: string;
  nameKo: string;
  nameEn: string;
  category: "PHYSICAL" | "DIGITAL";
  usesMarc: boolean;
};

type OptionItem = { id: number; category: string; value: string; order: number };
type OptionsState = { STATUS: OptionItem[]; SPECIAL_CODE: OptionItem[]; LOCATION: OptionItem[] };

const EMPTY_OPTIONS: OptionsState = { STATUS: [], SPECIAL_CODE: [], LOCATION: [] };

const EMPTY_FORM = {
  registrationNo: "",
  callNumber: "",
  authorCode: "",
  specialCode: "",
  shelfNo: "",
  location: "",
  memo: "",
  status: "",
  volume: "",
  copyNumber: "",
};

// MARC를 쓰지 않는 자료의 정보 화면에 보여줄 항목 목록이에요.
const SIMPLE_MATERIAL_FIELDS = [
  { key: "title", labelKey: "materials.new.field.title", required: true },
  { key: "creator", labelKey: "materials.new.field.creator" },
  { key: "publisher", labelKey: "materials.new.field.publisher" },
  { key: "pubYear", labelKey: "materials.new.field.pubYear" },
  { key: "isbn", labelKey: "materials.new.field.isbn" },
  { key: "classNumber", labelKey: "materials.new.field.classNumber" },
  { key: "format", labelKey: "materials.new.field.format" },
  { key: "subject", labelKey: "materials.new.field.subject" },
  { key: "language", labelKey: "materials.new.field.language" },
  { key: "summary", labelKey: "materials.new.field.summary" },
  { key: "coverUrl", labelKey: "materials.new.field.coverUrl" },
  { key: "onlineUrl", labelKey: "materials.new.field.onlineUrl" },
];

const EMPTY_SIMPLE_FORM = {
  title: "",
  creator: "",
  publisher: "",
  pubYear: "",
  isbn: "",
  classNumber: "",
  format: "",
  subject: "",
  language: "",
  summary: "",
  coverUrl: "",
  onlineUrl: "",
};

// MARC 목록에서 090 태그의 ▼b(저자기호)를 찾아옵니다.
function findAuthorCode(marc?: { tag: string; value: string }[]) {
  const field = marc?.find((f) => f.tag === "090");
  if (!field) return "";
  const part = field.value.split("▼").find((p) => p.startsWith("b"));
  return part ? part.slice(1).trim() : "";
}

// 가장 최근 등록번호의 다음 숫자를 계산합니다. (등록번호는 1,2,3... 순수 숫자입니다.)
function computeNextRegNo(latest: string | null): string {
  if (!latest) return "1";
  const n = parseInt(latest, 10);
  if (Number.isNaN(n)) return "";
  return String(n + 1);
}

function CopiesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialId = searchParams.get("materialId");

  const { notify } = useNotify();
  const { t } = useI18n();

  const [material, setMaterial] = useState<MaterialFull | null>(null);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [simpleForm, setSimpleForm] = useState(EMPTY_SIMPLE_FORM);
  const [marc, setMarc] = useState<MarcField[]>(DEFAULT_FIELDS);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);
  const [latestRegNo, setLatestRegNo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [showModal, setShowModal] = useState(false);
  const [copyOptions, setCopyOptions] = useState<OptionsState>(EMPTY_OPTIONS);
  const [showDeleteCopyConfirm, setShowDeleteCopyConfirm] = useState(false);
  const [showDeleteMaterialConfirm, setShowDeleteMaterialConfirm] = useState(false);

  async function loadMaterial(id: string) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setMaterial(data);
      setMarc(Array.isArray(data.marc) && data.marc.length > 0 ? data.marc : DEFAULT_FIELDS);
      setSimpleForm({
        title: data.title || "",
        creator: data.creator || "",
        publisher: data.publisher || "",
        pubYear: data.pubYear || "",
        isbn: data.isbn || "",
        classNumber: data.classNumber || "",
        format: data.format || "",
        subject: data.subject || "",
        language: data.language || "",
        summary: data.summary || "",
        coverUrl: data.coverUrl || "",
        onlineUrl: data.onlineUrl || "",
      });

      setForm((prev) => ({ ...EMPTY_FORM, authorCode: findAuthorCode(data.marc), registrationNo: prev.registrationNo }));
      setSelectedCopyId(null);

    } else {
      notify("❌ " + t("materials.copies.loadFail"), "error");
    }
  }

  async function refreshMaterial(id: number) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMaterial(data);
      setSimpleForm({
        title: data.title || "",
        creator: data.creator || "",
        publisher: data.publisher || "",
        pubYear: data.pubYear || "",
        isbn: data.isbn || "",
        classNumber: data.classNumber || "",
        format: data.format || "",
        subject: data.subject || "",
        language: data.language || "",
        summary: data.summary || "",
        coverUrl: data.coverUrl || "",
        onlineUrl: data.onlineUrl || "",
      });
    }
  }

  async function loadLatestRegNo() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copies/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setLatestRegNo(data.registrationNo);
      setForm((prev) => ({ ...prev, registrationNo: computeNextRegNo(data.registrationNo) }));
    }
  }

  async function loadCopyOptions() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copy-options`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCopyOptions(await res.json());
    }
  }

  // 자료 종류 목록 — 이 자료가 실물 자료인지 디지털 자료인지, MARC를 쓰는지 여기서 확인해요.
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
    if (materialId) loadMaterial(materialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  useEffect(() => {
    loadLatestRegNo();
    loadCopyOptions();
    loadMaterialTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => setPrimaryColor(data?.primaryColor || "#2563eb"))
      .catch(() => {});
  }, []);

  function selectCopy(copy: CopyItem) {
    setSelectedCopyId(copy.id);
    setForm({
      registrationNo: copy.registrationNo,
      callNumber: copy.callNumber || "",
      authorCode: copy.authorCode || "",
      specialCode: copy.specialCode || "",
      shelfNo: copy.shelfNo || "",
      location: copy.location || "",
      memo: copy.memo || "",
      status: copy.status || "",
      volume: copy.volume || "",
      copyNumber: copy.copyNumber || "",
    });
  }

  function resetForm() {
    setSelectedCopyId(null);
    setForm({
      ...EMPTY_FORM,
      authorCode: findAuthorCode(marc),
      registrationNo: computeNextRegNo(latestRegNo),
      status: copyOptions.STATUS[0]?.value || "",
      specialCode: copyOptions.SPECIAL_CODE[0]?.value || "",
      location: copyOptions.LOCATION[0]?.value || "",
    });
  }

  // '새 실물 자료 등록' 행을 클릭했을 때: 폼을 비우고 모달을 엽니다.
  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  // 기존 실물 자료 행을 클릭했을 때: 그 자료 값으로 폼을 채우고 모달을 엽니다.
  function openEditModal(copy: CopyItem) {
    selectCopy(copy);
    setShowModal(true);
  }

  // 모달을 닫을 때는 선택 표시(배경색)도 함께 없애줍니다.
  function closeModal() {
    setShowModal(false);
    setSelectedCopyId(null);
  }

  async function handleSaveMarc() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${material.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ marc, coverUrl: simpleForm.coverUrl }),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.marcSaveSuccess"), "success");
      await refreshMaterial(material.id);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.marcSaveFail")), "error");
    }
  }

  // MARC를 쓰지 않는 자료의 정보를 저장합니다.
  async function handleSaveSimple() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!simpleForm.title.trim()) {
      notify("❌ " + t("materials.copies.titleRequired"), "error");
      return;
    }
    const res = await fetch(`${API_URL}/materials/${material.id}/simple`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(simpleForm),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.simpleSaveSuccess"), "success");
      await refreshMaterial(material.id);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.simpleSaveFail")), "error");
    }
  }

  // 자료(서지) 자체를 삭제합니다. 실물이 남아있으면 서버가 막고 이유를 알려줘요.
  // (삭제 확인 모달에서 '삭제'를 눌렀을 때 호출됩니다.)
  async function handleDeleteMaterial() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/${material.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.deleteMaterialSuccess"), "success");
      setShowDeleteMaterialConfirm(false);
      router.push("/admin/materials/list");
    } else {
      const data = await res.json().catch(() => null);
      setShowDeleteMaterialConfirm(false);
      notify("❌ " + (data?.message || t("materials.copies.deleteMaterialFail")), "error");
    }
  }

  // 등록번호·상태·청구기호·별치기호·소장처, 이 5개 항목이 모두 채워졌는지 확인합니다.
  function validateRequiredFields(): boolean {
    if (
      !form.registrationNo.trim() ||
      !form.status.trim() ||
      !form.callNumber.trim() ||
      !form.specialCode.trim() ||
      !form.location.trim()
    ) {
      notify("❌ " + t("materials.copies.requiredFieldsMissing"), "error");
      return false;
    }
    return true;
  }

  async function handleAddCopy() {
    if (!material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!validateRequiredFields()) return;
    const res = await fetch(`${API_URL}/materials/${material.id}/copies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      notify("✅ " + t("materials.copies.addSuccess"), "success");
      await refreshMaterial(material.id);
      resetForm();
      await loadLatestRegNo();
      closeModal();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.addFail")), "error");
    }
  }

  async function handleUpdateCopy() {
    if (!selectedCopyId || !material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!validateRequiredFields()) return;
    const res = await fetch(`${API_URL}/copies/${selectedCopyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.updateSuccess"), "success");
      await refreshMaterial(material.id);
      closeModal();
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.copies.updateFail")), "error");
    }
  }

  // 실물 삭제하기 (삭제 확인 모달에서 '삭제'를 눌렀을 때 호출됩니다.)
  async function handleDeleteCopy() {
    if (!selectedCopyId || !material) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/copies/${selectedCopyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      notify("✅ " + t("materials.copies.deleteSuccess"), "success");
      setShowDeleteCopyConfirm(false);
      await refreshMaterial(material.id);
      closeModal();
    } else {
      const data = await res.json().catch(() => null);
      setShowDeleteCopyConfirm(false);
      notify("❌ " + (data?.message || t("materials.copies.deleteFail")), "error");
    }
  }

  if (!materialId) {
    return (
      <div className="p-6">
        <p className="text-sm text-neutral-500">{t("materials.copies.noMaterialSelected")}</p>
        <Link
          href="/admin/materials/list"
          className="mt-3 inline-block cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm text-[#F9F6F0]"
        >
          {t("materials.copies.goToList")}
        </Link>
      </div>
    );
  }

  if (!material || materialTypes.length === 0) {
    return <p className="p-6 text-sm text-neutral-400">{t("materials.copies.loading")}</p>;
  }

  const typeInfo = materialTypes.find((m) => m.code === material.type);
  const usesMarc = typeInfo?.usesMarc ?? false;
  const isPhysical = typeInfo?.category === "PHYSICAL";
  // 실물 자료면 항상 보여주고, 디지털 자료라도 예전에 등록된 실물이 남아있으면 삭제할 수 있도록 보여줘요.
  const showCopyBox = isPhysical || material.copies.length > 0;

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-bold">{material.title}</h1>
        <AdminBackButton href="/admin/materials/list" />
      </div>
      <p className="mb-4 text-sm text-neutral-400">
        {material.creator || "-"} · {material.classNumber || "-"}
      </p>

      <div className={`grid grid-cols-1 gap-4 ${showCopyBox ? "md:grid-cols-2" : ""}`}>
        {/* 왼쪽: KOMARC 정보 */}
        <div className="max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
          <div className="p-3">
            <p className="mb-2 text-base font-semibold">
              {usesMarc ? t("materials.copies.marcBoxTitle") : t("materials.copies.simpleBoxTitle")}
            </p>
            {usesMarc ? (
              <>
                <label className="mb-3 block">
                  <span className="mb-1 block text-sm text-neutral-500">{t("materials.new.field.coverUrl")}</span>
                  <input
                    value={simpleForm.coverUrl}
                    onChange={(e) => setSimpleForm({ ...simpleForm, coverUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <MarcEditor fields={marc} onChange={setMarc} />
                <button
                  type="button"
                  onClick={handleSaveMarc}
                  className="mt-3 cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold"
                >
                  {t("materials.copies.marcEditSave")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteMaterialConfirm(true)}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("materials.copies.deleteMaterialBtn")}
                </button>
              </>
            ) : (
              <div>
                <div className="space-y-3">
                  {SIMPLE_MATERIAL_FIELDS.filter((f) => f.key !== "onlineUrl" || !isPhysical).map((f) => (
                    <label key={f.key} className="block">
                      <span className="mb-1 block text-sm text-neutral-500">
                        {t(f.labelKey)}
                        {f.required && " *"}
                      </span>
                      <input
                        value={simpleForm[f.key as keyof typeof simpleForm]}
                        onChange={(e) => setSimpleForm({ ...simpleForm, [f.key]: e.target.value })}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <ThemedButton preset="버튼1" onClick={handleSaveSimple} className="w-full">
                    {t("materials.copies.save")}
                  </ThemedButton>
                </div>

                <button
                  onClick={() => setShowDeleteMaterialConfirm(true)}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {t("materials.copies.deleteMaterialBtn")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 실물 자료 목록 — 실물 자료거나, 디지털 자료라도 예전에 등록된 실물이 남아있으면 보여요. */}
        {showCopyBox && (
          <div className="max-h-[75vh] overflow-auto rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-base font-semibold">
              {t("materials.copies.copyListHeading")} ({material.copies.length}
              {t("materials.copies.countUnitBooks")})
            </p>

            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-2 py-1.5">{t("materials.copies.regNo")}</th>
                  <th className="px-2 py-1.5">{t("materials.copies.callNumber")}</th>
                  <th className="px-2 py-1.5">{t("materials.copies.location")}</th>
                  <th className="px-2 py-1.5">{t("materials.copies.status")}</th>
                </tr>
              </thead>           
              <tbody className="divide-y divide-neutral-200">
                {isPhysical && (
                  <tr onClick={openAddModal} className="cursor-pointer">
                    <td
                      colSpan={4}
                      className="px-2 py-2 text-center font-semibold"
                      style={{ backgroundColor: "#383838", color: "#F9F6F0" }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs leading-none"
                          style={{ borderColor: "currentColor" }}
                        >
                          +
                        </span>
                        {t("materials.copies.newRegistrationRow")}
                      </span>
                    </td>
                  </tr>
                )}

                {material.copies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openEditModal(c)}
                    className={`cursor-pointer ${selectedCopyId === c.id ? "" : "hover:bg-neutral-50"}`}
                    style={selectedCopyId === c.id ? { backgroundColor: primaryColor, color: "#ffffff" } : undefined}
                  >
                    <td className="whitespace-nowrap px-2 py-2">{c.registrationNo}</td>
                    <td className="whitespace-nowrap px-2 py-2">{c.callNumber || "-"}</td>
                    <td className="whitespace-nowrap px-2 py-2">{c.location || "-"}</td>
                    <td className="whitespace-nowrap px-2 py-2">{c.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!showCopyBox && (
        <p className="mt-4 text-sm text-neutral-400">{t("materials.copies.digitalNotice")}</p>
      )}

      {/* 실물 자료 등록/수정 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="max-h-[85vh] overflow-y-auto p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">
                {selectedCopyId ? t("materials.copies.editHeading") : t("materials.copies.addHeading")}
              </p>
              <button
                type="button"
                onClick={closeModal}
                className="cursor-pointer rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">
                  {t("materials.copies.regNo")} *
                  {!selectedCopyId && latestRegNo && (
                    <span className="ml-2 text-xs text-neutral-400">
                      ({t("materials.copies.latestRegNo")}: {latestRegNo})
                    </span>
                  )}
                </span>
                <input
                  value={form.registrationNo}
                  onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.callNumber")} *</span>
                <input
                  value={form.callNumber}
                  onChange={(e) => setForm({ ...form, callNumber: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.authorCode")}</span>
                <input
                  value={form.authorCode}
                  onChange={(e) => setForm({ ...form, authorCode: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.volume")}</span>
                <input
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  placeholder="예: v.1"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.copyNumber")}</span>
                <input
                  value={form.copyNumber}
                  onChange={(e) => setForm({ ...form, copyNumber: e.target.value })}
                  placeholder="예: c.1"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.status")} *</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {copyOptions.STATUS.map((o) => (
                    <option key={o.id} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.specialCode")} *</span>

                <select
                  value={form.specialCode}
                  onChange={(e) => setForm({ ...form, specialCode: e.target.value })}
                  className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {copyOptions.SPECIAL_CODE.map((o) => (
                    <option key={o.id} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.shelfNo")}</span>
                <input
                  value={form.shelfNo}
                  onChange={(e) => setForm({ ...form, shelfNo: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.location")} *</span>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {copyOptions.LOCATION.map((o) => (
                    <option key={o.id} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.memo")}</span>
                <input
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4">
              <ThemedButton
                preset="버튼1"
                onClick={selectedCopyId ? handleUpdateCopy : handleAddCopy}
                className="w-full"
              >
                {t("materials.copies.save")}
              </ThemedButton>
            </div>

            {selectedCopyId && (
              <button
                onClick={() => setShowDeleteCopyConfirm(true)}
                className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("materials.copies.deleteBtn")}
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* 실물 자료 삭제 확인 모달 */}
      {showDeleteCopyConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDeleteCopyConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="whitespace-pre-line text-center text-[15px] leading-relaxed text-neutral-800">
              {t("materials.copies.deleteConfirm")}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowDeleteCopyConfirm(false)}
                className="w-full cursor-pointer rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("materials.copies.deleteCancelBtn")}
              </button>
              <button
                onClick={handleDeleteCopy}
                className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("materials.copies.deleteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 자료(서지) 삭제 확인 모달 */}
      {showDeleteMaterialConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDeleteMaterialConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="whitespace-pre-line text-center text-[15px] leading-relaxed text-neutral-800">
              {t("materials.copies.deleteMaterialConfirm")}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowDeleteMaterialConfirm(false)}
                className="w-full cursor-pointer rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("materials.copies.deleteCancelBtn")}
              </button>
              <button
                onClick={handleDeleteMaterial}
                className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("materials.copies.deleteMaterialBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaterialCopiesPage() {
  return (
    <Suspense fallback={null}>
      <CopiesPageInner />
    </Suspense>
  );
}