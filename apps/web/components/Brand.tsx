import Link from "next/link";
import Image from "next/image";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="HIMMER home" className="inline-flex shrink-0 items-center gap-2.5">
      <Image
        src={light ? "/himmer-symbol.png" : "/himmer-symbol-nav.png"}
        alt=""
        aria-hidden
        width={28}
        height={28}
        className="shrink-0"
        priority
      />
      <span
        className={`text-xl font-semibold tracking-[-0.03em] ${light ? "text-white" : "text-[#052E1B]"}`}
        style={{ fontFamily: "var(--font-himmer), sans-serif" }}
      >
        HIMMER
      </span>
    </Link>
  );
}
