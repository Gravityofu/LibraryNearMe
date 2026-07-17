import SearchBox from "@/components/search-box";

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

export default async function Home() {
  const library = await getLibrary();

  return (
    <main>
      {/* 대표 이미지 (지금은 자리표시. 실제 이미지 업로드는 저장소(R2) 단계에서 연결) */}
      <div className="flex h-[250px] items-center justify-center rounded-xl border border-[#e6ded0] bg-gradient-to-br from-[#c9d6ef] via-[#e8dfd0] to-[#d8c9b6]">
        <span className="rounded-full bg-black/25 px-3 py-1.5 text-xs text-white">
          대표 이미지 · 관리자 페이지에서 변경 가능
        </span>
      </div>

      {/* 검색창 (Enter로 검색) */}
      <SearchBox />

      <p className="mt-6 text-center text-sm leading-8 text-neutral-500">
        책과 사람을 잇는 공간, {library?.name ?? "도서관"}입니다.
        <br />
        왼쪽 메뉴에서 원하는 서비스를 골라보세요.
      </p>
    </main>
  );
}