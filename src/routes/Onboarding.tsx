import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Ban, Bot, Check, Lock, Upload, UserPlus, Brain, Briefcase, Droplet, Flower2, HeartHandshake, Users, CloudRain, Crown, DoorOpen, Drama, Fingerprint, Flame, Ghost, GraduationCap, Heart, Hourglass, Landmark, RefreshCcw, Rocket, Shield, Siren, Skull, Smile, Sparkles, Sun, Swords, Trophy,
} from "lucide-react";
import { Mascot, MascotSays } from "@/components/Mascot";
import { ProgressRing } from "@/components/ProgressRing";
import { SignIn } from "@/components/SignIn";
import { toast } from "@/components/Toast";
import { useProgression } from "@/lib/rewards";
import { useSettings } from "@/lib/settings";
import { isValidPin, setPin, signOut, unlock, useSignInRequired } from "@/lib/store/accounts";
import { importProfile } from "@/lib/store/transfer";
import { useVocabulary } from "@/lib/query";
import { deleteProfile, getUser, PROFILE_COLORS, updateProfile, useUser } from "@/lib/store/user";
import { useHead } from "@/lib/seo";

const FORMATS: [string, string, string][] = [
  ["manhwa", "Manhwa", "Korean, usually full-colour vertical scroll"],
  ["manga", "Manga", "Japanese, read right to left"],
  ["manhua", "Manhua", "Chinese, often cultivation and fantasy"],
];
// a curated first screen; the full vocabulary from the API fills in the rest
const STARTER = ["Action", "Fantasy", "Romance", "Comedy", "Drama", "Isekai", "Thriller", "Horror", "Slice of Life", "Psychological", "Mystery", "Sci-Fi", "Sports", "Historical", "Martial Arts", "Reincarnation", "Time Travel", "Villainess", "Monsters", "Survival", "Office Workers", "School Life", "Tragedy", "Mecha"];
const ICONS: Record<string, ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  Action: Swords, Fantasy: Sparkles, Romance: Heart, Comedy: Smile, Drama, Isekai: DoorOpen, Thriller: Siren, Horror: Ghost, "Slice of Life": Sun, Psychological: Brain, Mystery: Fingerprint, "Sci-Fi": Rocket, Sports: Trophy, Historical: Landmark, "Martial Arts": Shield, Reincarnation: RefreshCcw, "Time Travel": Hourglass, Villainess: Crown, Monsters: Skull, Survival: Flame, "Office Workers": Briefcase, "School Life": GraduationCap, Tragedy: CloudRain, Mecha: Bot,
  Gore: Droplet, "Sexual Violence": Ban, "Boys' Love": HeartHandshake, "Girls' Love": Flower2, Harem: Users,
};
const AVOID = ["Gore", "Sexual Violence", "Boys' Love", "Girls' Love", "Harem", "Tragedy"];

type Step = "hello" | "reader" | "genres" | "formats" | "avoid" | "ready";

/** Each step's heading: screen readers hear which question is on screen. */
const STEP_HEADINGS: Record<Exclude<Step, "ready">, string> = {
  hello: "Welcome to Dawghwa",
  reader: "Name your reader",
  genres: "Pick genres you like",
  formats: "Pick the formats you read",
  avoid: "Choose anything to keep out of your picks",
};
/** Spoken names for PROFILE_COLORS (a hex code is not an accessible name). */
const COLOR_NAMES: Record<string, string> = { "#ff5a36": "Orange", "#3fb8af": "Teal", "#f2b134": "Gold", "#8c7dff": "Violet", "#ef6f9a": "Pink", "#5aa9e6": "Blue" };

/**
 * Mascot-led onboarding (blueprint pages 9-14, D29-D31): one question per screen with the
 * collie talking, progress dots, Cancel/Continue, and a "Your experience is ready!" screen
 * with the first weekly quest. Everything chosen here is editable later in Profile.
 * `?edit=1` opens only the taste steps; `?new=1` (a reader created from the sign-in
 * screen or Profile) skips the hello screen.
 */
export default function Onboarding() {
  return useSignInRequired() ? <SignIn /> : <OnboardingFlow />;
}

function OnboardingFlow() {
  const profile = useUser((s) => s.profile);
  const profiles = useUser((s) => s.profiles);
  const { rewards } = useSettings();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get("edit") === "1";
  const fresh = params.get("new") === "1";
  const vocab = useVocabulary();
  const order: Step[] = editing ? ["genres", "formats", "avoid"] : fresh ? ["reader", "genres", "formats", "avoid", "ready"] : ["hello", "reader", "genres", "formats", "avoid", "ready"];
  const [step, setStep] = useState(0);
  // the landing page's "Name your reader" fragment hands over a name and a format
  const handedKind = params.get("kind");
  const [kinds, setKinds] = useState<string[]>(profile?.prefs.kinds?.length ? profile.prefs.kinds : handedKind && FORMATS.some(([k]) => k === handedKind) ? [handedKind] : []);
  const [genres, setGenres] = useState<string[]>(profile?.prefs.genres ?? []);
  const [avoid, setAvoid] = useState<string[]>(profile?.prefs.avoid ?? []);
  const [name, setName] = useState(profile && profile.name !== "Reader" ? profile.name : (params.get("name") ?? "").trim().slice(0, 40));
  const [color, setColor] = useState(profile?.color ?? PROFILE_COLORS[0]!);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPinValue] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useHead({ title: "Welcome to Dawghwa", noindex: true });
  const known = useMemo(() => new Set((vocab.data?.tags ?? []).map((t) => t.name)), [vocab.data]);
  const starter = vocab.data ? STARTER.filter((g) => known.has(g)) : STARTER;
  const avoidList = vocab.data ? AVOID.filter((g) => known.has(g)) : AVOID;
  const toggle = (xs: string[], set: (v: string[]) => void, v: string) => set(xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);
  const current = order[step]!;
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  // after Continue or Back, move focus to the new question (not on first paint)
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);
  const others = profiles.filter((p) => p.id !== profile?.id);

  const save = async (taste: boolean) => {
    if (!profile) return;
    await updateProfile({ onboarded: true, prefs: taste ? { ...profile.prefs, kinds, genres, avoid } : profile.prefs });
  };
  const leave = async (to = editing ? "/profile" : "/") => nav(to, { replace: true });
  const skip = async () => {
    await save(false);
    await leave();
  };
  const saveReader = async () => {
    const n = name.trim() || "Reader";
    await updateProfile({ name: n, color });
    if (usePin && isValidPin(pin)) await setPin(pin);
  };
  const next = async () => {
    if (current === "reader") await saveReader();
    if (editing && current === "avoid") {
      await save(true);
      toast("Taste updated");
      return leave();
    }
    if (current === "avoid") await save(true);
    setStep(step + 1);
  };
  const back = () => (step === 0 ? void skip() : setStep(step - 1));
  const restore = async (f: File) => {
    const blank = getUser().profile;
    try {
      const p = await importProfile(await f.text());
      if (blank && !blank.onboarded && getUser().profiles.length > 1 && !(await hasData(blank.id))) await deleteProfile(blank.id).catch(() => undefined);
      if (!p.pin) unlock(p.id);
      toast(`Welcome back, ${p.name}`);
      await leave("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed");
    }
  };

  const bubble: Record<Step, ReactNode> = {
    hello: "Hi! I'm Dawg, your reading buddy. Let's set up your shelf. It all stays on this device.",
    reader: "What should I call you? Pick a colour too.",
    genres: editing ? "Change what you're in the mood for. I'll tune your picks." : "What stories do you like? Pick a few and I'll sniff out the rest.",
    formats: "Which formats do you read? Leave it empty if you read everything.",
    avoid: "Anything to keep out? I'll keep it out of your picks. Search still finds it.",
    ready: "Your experience is ready!",
  };

  if (current === "ready") return <Ready name={profile?.name ?? "Reader"} rewards={rewards} onDone={(to) => void leave(to)} />;

  const canContinue = current !== "genres" || editing || genres.length > 0;
  return (
    <div className="onboard" data-step={current}>
      <header className="onboard-head">
        <span />
        <span className="onboard-steps" aria-label={`Step ${step + 1} of ${order.length}`} role="img">
          {order.map((k, i) => (
            <i key={k} data-on={i <= step || undefined} />
          ))}
        </span>
        <button className="onboard-skip" onClick={() => void skip()}>
          {editing ? "Cancel" : "Skip"}
        </button>
      </header>
      <main>
        <h1 className="sr-only" ref={heading} tabIndex={-1}>
          {STEP_HEADINGS[current]}
        </h1>
        <div className="onboard-mascot">
          <MascotSays size={current === "hello" ? 132 : 84} pose="welcome">
            {bubble[current]}
          </MascotSays>
        </div>
        {current === "hello" && (
          <div className="onboard-hello stack">
            <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
              <UserPlus size={18} aria-hidden="true" /> Create reader
            </button>
            {others.length > 0 && (
              <button className="btn btn-lg" onClick={() => signOut()}>
                Sign in as another reader
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Upload size={16} aria-hidden="true" /> Restore from a backup file
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])} />
            <p className="muted onboard-fine">No account, no email. Readers are profiles on this device; export one from Profile to move it.</p>
          </div>
        )}
        {current === "reader" && (
          <div className="stack onboard-reader">
            <label className="field">
              <span>Reader name</span>
              <input className="input" value={name} maxLength={40} placeholder="Reader" autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
            </label>
            <fieldset className="onboard-colors">
              <legend>Colour</legend>
              {PROFILE_COLORS.map((c) => (
                <button key={c} type="button" className="onboard-color" style={{ background: c }} aria-pressed={color === c} aria-label={COLOR_NAMES[c] ?? c} onClick={() => setColor(c)}>
                  {color === c && <Check size={18} aria-hidden="true" />}
                </button>
              ))}
            </fieldset>
            <label className="switch settings-row">
              <span>
                <span className="label">
                  <Lock size={14} aria-hidden="true" /> Ask for a PIN on this device
                </span>
                <span className="hint">For shared phones. It keeps others out of your shelf; it isn't encryption.</span>
              </span>
              <input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} />
            </label>
            {usePin && (
              <label className="field onboard-pin">
                <span>4-digit PIN</span>
                <input className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
            )}
          </div>
        )}
        {current === "genres" && (
          <>
            <p className="onboard-count-line" aria-live="polite">
              {genres.length ? `${genres.length} selected` : "Select at least one"}
            </p>
            <div className="onboard-tiles">
              {starter.map((g) => (
                <GenreTile key={g} label={g} on={genres.includes(g)} onClick={() => toggle(genres, setGenres, g)} />
              ))}
            </div>
          </>
        )}
        {current === "formats" && (
          <div className="stack">
            {FORMATS.map(([k, l, d]) => (
              <button key={k} className="menu-item onboard-option" aria-pressed={kinds.includes(k)} onClick={() => toggle(kinds, setKinds, k)}>
                <span>
                  <strong>{l}</strong>
                  <span className="hint">{d}</span>
                </span>
                {kinds.includes(k) && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
        {current === "avoid" && (
          <div className="onboard-chips">
            {avoidList.map((g) => (
              <OnboardChip key={g} label={g} neg on={avoid.includes(g)} onClick={() => toggle(avoid, setAvoid, g)} />
            ))}
          </div>
        )}
      </main>
      {current !== "hello" && (
        <footer className="onboard-foot onboard-foot-pair">
          <button className="btn btn-lg" onClick={back}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button className="btn btn-primary btn-lg onboard-next" disabled={!canContinue || (current === "reader" && usePin && !isValidPin(pin))} onClick={() => void next()}>
            {editing && current === "avoid" ? "Save" : "Continue"}
            {current === "genres" && genres.length > 0 && <span className="onboard-count">{genres.length}</span>}
          </button>
        </footer>
      )}
    </div>
  );
}

async function hasData(profileId: string) {
  const s = getUser();
  return s.profile?.id === profileId ? s.events.length > 0 || s.library.size > 0 : true;
}

/** Final screen: the first weekly quest, so there's a clear first thing to do (Phase 5). */
function Ready({ name, rewards, onDone }: { name: string; rewards: boolean; onDone: (to?: string) => void }) {
  const { quests } = useProgression();
  const q = rewards ? quests.current.find((x) => x.doneAt === undefined) : undefined;
  // the whole screen changed: start keyboard and screen reader users at its heading
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => h.current?.focus(), []);
  return (
    <div className="onboard onboard-ready">
      <main>
        <Mascot pose="done" size={148} />
        <h1 ref={h} tabIndex={-1}>Your experience is ready!</h1>
        <p className="onboard-sub">Welcome, {name}. Your shelf, picks and progress live on this device.</p>
        {q && (
          <section className="onboard-quest" aria-labelledby="first-quest-h">
            <p className="kicker">Your first quest</p>
            <div className="onboard-quest-row">
              <ProgressRing value={q.value / q.goal} size={48} stroke={4} tone="quest" label={`${q.title}: ${q.value} of ${q.goal}`}>
                {q.goal > 1 ? `${q.value}/${q.goal}` : null}
              </ProgressRing>
              <div>
                <h2 id="first-quest-h">{q.title}</h2>
                <p className="muted">{q.detail}</p>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="onboard-foot onboard-foot-pair">
        {q ? (
          <>
            <button className="btn btn-lg" onClick={() => onDone("/")}>
              Go to Home
            </button>
            <button className="btn btn-primary btn-lg onboard-next" onClick={() => onDone(q.action.to)}>
              {q.action.label}
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-lg onboard-next" style={{ gridColumn: "1 / -1" }} onClick={() => onDone("/")}>
            Start reading
          </button>
        )}
      </footer>
    </div>
  );
}

function GenreTile({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  const Icon = ICONS[label];
  return (
    <button className="onboard-tile" aria-pressed={on} onClick={onClick}>
      <span className="onboard-tile-art" aria-hidden="true">
        {Icon && <Icon size={26} aria-hidden />}
      </span>
      <span className="onboard-tile-name">{label}</span>
      <span className="onboard-tile-check" aria-hidden="true">
        <Check size={14} />
      </span>
    </button>
  );
}

function OnboardChip({ label, on, neg, onClick }: { label: string; on: boolean; neg?: boolean; onClick: () => void }) {
  const Icon = ICONS[label];
  return (
    <button className={`onboard-chip${neg ? " is-neg" : ""}`} aria-pressed={on} onClick={onClick}>
      {Icon && <Icon size={16} aria-hidden />}
      {label}
    </button>
  );
}
