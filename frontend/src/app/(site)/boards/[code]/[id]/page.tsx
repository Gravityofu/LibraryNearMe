"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SitePageHeader from "@/components/site-page-header";
import { useI18n } from "@/components/language-provider";
import { getBoardGroupKey } from "@/lib/site-nav";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Post = {
  id: number;
  title: string;
  content: string;
  viewCount: number;
  createdAt: string;
  authorUser: { name: string } | null;
  guestName: string | null;
  materialRequest: {
    title: string;
    requestType: string;
    author: string | null;
    status: string;
  } | null;
};

export default function PublicPostDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ code: string; id: string }>();
  const { code, id } = params;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function loadPost() {
    setLoading(true);
    const res = await fetch(`${API_URL}/public/posts/${id}`);
    if (res.ok) {
      setPost(await res.json());
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <main className="py-10 text-center text-sm text-neutral-400">...</main>;
  }

  if (notFound || !post) {
    return (
      <main>
        <SitePageHeader crumbs={[t("nav.home"), t(getBoardGroupKey(code))]} title={t(`boards.tabs.${code}`)} />
        <p className="py-10 text-center text-sm text-neutral-400">{t("boards.write.loadFail")}</p>
      </main>
    );
  }

  return (
    <main>
      <SitePageHeader
        crumbs={[t("nav.home"), t(getBoardGroupKey(code)), t(`boards.tabs.${code}`)]}
        title={post.title}
      />

      <Link href={`/boards/${code}`} className="mb-4 inline-block text-sm text-neutral-500 hover:underline">
        ← {t("boards.detail.back")}
      </Link>

      {post.materialRequest && (
        <div className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
          <div>
            <span className="text-neutral-400">{t("boards.write.field.materialTitle")}: </span>
            {post.materialRequest.title}
          </div>
          <div>
            <span className="text-neutral-400">{t("boards.write.field.requestType")}: </span>
            {post.materialRequest.requestType}
          </div>
          {post.materialRequest.author && (
            <div>
              <span className="text-neutral-400">{t("boards.write.field.requestAuthor")}: </span>
              {post.materialRequest.author}
            </div>
          )}
          <div>
            <span className="text-neutral-400">{t("boards.list.col.status")}: </span>
            {t(`boards.status.${post.materialRequest.status}`)}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 border-b border-neutral-200 pb-3 text-xs text-neutral-400">
        <span>{post.authorUser?.name || post.guestName || t("boards.write.comments.guest")}</span>
        <span>{new Date(post.createdAt).toLocaleString()}</span>
        <span>
          {t("boards.list.col.viewCount")} {post.viewCount}
        </span>
      </div>

      <div
        className="min-h-[120px] text-sm leading-7 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-blue-600 [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-50 [&_th]:p-2"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </main>
  );
}