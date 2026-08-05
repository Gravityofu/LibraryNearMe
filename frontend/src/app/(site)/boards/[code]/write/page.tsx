"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import SitePageHeader from "@/components/site-page-header";
import ThemedButton from "@/components/themed-button";
import RichTextEditor from "@/components/rich-text-editor";
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

type ExistingPost = {
  id: number;
  title: string;
  content: string;
  authorUserId: number | null;
  materialRequest: {
    title: string;
    requestType: string;
    author: string | null;
  } | null;
};

export default function PublicBoardWritePage() {
  const { t } = useI18n();
  const { notify } = useNotify();
  const { token, userId, isLoggedIn } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const code = params.code;
  const postId = searchParams.get("postId");
  const isEdit = !!postId;

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

  // 수정 화면에서만 쓰는 값들입니다.
  const [existingPost, setExistingPost] = useState<ExistingPost | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(isEdit);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [editGuestPassword, setEditGuestPassword] = useState("");

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
      if (!requestType && data.types.length > 0) setRequestType(data.types[0]);
    }
  }

  // 수정 화면일 때: 글을 불러오고, 회원 글이면 본인인지, 비회원 글이면 비밀번호가 맞는지 확인합니다.
  async function loadExistingPostForEdit() {
    if (!postId) return;
    setCheckingPermission(true);
    const res = await fetch(`${API_URL}/public/posts/${postId}`);
    if (!res.ok) {
      setPermissionDenied(true);
      setCheckingPermission(false);
      return;
    }
    const data = await res.json();
    setExistingPost(data);

    if (data.authorUserId) {
      // 회원 글: 로그인한 나 자신이어야 합니다.
      if (!isLoggedIn || userId !== data.authorUserId) {
        setPermissionDenied(true);
        setCheckingPermission(false);
        return;
      }
    } else {
      // 비회원 글: 비밀번호를 물어보고 서버에 먼저 확인합니다.
      const pw = window.prompt(t("boards.public.write.guestPasswordPrompt"));
      if (!pw) {
        setPermissionDenied(true);
        setCheckingPermission(false);
        return;
      }
      const verifyRes = await fetch(`${API_URL}/public/posts/${postId}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestPassword: pw }),
      });
      if (!verifyRes.ok) {
        notify("❌ " + t("boards.public.write.wrongPassword"), "error");
        setPermissionDenied(true);
        setCheckingPermission(false);
        return;
      }
      setEditGuestPassword(pw);
    }

    setTitle(data.title);
    setContent(data.content);
    if (data.materialRequest) {
      setMaterialTitle(data.materialRequest.title || "");
      setRequestType(data.materialRequest.requestType);
      setRequestAuthor(data.materialRequest.author || "");
    }
    setCheckingPermission(false);
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

  useEffect(() => {
    if (isEdit) {
      loadExistingPostForEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

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
    if (!isEdit && !isLoggedIn) {
      if (!guestName.trim()) {
        notify("❌ " + t("boards.public.write.guestNameRequired"), "error");
        return;
      }
      if (guestPassword.length < 4) {
        notify("❌ " + t("boards.public.write.guestPasswordRequired"), "error");
        return;
      }
    }

    const body: any = { title, content };
    if (board?.isMaterialRequest) {
      body.materialTitle = materialTitle;
      body.requestType = requestType;
      body.requestAuthor = requestAuthor;
    }

    let url: string;
    let method: string;
    if (isEdit) {
      url = `${API_URL}/public/posts/${postId}`;
      method = "PATCH";
      if (existingPost && !existingPost.authorUserId) {
        body.guestPassword = editGuestPassword;
      }
    } else {
      url = `${API_URL}/public/posts`;
      method = "POST";
      body.boardId = board?.id;
      if (!isLoggedIn) {
        body.guestName = guestName;
        body.guestPassword = guestPassword;
      }
    }

    const res = await fetch(url, {
      method,
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

  if (loading || checkingPermission) {
    return <main className="py-10 text-center text-sm text-neutral-400">...</main>;
  }

  if (isEdit && permissionDenied) {
    return (
      <main>
        <SitePageHeader crumbs={crumbs} title={t("boards.write.pageTitleEdit")} />
        <p className="py-10 text-center text-sm text-neutral-400">{t("boards.public.write.permissionDenied")}</p>
      </main>
    );
  }

  if (!board || !board.allowMemberWrite) {
    return (
      <main>
        <SitePageHeader crumbs={crumbs} title={t("boards.write.pageTitleNew")} />
        <p className="py-10 text-center text-sm text-neutral-400">{t("boards.public.write.notAllowed")}</p>
      </main>
    );
  }

  if (!isEdit && !isLoggedIn && !board.allowGuestWrite) {
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
      <SitePageHeader
        crumbs={crumbs}
        title={isEdit ? t("boards.write.pageTitleEdit") : t("boards.write.pageTitleNew")}
      />

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

        <div>
          <span className="mb-1 block text-sm text-neutral-500">{t("boards.write.field.content")} *</span>
          <RichTextEditor
            value={content}
            onChange={setContent}
            imageUploadUrl={`${API_URL}/uploads/public-board-image`}
          />
        </div>

        {!isEdit && !isLoggedIn && (
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