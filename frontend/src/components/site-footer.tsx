import Link from "next/link";

type Props = {
  name: string;
  logoUrl?: string | null;
  bgColor: string;
  textColor: string;
  version: string;
  copyright: string;
  termsLabel: string;
  privacyLabel: string;
};

export default function SiteFooter({
  name,
  logoUrl,
  bgColor,
  textColor,
  version,
  copyright,
  termsLabel,
  privacyLabel,
}: Props) {
  return (
    <footer className="mt-8 w-full" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {logoUrl && <img src={logoUrl} alt={name} className="h-6 w-auto" />}
          <span className="font-semibold">{name}</span>
          <Link href="/terms" className="opacity-70 hover:opacity-100">
            {termsLabel}
          </Link>
          <Link href="/privacy" className="opacity-70 hover:opacity-100">
            {privacyLabel}
          </Link>
        </div>
        <div className="flex items-center gap-3 opacity-70">
          <span>버전 {version}</span>
          <span>{copyright}</span>
        </div>
      </div>
    </footer>
  );
}