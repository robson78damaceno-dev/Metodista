import Image from "next/image";
import { METHODIST_LOGO_PUBLIC_PATH } from "@/lib/methodist-logo";
import { cn } from "@/lib/utils";

export function MethodistLogo({
  className,
  height = 52
}: {
  className?: string;
  height?: number;
}) {
  const width = Math.round(height * 0.72);

  return (
    <span className={cn("inline-flex rounded-lg bg-white p-1.5 shadow-sm", className)}>
      <Image
        src={METHODIST_LOGO_PUBLIC_PATH}
        alt="Igreja Metodista — Cruz e Chama"
        width={width}
        height={height}
        className="h-auto w-auto object-contain"
        priority
      />
    </span>
  );
}

export function MethodistBrand({
  className,
  subtitle,
  logoHeight = 52
}: {
  className?: string;
  subtitle?: string;
  logoHeight?: number;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <MethodistLogo height={logoHeight} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EF3E23]">Igreja Metodista</p>
        <p className="text-lg font-bold leading-tight tracking-tight sm:text-xl">Concílio</p>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
