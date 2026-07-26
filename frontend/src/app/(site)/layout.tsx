import SiteSidebar from "@/components/site-sidebar";
import SiteFooter from "@/components/site-footer";
import RecentPosts from "@/components/recent-posts";

const API_URL = "http://localhost:3001";

async function getLibrary() {
  try {
    const res = await fetch(`${API_URL}/library`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const library = await getLibrary();
  const name = library?.name ?? "도서관";

  return (
    <div>
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 p-5 md:grid-cols-[230px_1fr_230px] md:items-start">
        <SiteSidebar name={name} primaryColor={library?.primaryColor} />
        <div>{children}</div>
        <RecentPosts />
      </div>
      <SiteFooter
        name={name}
        logoUrl={library?.logoUrl}
        bgColor={library?.footerBgColor || "#383838"}
        textColor={library?.footerTextColor || "#F9F6F0"}
        version={library?.footerVersion || "1.0.0"}
        copyright={library?.footerCopyright || "ⓒ 2026 Gravityofu"}
        termsLabel="이용 약관"
        privacyLabel="개인정보 처리방침"
      />
    </div>
  );
}