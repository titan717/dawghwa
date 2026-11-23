import type { ComponentType } from "react";

const ROMAN = ["", "I", "II", "III", "IV", "V"];

/** The one shield every badge uses (viewBox 0 0 64 72). The outline starts at the top centre. */
export const SHIELD_PATH = "M32 3 L58 12 V34 C58 52 46.5 63 32 69 C17.5 63 6 52 6 34 V12 Z";

/**
 * Achievement badge, always the same shield (Spec L). `tier` is how many tiers
 * are earned (0 = locked). Locked badges are a muted silhouette of the same
 * shield and icon, with visible "Locked" and progress text so the state never
 * relies on colour alone. Progress toward the next tier is drawn along the
 * shield outline; the draw uses --dur-ring, which reduced motion zeroes.
 */
export function Badge({ icon: Icon, name, tier, tiers, progress, count, hint, detail, size = 64 }: { icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>; name: string; tier: number; tiers: number; progress?: number; count?: string; hint?: string; detail?: string; size?: number }) {
  const maxed = tier >= tiers;
  const state = tier === 0 ? "locked" : maxed ? "max" : "earned";
  const v = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress! : 0));
  const h = Math.round((size * 72) / 64);
  return (
    <div className="badge" data-state={state} data-tier={Math.min(tier, 3)} title={detail}>
      <span className="badge-shield" style={{ width: size, height: h }} aria-hidden="true">
        <svg width={size} height={h} viewBox="0 0 64 72">
          <path className="badge-fill" d={SHIELD_PATH} />
          {!maxed && (
            <>
              <path className="badge-track" d={SHIELD_PATH} pathLength={1} />
              {v > 0 && <path className="badge-progress" d={SHIELD_PATH} pathLength={1} strokeDasharray={`${v} 1`} />}
            </>
          )}
        </svg>
        <span className="badge-face">
          <Icon size={Math.round(size * 0.38)} aria-hidden />
        </span>
        {tier > 0 && tiers > 1 && <span className="badge-tier">{ROMAN[tier] ?? tier}</span>}
      </span>
      <span className="badge-name">{name}</span>
      {state === "locked" && <span className="badge-state">Locked{count ? ` · ${count}` : ""}</span>}
      {detail && <span className="badge-detail">{detail}</span>}
      {hint && <span className="badge-hint">{hint}</span>}
      <span className="sr-only">{tier === 0 ? "Locked." : `Tier ${tier} of ${tiers}.`}</span>
    </div>
  );
}
