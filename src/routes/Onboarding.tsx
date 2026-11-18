import { useMemo, useState, type ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, BookOpen, Check, ChevronLeft, LayoutGrid, ScrollText, Smartphone, X } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { useBrowse, useVocabulary } from "@/lib/query";
import { coverSrc } from "@/lib/api/images";
import { updateProfile, useUser } from "@/lib/store/user";
import { useHead } from "@/lib/seo";
import { isMature } from "@/lib/titles";

type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean; strokeWidth?: number }>;

const FORMATS: [string, string, string, Icon][] = [
  ["manga", "Manga", "Japanese, read right to left", BookOpen],
  ["manhwa", "Manhwa", "Korean, full-colour vertical scroll", Smartphone],
  ["manhua", "Manhua", "Chinese, often cultivation and fantasy", ScrollText],
];
// a curated first screen, checked against the API's tag vocabulary
const STARTER = ["Action", "Fantasy", "Romance", "Comedy", "Drama", "Isekai", "Thriller", "Horror", "Slice of Life", "Psychological", "Mystery", "Sci-Fi", "Sports", "Historical", "Martial Arts", "Reincarnation", "Time Travel", "Villainess", "Monsters", "Survival", "School Life", "Tragedy"];
const AVOID = ["Gore", "Sexual Violence", "Boys' Love", "Girls' Love", "Harem", "Tragedy"];
// blueprint tiles are tinted per genre: red, gold, amber, violet, blue...
const TINTS = ["#d4242f", "#c79a1e", "#d9822b", "#6a3cf0", "#2347e8", "#b0183a", "#0f8fb0", "#8a2be2", "#c2185b", "#1e9e6a"];

/**
 * Blueprint v2 onboarding (pages 11-14): mascot with a speech bubble, progress
 * dots, image genre tiles, option cards, and a ready screen with Save. Every
 * answer is stored on this profile only and is editable later from Profile.
 */
export default function Onboarding() {
  const profile = useUser((s) => s.profile);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get("edit") === "1";
  const vocab = useVocabulary();
  const [step, setStep] = useState(0);
  const [kinds, setKinds] = useState<string[]>(profile?.prefs.kinds ?? []);
  const [genres, setGenres] = useState<string[]>(profile?.prefs.genres ?? []);
  const [avoid, setAvoid] = useState<string[]>(profile?.prefs.avoid ?? []);
  useHead({ title: "Welcome to Dawghwa", noindex: true });
  const known = useMemo(() => new Set((vocab.data?.tags ?? []).map((t) => t.name)), [vocab.data]);
  const starter = vocab.data ? STARTER.filter((g) => known.has(g)) : STARTER;
  const avoidList = vocab.data ? AVOID.filter((g) => known.has(g)) : AVOID;
  // genre tile art: the most-followed title carrying each genre (one shared, cached catalogue request)
  const pool = useBrowse({ order: "popular", limit: 100 });
  const art = useMemo(() => {
    const out = new Map<string, string>();
    const used = new Set<string>();
    for (const g of starter) {
      const t = (pool.data?.items ?? []).find((x) => x.cover && !isMature(x) && !used.has(x.key) && (x.meta?.genres ?? x.meta?.tags ?? []).includes(g));
      if (t?.cover) {
        out.set(g, coverSrc(t.cover));
        used.add(t.key);
      }
    }
    return out;
  }, [pool.data, starter]);
  const toggle = (xs: string[], set: (v: string[]) => void, v: string) => set(xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);
  const leave = () => nav(editing ? "/profile" : "/", { replace: true });
  const cancel = async () => {
    if (profile && !editing) await updateProfile({ onboarded: true });
    leave();
  };
  const save = async () => {
    if (profile) await updateProfile({ onboarded: true, prefs: { ...profile.prefs, kinds, genres, avoid } });
    leave();
  };
  const STEPS = 4;
  const last = step === STEPS - 1;
  const canGo = step !== 0 || genres.length > 0 || editing;

  const bubble = [genres.length ? "Ooh, nice pick! Any more?" : "What do you love to read? Pick as many as you like.", "Manga, manhwa, or all of them?", "Anything you'd rather not see?", editing ? "Got it. Save and I'll update your picks." : "Your picks are in. Let's read something great!"][step]!;

  return (
    <div className="ob" data-step={step}>
      <header className="ob-head">
        {step > 0 ? (
          <button className="ob-round" onClick={() => setStep(step - 1)} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <button className="ob-round" onClick={() => void cancel()} aria-label={editing ? "Close without saving" : "Close setup"}>
            <X size={20} />
          </button>
        )}
        <span className="ob-dots" role="img" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <i key={i} data-on={i === step || undefined} data-done={i < step || undefined} />
          ))}
        </span>
        {last ? (
          <span />
        ) : (
          <button className="ob-cancel" onClick={() => void cancel()}>
            Cancel
          </button>
        )}
      </header>

      {last ? (
        <main className="ob-ready">
          <div className="ob-bubble ob-bubble-down" aria-live="polite">
            {bubble}
          </div>
          <Mascot size={220} className="ob-mascot-lg" pose="done" />
          <h1>{editing ? "Your picks are updated" : "Your Dawghwa experience is ready!"}</h1>
          <p>Recommendations get smarter as you read, rate and save titles. Change your answers any time in Profile.</p>
        </main>
      ) : (
        <main className="ob-main">
          <div className="ob-says">
            <Mascot size={92} className="ob-mascot" pose="welcome" />
            <p className="ob-bubble" aria-live="polite">
              {bubble}
            </p>
          </div>
          {step === 0 && (
            <>
              <h1>Pick your favourite genres</h1>
              <p className="ob-sub">{genres.length ? `${genres.length} selected` : "Choose at least one"}</p>
              <div className="ob-tiles">
                {starter.map((g, i) => {
                  const on = genres.includes(g);
                  const img = art.get(g);
                  return (
                    <button key={g} className="ob-tile" aria-pressed={on} onClick={() => toggle(genres, setGenres, g)} style={{ "--tint": TINTS[i % TINTS.length] } as React.CSSProperties}>
                      {img && <img src={img} alt="" loading={i < 8 ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" />}
                      <span className="ob-tile-label">{g}</span>
                      {on && (
                        <span className="ob-check" aria-hidden="true">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1>What do you read most?</h1>
              <p className="ob-sub">Pick any. Recommendations lean towards these formats.</p>
              <div className="ob-options">
                {FORMATS.map(([k, l, d, I]) => (
                  <Option key={k} icon={I} title={l} hint={d} on={kinds.includes(k)} onClick={() => toggle(kinds, setKinds, k)} />
                ))}
                <Option icon={LayoutGrid} title="All of them" hint="Surprise me" on={kinds.length === 0} onClick={() => setKinds([])} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h1>Anything to keep out?</h1>
              <p className="ob-sub">Filtered from recommendations. You can still find them in search.</p>
              <div className="ob-options ob-options-2">
                {avoidList.map((g) => (
                  <Option key={g} icon={Ban} title={g} on={avoid.includes(g)} onClick={() => toggle(avoid, setAvoid, g)} />
                ))}
              </div>
            </>
          )}
        </main>
      )}

      <footer className="ob-foot">
        <button className="ob-go" disabled={!canGo} onClick={() => (last ? void save() : setStep(step + 1))}>
          {last ? "Save" : "Continue"}
        </button>
      </footer>
    </div>
  );
}

function Option({ icon: I, title, hint, on, onClick }: { icon: Icon; title: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <button className="ob-option" aria-pressed={on} onClick={onClick}>
      <I size={24} strokeWidth={1.8} aria-hidden />
      <span>
        <strong>{title}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </button>
  );
}
