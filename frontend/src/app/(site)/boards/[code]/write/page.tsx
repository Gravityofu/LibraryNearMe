"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SitePageHeader from "@/components/site-page-header";
import ThemedButton from "@/components/themed-button";
import { useI18n } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { useNotify } from "@/components/notify-provider";
import { getBoardGroupKey } from "@/lib/site-nav";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Board = {
  id: number;
  code: string;
  name: string;
  allowMemberWrite: boolean;
  allowGuestWrite: boolean;
  isMaterialRequest: boolean;
};

export default function PublicBoardWritePage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const { token, isLoggedIn } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");

  // '자료를 신청합니다' 게시판일 때만 쓰는 값들입니다.
  const [requestTypeOptions, setRequestTypeOptions] = useState<string[]>([]);
  const [materialTitle, setMaterialTitle] = useState("");
  const [requestType, setRequestType] = useState("");
  const [requestAuthor, setRequestAuthor] = useState("");

  async function loadBoard() {
    setLoading(true);
    const res = await fetch(`${API_URL}/public/boards`);
    if (res.ok) {
      const list: Board[] = await res.json();
      setBoard(list.find((b) => b.code === code) || null);
    }
    setLoading(false);
  }

  async function loadRequestTypes() {
    const res = await fetch(`${API_URL}/public/boards/${code}/material-request-options`);
    if (res.ok) {
      const data = await res.json();
      setRequestTypeOptions(data.types);
      if (data.types.length > 0) setRequestType(data.types[0]);
    }
  }

  useEffect(() => {
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (board?.isMaterialRequest) {
      loadRequestTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.isMaterialRequest]);

  async function handleSave() {
    if (!title.trim()) {
      notify("❌ " + t("boards.write.titleRequired"), "error");
      return;
    }
    if (board?.isMaterialRequest && !materialTitle.trim()) {
      notify("❌ " + t("boards.write.materialTitleRequired"), "error");
      return;
    }
    if (!content.trim()) {
      notify("❌ " + t("boards.write.contentRequired"), "error");
      return;
    }
    if (!isLoggedIn) {
      if (!guestName.trim()) {
        notify("❌ " + t("boards.public.write.guestNameRequired"), "error");
        return;
      }
      if (guestPassword.length < 4) {
        notify("❌ " + t("boards.public.write.guestPasswordRequired"), "error");
        return;
      }
    }

    const body: any = { boardId: board?.id, title, content };
    if (board?.isMaterialRequest) {
      body.materialTitle = materialTitle;
      body.requestType = requestType;
      body.requestAuthor = requestAuthor;
    }
    if (!isLoggedIn) {
      body.guestName = guestName;
      body.guestPassword = guestPassword;
    }

    const res = await fetch(`${API_URL}/public/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isLoggedIn ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      notify("✅ " + t("boards.write.saveSuccess"), "success");
      router.push(`/boards/${code}/${saved.id}`);
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("boards.write.saveFail")), "error");
    }
  }

  const crumbs = [t("nav.home"), t(getBoardGroupKey(code)), t(`boards.tabs.${code}`)];

  if (loading) {
    return <main className="py-10 text-center text-sm text-neutral-400">...</main>;
  }

  if (!board || !board.allowMemberWrite) {
    return (
      <main>
        <SitePageHeader crumbs={crumbs} title={t("boards.write.pageTitleNew")} />
        <p className="py-10 text-center text-sm text-neutral-400">{t("boards.public.write.notAllowed")}</p>
      </main>
    );
  }

  if (!isLoggedIn && !board.allowGuestWrite) {
    return (
      <main>
        <SitePageHeader crumbs={crumbs} title={t("boards.write.pageTitleNew")} />
        <p className="py-10 text-center text-sm text-neutral-400">
          {t("boards.public.write.loginRequired")}
          <br />
          <Link
            href={`/login?redirect=${encodeURIComponent(`/boards/${code}/write`)}`}
            className="text-blue-600 hover:underline"
          >
            {t("boards.public.write.loginLink")}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <SitePageHeader crumbs={crumbs} title={t("boards.write.pageTitleNew")} />

      <div className="flex w-full flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.title")} *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        {board.isMaterialRequest && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.materialTitle")} *</span>
              <input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.requestType")}</span>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  {requestTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.requestAuthor")}</span>
                <input
                  value={requestAuthor}
                  onChange={(e) => setRequestAuthor(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
          </>
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.content")} *</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        {!isLoggedIn && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{t("boards.public.write.guestNameLabel")} *</span>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">
                {t("boards.public.write.guestPasswordLabel")} *
              </span>
              <input
                type="password"
                value={guestPassword}
                onChange={(e) => setGuestPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end">
          <ThemedButton preset="버튼1" onClick={handleSave}>
            {t("boards.write.save")}
          </ThemedButton>
        </div>
      </div>
    </main>
  );
}