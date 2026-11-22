import { VenetianMask } from "lucide-react";
import { INCOGNITO_COPY, setIncognito, useIncognito } from "@/lib/incognito";

/** One-tap switch in the bottom navigation. A toggle button, not a link: it changes state, not location. */
export function IncognitoNavButton() {
  const on = useIncognito();
  return (
    <button type="button" className="nav-toggle" aria-pressed={on} onClick={() => setIncognito(!on)} title={on ? "Turn Incognito off" : "Turn Incognito on"}>
      <span className="nav-ico">
        <VenetianMask size={21} strokeWidth={2} aria-hidden="true" />
      </span>
      Incognito
    </button>
  );
}

/** Shown at the top of every screen while Incognito is on. */
export function IncognitoBanner() {
  const on = useIncognito();
  if (!on) return null;
  return (
    <div className="banner banner-incognito" role="status">
      <VenetianMask size={16} aria-hidden="true" />
      <details>
        <summary>Incognito is on. Reading history and recommendation signals aren't being saved.</summary>
        <p>{INCOGNITO_COPY}</p>
      </details>
      <button type="button" className="btn btn-sm" onClick={() => setIncognito(false)}>
        Turn off
      </button>
    </div>
  );
}

/** Settings row with the full explanation (Profile). */
export function IncognitoSetting() {
  const on = useIncognito();
  return (
    <label className="switch settings-row">
      <span>
        <span className="label">Incognito</span>
        <span className="hint">{INCOGNITO_COPY}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => setIncognito(e.target.checked)} />
    </label>
  );
}

/** Compact marker for screens with their own chrome (the reader). */
export function IncognitoChip() {
  const on = useIncognito();
  if (!on) return null;
  return (
    <span className="incognito-chip" role="status">
      <VenetianMask size={14} aria-hidden="true" /> Incognito
    </span>
  );
}
