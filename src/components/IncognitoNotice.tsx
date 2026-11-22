import { EyeOff } from "lucide-react";
import { setIncognito, useIncognito } from "@/lib/store/incognito";

/** What Incognito does and does not do. Kept in one place so every surface says the same thing. */
export const INCOGNITO_COPY =
  "Reading here isn't saved to this profile's history, progress, rewards or picks. It doesn't hide activity from your network or this device's owner, and nothing is encrypted.";

/**
 * Slim notice shown while Incognito is on; renders nothing otherwise.
 * Mounted on Profile, and exported so the app shell can show it on every page.
 */
export function IncognitoNotice({ showTurnOff = true }: { showTurnOff?: boolean }) {
  const on = useIncognito();
  if (!on) return null;
  return (
    <div className="banner incognito-notice" role="status" data-testid="incognito-notice">
      <EyeOff size={16} aria-hidden="true" style={{ flex: "none" }} />
      <p style={{ margin: 0, minWidth: 0 }}>
        <strong>Incognito</strong>: {INCOGNITO_COPY.charAt(0).toLowerCase() + INCOGNITO_COPY.slice(1)}
      </p>
      {showTurnOff && (
        <button type="button" className="btn btn-sm" style={{ minHeight: 44, flex: "none" }} onClick={() => setIncognito(false)}>
          Turn off
        </button>
      )}
    </div>
  );
}
