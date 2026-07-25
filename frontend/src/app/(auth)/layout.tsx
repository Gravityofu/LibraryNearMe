import SiteFooter from "@/components/site-footer";

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

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const library = await getLibrary();
  const name = library?.name ?? "도서관";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <SiteFooter
        name={name}
        logoUrl={library?.logoUrl}
        bgColor={library?.chromeBgColor || "#383838"}
        textColor={library?.chromeTextColor || "#F9F6F0"}
        version={library?.footerVersion || "1.0.0"}
        copyright={library?.footerCopyright || "ⓒ 2026 Gravityofu"}
        termsLabel="이용 약관"
        privacyLabel="개인정보 처리방침"
      />
    </div>
  );
}