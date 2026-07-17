import HomeBody from "@/components/home-body";

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
  return <HomeBody libraryName={library?.name} />;
}