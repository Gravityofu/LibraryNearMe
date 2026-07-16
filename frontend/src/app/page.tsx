// 이 파일은 홈페이지의 첫 화면입니다.
// 함수 앞에 async가 붙어 있어서, 화면을 그리기 전에
// 주방(NestJS)에서 도서관 데이터를 먼저 받아옵니다.

// 도서관 데이터의 모양을 미리 알려줍니다. (3단계에서 만든 표와 같은 모양)
type Library = {
  id: number;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
};

// 주방의 주소입니다. 나중에 배포할 때 이 주소만 실제 서버 주소로 바꾸면 됩니다.
const API_URL = "http://localhost:3001";

// 주방에 가서 도서관 설정을 받아오는 함수입니다.
async function getLibrary(): Promise<Library | null> {
  const res = await fetch(`${API_URL}/library`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

// 실제 홈페이지 화면을 그리는 부분입니다.
export default async function Home() {
  const library = await getLibrary();

  // 도서관 데이터가 없을 때(또는 주방이 꺼졌을 때)를 대비한 안내 화면입니다.
  if (!library) {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        도서관 설정을 불러오지 못했습니다. 주방(백엔드) 서버가 켜져 있는지 확인해 주세요.
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        fontFamily: "sans-serif",
      }}
    >
      {/* 도서관 이름을, 데이터베이스에 저장된 대표 색상으로 표시합니다 */}
      <h1
        style={{
          fontSize: "3rem",
          fontWeight: "bold",
          color: library.primaryColor,
        }}
      >
        {library.name}
      </h1>
      <p style={{ color: "#666" }}>도서관 홈페이지에 오신 것을 환영합니다</p>
    </main>
  );
}