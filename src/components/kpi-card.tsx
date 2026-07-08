import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Tone = "default" | "brand" | "gold" | "emerald" | "rose" | "violet";

const TONE_GRADIENT: Record<Tone, string> = {
  default: "var(--gradient-brand)",
  brand: "var(--gradient-brand)",
  gold: "var(--gradient-gold)",
  emerald: "var(--gradient-emerald)",
  rose: "var(--gradient-rose)",
  violet: "var(--gradient-violet)",
};

const TONE_GLOW: Record<Tone, string> = {
  default: "var(--shadow-glow-brand)",
  brand: "var(--shadow-glow-brand)",
  gold: "var(--shadow-glow-gold)",
  emerald: "var(--shadow-glow-emerald)",
  rose: "var(--shadow-glow-rose)",
  violet: "var(--shadow-glow-brand)",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delta,
  variant = "soft",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  delta?: { value: number; suffix?: string; positiveIsGood?: boolean };
  variant?: "soft" | "cinematic";
  className?: string;
}) {
  const cinematic = variant === "cinematic";
  const deltaPositive = delta ? delta.value >= 0 : false;
  const good = delta?.positiveIsGood ?? true;
  const deltaGood = deltaPositive === good;

  if (cinematic) {
    return (
      <div
        className={cn("cinematic-tile p-5 group animate-float-up", className)}
        style={{
          background: TONE_GRADIENT[tone],
          boxShadow: TONE_GLOW[tone],
        }}
      >
        <div className="sheen-overlay">
          <div
            className="absolute -inset-y-4 -left-1/2 w-1/3 bg-white/15 blur-md opacity-0 group-hover:opacity-100"
            style={{ animation: "sheen 1.6s ease-in-out" }}
          />
        </div>
        <div
          className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.45), transparent 70%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/70 font-medium">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white tabular-nums">
              {value}
            </p>
            {(hint || delta) && (
              <div className="mt-2 flex items-center gap-2">
                {delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      deltaGood
                        ? "bg-emerald-400/25 text-emerald-50"
                        : "bg-rose-400/25 text-rose-50",
                    )}
                  >
                    {deltaPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(delta.value).toFixed(1)}
                    {delta.suffix ?? "%"}
                  </span>
                )}
                {hint && <span className="text-[11px] text-white/70">{hint}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center text-white shadow-inner backdrop-blur-sm">
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer-line 3.6s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden premium-card-hover hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] animate-float-up",
        className,
      )}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-90"
        style={{ background: TONE_GRADIENT[tone] }}
      />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
            {(hint || delta) && (
              <div className="mt-1 flex items-center gap-2">
                {delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      deltaGood
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100",
                    )}
                  >
                    {deltaPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(delta.value).toFixed(1)}
                    {delta.suffix ?? "%"}
                  </span>
                )}
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ background: TONE_GRADIENT[tone] }}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
