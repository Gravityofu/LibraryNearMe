import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 왼쪽 짙은 회색 사이드바 (휴대폰에서는 위쪽 가로 메뉴로 변신) */}
      <aside className="w-full bg-[#383838] p-6 text-[#F9F6F0] md:w-52">
        <p className="text-[15px] font-extrabold">관리자</p>
        <nav className="mt-6 flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm md:flex-col md:gap-1">
          <Link href="/admin" className="rounded-lg bg-white/10 px-3 py-2.5 font-bold">
            도서관 설정
          </Link>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">도서 관리 (준비 중)</span>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">회원 관리 (준비 중)</span>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">대출/반납 (준비 중)</span>
        </nav>
        <div className="mt-6 border-t border-white/15 pt-4">
          <Link href="/" className="text-[13px] text-[rgba(249,246,240,0.6)]">
            ← 홈페이지로
          </Link>
        </div>
      </aside>

      {/* 오른쪽 내용 영역 (기존 설정 카드가 여기 들어옴) */}
      <section className="flex-1">{children}</section>
    </div>
  );
}