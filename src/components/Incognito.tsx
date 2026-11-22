import { VenetianMask } from "lucide-react";
import "@/styles/incognito.css";
import { toast } from "@/components/Toast";
import { setIncognito, toggleIncognito, useIncognito } from "@/lib/privacy/incognito";

/** What Incognito does and does not do. Shared by every surface so the promise stays identical. */
export const INCOGNITO_WHAT = "While it is on, nothing you open or read is saved on this device: no history, no reading position, no library or comment changes, nothing that trains recommendations. Closing this tab or the app ends it.";
export const INCOGNITO_NOT = "It is not encryption, it does not hide this session from whoever controls this device, and it is not network anonymity: sources and the Dawghwa API still see your requests as usual.";

/**
 * One-tap Incognito button for the header. Always visible; when on it shows a
 * labelled "Incognito" pill so the state is never only an icon colour.
 */
export function IncognitoToggle({ className = "" }: { className?: string }) {
  const on = useIncognito();
  return (
    <button
      type="button"
      className={`incog-toggle ${on ? "is-on" : ""} ${className}`.trim()}
      aria-pressed={on}
      aria-label={on ? "Incognito on. Turn off" : "Turn on Incognito"}
      title={on ? "Incognito is on: nothing from this session is saved on this device" : "Incognito: read without saving anything on this device"}
      onClick={() => {
        void toggleIncognito().then(() => toast(on ? "Incognito off. Activity is saved again." : "Incognito on. Nothing from now on is saved on this device."));
      }}
    >
      <VenetianMask size={18} aria-hidden="true" />
      {on && <span className="incog-toggle-label">Incognito</span>}
    </button>
  );
}

/** A thin, persistent status strip, e.g. at the top of the reader. Renders nothing when off. */
export function IncognitoNotice({ compact = false }: { compact?: boolean }) {
  const on = useIncognito();
  if (!on) return null;
  return (
    <div className={`incog-notice ${compact ? "is-compact" : ""}`.trim()} role="status">
      <VenetianMask size={16} aria-hidden="true" />
      <span>Incognito: not saving this session on this device.</span>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void setIncognito(false)}>
        Turn off
      </button>
    </div>
  );
}

/** Full control with the honest explanation, for Profile settings. */
export function IncognitoPanel() {
  const on = useIncognito();
  return (
    <section className="settings-group incog-panel" aria-labelledby="incog-h">
      <h2 id="incog-h">Incognito</h2>
      <label className="switch settings-row">
        <span>
          <span className="label">Incognito mode</span>
          <span className="hint">{INCOGNITO_WHAT}</span>
        </span>
        <input type="checkbox" checked={on} onChange={(e) => void setIncognito(e.target.checked)} />
      </label>
      <p className="hint incog-not">{INCOGNITO_NOT}</p>
      {on && <p className="hint">Changes you make now (settings, library, comments) are discarded when you turn it off. Removing history still works. Adding, importing or deleting profiles, PINs and resetting recommendations wait until it is off.</p>}
    </section>
  );
}
