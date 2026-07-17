"use client";

import { useI18n } from "@/components/language-provider";
import SearchBox from "@/components/search-box";

export default function HomeBody({ libraryName }: { libraryName?: string }) {
  const { t } = useI18n();
  const name = libraryName ?? t("common.library");

  return (
    <main>
      <div className="flex h-[250px] items-center justify-center rounded-xl border border-[#e6ded0] bg-gradient-to-br from-[#c9d6ef] via-[#e8dfd0] to-[#d8c9b6]">
        <span className="rounded-full bg-black/25 px-3 py-1.5 text-xs text-white">
          {t("home.banner")}
        </span>
      </div>

      <SearchBox />

      <p className="mt-6 text-center text-sm leading-8 text-neutral-500">
        {t("home.welcome").replace("{name}", name)}
        <br />
        {t("home.welcomeSub")}
      </p>
    </main>
  );
}