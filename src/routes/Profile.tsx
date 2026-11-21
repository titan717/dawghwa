import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, Download, Lock, LogOut, Plus, RotateCcw, Share2, Trash2, Upload } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Segmented } from "@/components/Segmented";
import { Kicker } from "@/components/Editorial";
import { MascotSays } from "@/components/Mascot";
import { ProfileSkeleton } from "@/components/States";
import { readingStats, type ReadingStats } from "@/lib/profile/stats";
import { avatarFileToDataUrl } from "@/lib/profile/avatar";
import { LevelMascot } from "@/components/LevelMascot";
import { useProgression } from "@/lib/rewards";
import { genrePath } from "@/lib/genres";
import { Sheet } from "@/components/Layer";
import { toast } from "@/components/Toast";
import { useHead } from "@/lib/seo";
import { updateSettings, useSettings } from "@/lib/settings";
import { createProfile, deleteProfile, switchProfile, unhideTitle, updateProfile, useUser } from "@/lib/store/user";
import { isMemoryStorage } from "@/lib/store/db";
import { downloadJson, exportProfile, importProfile, MAX_TRANSFER_FILE_BYTES } from "@/lib/store/transfer";
import { resetIntel, useIntel } from "@/lib/intel/runtime";
import { evidence } from "@/lib/intel/learner";
import { featureLabel } from "@/lib/intel/features";
import { titlePath } from "@/lib/titles";
import { isNative, platformName } from "@/lib/platform";
import { monthRecap, recapLine } from "@/lib/profile/recap";
import { isValidPin, setPin, signOut, verifyPin } from "@/lib/store/accounts";
import faceUrl from "@/assets/mascot/head.webp";

function TasteDna() {
  const s = useIntel();
  const rows = useMemo(() => {
    if (!s) return [];
    return Object.entries(s.affinity)
      .filter(([k, a]) => a.pos >= 2 && a.score > 0 && !k.startsWith("gp:") && !k.startsWith("st:"))
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 8);
  }, [s]);
  const max = rows[0]?.[1].score ?? 1;
  const e = s ? evidence(s) : 0;
  return (
    <section className="settings-group" aria-labelledby="dna-h">
      <h2 id="dna-h">Taste profile</h2>
      <p className="muted" style={{ fontSize: "var(--text-sm)", marginBottom: 12 }}>
        Learned on this device from chapters you finish, titles you save, like or ask more of, and the ones you hide. Nothing is sent anywhere.
      </p>
      {rows.length ? (
        <div className="dna">
          {rows.map(([k, a]) => (
            <div key={k} className="dna-row">
              <span>{featureLabel(k)}</span>
              <span className="dna-bar" aria-hidden="true">
                <i style={{ width: `${Math.max(8, (a.score / max) * 100)}%` }} />
              </span>
              <span className="muted" style={{ fontSize: "var(--text-xs)" }}>
                {a.pos} titles
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Not enough reading yet. Read a few chapters or save some titles and this fills in.</p>
      )}
      <p className="muted" style={{ fontSize: "var(--text-xs)", marginTop: 12 }}>
        Confidence {Math.round(e * 100)}% · {s?.eventCount ?? 0} interactions
      </p>
    </section>
  );
}

function Activity({ s }: { s: ReadingStats }) {
  const max = Math.max(1, ...s.days.map((d) => d.count));
  const level = (c: number) => (c === 0 ? 0 : c / max > 0.66 ? 3 : c / max > 0.33 ? 2 : 1);
  const lead = (new Date(s.days[0]!.date).getDay() + 6) % 7; // Monday-first columns
  const cells = [...Array.from({ length: lead }, () => null), ...s.days];
  return (
    <section className="profile-block" aria-labelledby="activity-h">
      <div className="profile-block-head">
        <h2 id="activity-h">Reading activity</h2>
        <p className="muted">Chapters finished over the last 12 weeks</p>
      </div>
      <div className="heatmap" role="img" aria-label={`${s.activeDays} active days in the last 12 weeks`}>
        {cells.map((d, i) => (d ? <span key={d.date} data-l={level(d.count)} title={`${new Date(d.date).toLocaleDateString()}: ${d.count} ${d.count === 1 ? "chapter" : "chapters"}`} /> : <span key={`x${i}`} data-empty />))}
      </div>
      <p className="recap">
        <b>{s.thisMonth}</b> {s.thisMonth === 1 ? "chapter" : "chapters"} this month
        {s.lastMonth > 0 && <span className="muted"> · {s.lastMonth} last month</span>}
      </p>
    </section>
  );
}

/** Monthly recap (Phase 5, D32): derived from the farm-proof XP ledger, neutral copy. */
function MonthlyRecap() {
  const events = useUser((s) => s.events);
  const titles = useUser((s) => s.titles);
  const { rewards } = useSettings();
  const [which, setWhich] = useState<"0" | "1">("0");
  const r = useMemo(() => monthRecap(events, titles, Number(which)), [events, titles, which]);
  return (
    <section className="profile-block recap-card" aria-labelledby="recap-h">
      <div className="profile-block-head recap-head">
        <div>
          <h2 id="recap-h">{r.label} recap</h2>
          <p className="muted">{recapLine(r)}</p>
        </div>
        <Segmented label="Recap month" value={which} options={[["0", "This month"], ["1", "Last month"]]} onChange={setWhich} />
      </div>
      <dl className="recap-grid">
        {([
          ["Chapters", r.chapters],
          ["New series", r.newSeries],
          ["Completed", r.completed],
          ["Reading days", r.activeDays],
          ...(rewards ? [["XP earned", r.xp] as [string, number]] : []),
        ] as [string, number][]).map(([l, v]) => (
          <div key={l}>
            <dt>{l}</dt>
            <dd>{v.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      {r.top.length > 0 && (
        <div className="recap-row">
          <h3>Most read</h3>
          <ol className="recap-top">
            {r.top.map((t) => {
              const tt = titles.get(t.titleKey);
              return (
                <li key={t.titleKey}>
                  {tt ? <Link to={titlePath(tt)}>{tt.title}</Link> : <span>A series</span>}
                  <span className="muted"> · {t.chapters} ch</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {(r.genres.length > 0 || r.newGenres.length > 0) && (
        <div className="recap-row">
          <h3>Genres</h3>
          <p className="recap-genres">
            {r.genres.slice(0, 5).map(([g]) => (
              <Link key={g} className="chip" to={genrePath(g)}>
                {g}
                {r.newGenres.includes(g) && <span className="recap-new">new</span>}
              </Link>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}

/** Reader card: preview, then share as a PNG (Capacitor Share / Web Share / download). */
function ReaderCard({ stats }: { stats: ReadingStats }) {
  const profile = useUser((s) => s.profile)!;
  const { rewards } = useSettings();
  const { level } = useProgression();
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const make = async () => {
    setOpen(true);
    const { drawReaderCard } = await import("@/lib/profile/card");
    const blob = await drawReaderCard({
      name: profile.name,
      color: profile.color,
      level: rewards ? { level: level.level, tier: level.tier.name, progress: level.progress } : undefined,
      genres: stats.genres.map(([g]) => g),
      days: stats.days.map((d) => d.count),
      stats: [
        ["Chapters", stats.chaptersRead],
        ["Series", stats.seriesStarted],
        ["Completed", stats.completed],
      ],
      mascot: faceUrl,
    });
    setImg((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { url: URL.createObjectURL(blob), blob };
    });
  };
  const close = () => {
    setOpen(false);
    if (img) URL.revokeObjectURL(img.url);
    setImg(null);
  };
  return (
    <>
      <button className="btn" onClick={() => void make()}>
        <Share2 size={16} aria-hidden="true" /> Share reader card
      </button>
      <Sheet open={open} onClose={close} title="Your reader card">
        <div className="stack reader-card-preview">
          {img ? <img src={img.url} alt={`Reader card for ${profile.name}`} width={540} height={675} /> : <div className="skeleton" style={{ aspectRatio: "4 / 5" }} aria-label="Drawing your card" />}
          <p className="muted" style={{ fontSize: "var(--text-xs)", margin: 0 }}>
            Shows your name, {rewards ? "level, " : ""}top genres and a 12-week activity grid. No titles or history.
          </p>
          <button
            className="btn btn-primary"
            disabled={!img}
            onClick={async () => {
              if (!img) return;
              const { shareCard } = await import("@/lib/profile/card");
              const r = await shareCard(img.blob);
              toast(r === "downloaded" ? "Card saved to downloads" : r === "failed" ? "Couldn't share the card" : "Shared");
            }}
          >
            <Share2 size={16} aria-hidden="true" /> {isNative() || "share" in navigator ? "Share" : "Download"}
          </button>
        </div>
      </Sheet>
    </>
  );
}

/** Optional sign-in PIN for this reader (D4, D29). */
function PinSettings() {
  const profile = useUser((s) => s.profile)!;
  const [mode, setMode] = useState<null | "set" | "remove">(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const close = () => {
    setMode(null);
    setCur("");
    setNext("");
    setErr("");
  };
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  return (
    <>
      <div className="settings-row">
        <span>
          <span className="label">
            <Lock size={14} aria-hidden="true" /> Sign-in PIN
          </span>
          <span className="hint">{profile.pin ? "On. Asked when this reader opens. A privacy curtain, not encryption." : "Off. Add one if others use this device."}</span>
        </span>
        <span className="cluster">
          <button className="btn btn-sm" onClick={() => setMode("set")}>
            {profile.pin ? "Change" : "Add PIN"}
          </button>
          {profile.pin && (
            <button className="btn btn-sm btn-ghost" onClick={() => setMode("remove")}>
              Remove
            </button>
          )}
        </span>
      </div>
      <Sheet open={mode !== null} onClose={close} title={mode === "remove" ? "Remove PIN" : profile.pin ? "Change PIN" : "Add a PIN"}>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (profile.pin && !(await verifyPin(profile, cur))) return setErr("Current PIN doesn't match.");
            await setPin(mode === "remove" ? null : next);
            toast(mode === "remove" ? "PIN removed" : "PIN saved");
            close();
          }}
        >
          {profile.pin && (
            <label className="field">
              <span>Current PIN</span>
              <input className="input" type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} autoFocus value={cur} onChange={(e) => (setErr(""), setCur(digits(e.target.value)))} />
            </label>
          )}
          {mode === "set" && (
            <label className="field">
              <span>New 4-digit PIN</span>
              <input className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} autoFocus={!profile.pin} value={next} onChange={(e) => setNext(digits(e.target.value))} />
            </label>
          )}
          {err && (
            <p className="signin-error" role="alert">
              {err}
            </p>
          )}
          <button className="btn btn-primary" disabled={(profile.pin && !isValidPin(cur)) || (mode === "set" && !isValidPin(next))}>
            {mode === "remove" ? "Remove PIN" : "Save PIN"}
          </button>
        </form>
      </Sheet>
    </>
  );
}

/** Level summary and genre passport. Shown only when Profile > Rewards is on. */
function RewardsSummary() {
  const { level, sets, stamps } = useProgression();
  const earned = sets.reduce((n, x) => n + x.tier, 0);
  const stamped = stamps.filter((x) => x.stamped).length;
  return (
    <>
      <section className="profile-block level-card level-card-sm" aria-labelledby="awards-h">
        <LevelMascot level={level} size={72} />
        <div className="level-body">
          <p className="level-tier">{level.tier.name}</p>
          <h2 id="awards-h">Level {level.level}</h2>
          <p className="muted">
            {level.into} / {level.span} XP · {earned} badge tiers
          </p>
        </div>
        <Link className="btn" to="/achievements">
          <Award size={17} aria-hidden="true" /> Achievements
        </Link>
      </section>
      <section className="profile-block" aria-labelledby="passport-h">
        <div className="profile-block-head">
          <h2 id="passport-h">Genre passport</h2>
          <p className="muted">
            {stamped} of {stamps.length} stamped · read one chapter to stamp a genre
          </p>
        </div>
        <ul className="passport">
          {stamps.map((x) => (
            <li key={x.name} data-stamped={x.stamped || undefined}>
              <Link to={genrePath(x.name)}>
                <span className="stamp-name">{x.name}</span>
                <span className="stamp-meta">{x.stamped ? `${x.chapters} ch` : "Try it"}</span>
                <span className="sr-only">{x.stamped ? ", stamped" : ", not stamped yet"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function Profile() {
  const profile = useUser((s) => s.profile);
  const profiles = useUser((s) => s.profiles);
  const hidden = useUser((s) => s.hidden);
  const titles = useUser((s) => s.titles);
  const settings = useSettings();
  const nav = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const avatarFile = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<null | "reset" | "delete">(null);
  const progress = useUser((s) => s.progress);
  const library = useUser((s) => s.library);
  const stats = useMemo(() => readingStats(progress.values(), library.values(), titles), [progress, library, titles]);
  useHead({ title: "Profile and settings", noindex: true });
  if (!profile) return <ProfileSkeleton />;
  const hasReading = stats.chaptersRead > 0 || stats.completed > 0 || stats.favourites > 0;
  return (
    <div className="page page-narrow profile-page">
      <header className="profile-hero">
        <ProfileAvatar profile={profile} size={80} />
        <div style={{ minWidth: 0 }}>
          <Kicker>Your reading universe</Kicker>
          <h1>{profile.name}</h1>
          <p className="muted">Reading, library and recommendations for this profile stay on this device.</p>
          {hasReading && (
            <div className="cluster" style={{ marginTop: 12 }}>
              <ReaderCard stats={stats} />
            </div>
          )}
        </div>
      </header>
      <dl className="stat-strip profile-stats" style={{ ["--n" as string]: 4 }}>
        {[
          ["Chapters read", stats.chaptersRead],
          ["Series started", stats.seriesStarted],
          ["Completed", stats.completed],
          ["Favourites", stats.favourites],
        ].map(([l, v]) => (
          <div key={l}>
            <dt>{l}</dt>
            <dd>{Number(v).toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      {!hasReading ? (
        <div className="profile-block">
          <MascotSays size={96}>Your stats fill in as you read. Finish a chapter and it shows up here.</MascotSays>
          <Link className="btn btn-primary" to="/">
            Enter your next story
          </Link>
        </div>
      ) : (
        <>
          <Activity s={stats} />
          <MonthlyRecap />
          {stats.genres.length > 0 && (
            <section className="profile-block" aria-labelledby="genres-h">
              <div className="profile-block-head">
                <h2 id="genres-h">Favourite genres</h2>
                <p className="muted">From series you've read or saved</p>
              </div>
              <ol className="genre-rank">
                {stats.genres.slice(0, 5).map(([g, n], i) => (
                  <li key={g}>
                    <Link to={`/discover?tag=${encodeURIComponent(g)}`}>
                      <span className="genre-rank-no">{String(i + 1).padStart(2, "0")}</span>
                      <span className="genre-rank-name">{g}</span>
                      <span className="muted">
                        {n} series
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
      {settings.rewards && <RewardsSummary />}

      <h2 className="settings-title" id="settings">
        Settings
      </h2>
      <section className="settings-group" id="rewards" aria-labelledby="rewards-h">
        <h3 id="rewards-h">Rewards</h3>
        <label className="switch settings-row">
          <span>
            <span className="label">Show rewards</span>
            <span className="hint">Levels, achievements, weekly quests and chapter-end moments. Off hides all of it; your reading still counts.</span>
          </span>
          <input type="checkbox" checked={settings.rewards} onChange={(e) => updateSettings({ rewards: e.target.checked })} />
        </label>
      </section>
      {isMemoryStorage() && (
        <div className="banner banner-warn" role="status">
          This browser blocks local storage, so nothing will be kept after you close the tab.
        </div>
      )}

      <section className="settings-group" aria-labelledby="profiles-h">
        <h2 id="profiles-h">Profiles</h2>
        <div className="chips">
          {profiles.map((p) => (
            <button key={p.id} className="chip" aria-pressed={p.id === profile.id} onClick={() => void switchProfile(p.id).then(() => toast(`Switched to ${p.name}`))}>
              <ProfileAvatar profile={p} size={28} />
              {p.name}
            </button>
          ))}
          <button className="chip" onClick={() => setNewOpen(true)}>
            <Plus size={15} /> New reader
          </button>
        </div>
        <label className="field" style={{ marginTop: 16 }}>
          <span>Name</span>
          <input className="input" defaultValue={profile.name} key={profile.id} maxLength={40} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== profile.name && void updateProfile({ name: e.target.value.trim() })} />
        </label>
        <div className="field" style={{ marginTop: 16 }}>
          <span id="profile-avatar-label">Profile avatar</span>
          <p className="hint" id="profile-avatar-hint">Stored on this device only; included only in manual profile exports. GIF, PNG, JPEG or WebP, up to 1.5 MB and 1024 pixels per edge.</p>
          <div className="cluster" style={{ marginTop: 8 }}>
            <ProfileAvatar profile={profile} size={40} />
            <input
              ref={avatarFile}
              type="file"
              accept="image/gif,image/png,image/jpeg,image/webp"
              hidden
              disabled={avatarBusy}
              aria-label="Choose a profile avatar"
              aria-describedby="profile-avatar-hint"
              onChange={async (e) => {
                const input = e.currentTarget;
                const selected = input.files?.[0];
                input.value = "";
                if (!selected) return;
                setAvatarBusy(true);
                try {
                  await updateProfile({ avatar: await avatarFileToDataUrl(selected) });
                  toast("Avatar updated on this device");
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Avatar update failed");
                } finally {
                  setAvatarBusy(false);
                }
              }}
            />
            <button className="btn btn-sm" type="button" disabled={avatarBusy} aria-describedby="profile-avatar-hint" onClick={() => avatarFile.current?.click()}>
              {avatarBusy ? "Saving…" : profile.avatar ? "Change avatar" : "Add avatar"}
            </button>
            {profile.avatar && (
              <button
                className="btn btn-sm btn-ghost"
                type="button"
                disabled={avatarBusy}
                aria-describedby="profile-avatar-hint"
                onClick={async () => {
                  setAvatarBusy(true);
                  try {
                    await updateProfile({ avatar: undefined });
                    toast("Avatar removed from this device");
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Avatar removal failed");
                  } finally {
                    setAvatarBusy(false);
                  }
                }}
              >
                Remove avatar
              </button>
            )}
          </div>
          <span className="hint" role="status" aria-live="polite">{avatarBusy ? "Updating avatar…" : ""}</span>
        </div>
        <label className="switch settings-row">
          <span>
            <span className="label">Personalised recommendations</span>
            <span className="hint">Off shows the same catalogue order to everyone.</span>
          </span>
          <input type="checkbox" checked={profile.prefs.personalize !== false} onChange={(e) => void updateProfile({ prefs: { ...profile.prefs, personalize: e.target.checked } })} />
        </label>
        <PinSettings />
        <div className="cluster" style={{ marginTop: 8 }}>
          <button className="btn btn-sm" onClick={() => nav("/welcome?edit=1")}>
            Edit favourite genres
          </button>
          <button className="btn btn-sm" onClick={() => signOut()}>
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
          {profiles.length > 1 && (
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirm("delete")}>
              <Trash2 size={15} /> Delete profile
            </button>
          )}
        </div>
      </section>

      <TasteDna />

      <section className="settings-group" aria-labelledby="appearance-h">
        <h2 id="appearance-h">Appearance</h2>
        <div className="settings-row">
          <span className="label">Theme</span>
          <Segmented label="Theme" value={settings.theme} options={[["dark", "Dark"], ["light", "Light"], ["system", "System"]]} onChange={(v) => updateSettings({ theme: v })} />
        </div>
        <div className="settings-row">
          <span className="label">Reduce motion</span>
          <Segmented label="Reduce motion" value={settings.reduceMotion} options={[["system", "System"], ["on", "On"], ["off", "Off"]]} onChange={(v) => updateSettings({ reduceMotion: v })} />
        </div>

        <label className="switch settings-row">
          <span>
            <span className="label">Show mature covers</span>
            <span className="hint">Covers of series the source marks suggestive or adult are blurred until you turn this on.</span>
          </span>
          <input type="checkbox" checked={settings.matureCovers === "show"} onChange={(e) => updateSettings({ matureCovers: e.target.checked ? "show" : "blur" })} />
        </label>
      </section>

      <section className="settings-group" aria-labelledby="reading-h">
        <h2 id="reading-h">Reading</h2>
        <label className="switch settings-row">
          <span>
            <span className="label">Auto-continue to next chapter</span>
          </span>
          <input type="checkbox" checked={settings.autoNext} onChange={(e) => updateSettings({ autoNext: e.target.checked })} />
        </label>
        <label className="switch settings-row">
          <span>
            <span className="label">Data saver</span>
            <span className="hint">Compressed page images where the source offers them.</span>
          </span>
          <input type="checkbox" checked={settings.dataSaver} onChange={(e) => updateSettings({ dataSaver: e.target.checked })} />
        </label>
      </section>

      <section className="settings-group" aria-labelledby="hidden-h">
        <h2 id="hidden-h">Hidden titles</h2>
        {hidden.size ? (
          <div className="list">
            {[...hidden.values()].map((h) => {
              const t = titles.get(h.titleKey);
              return (
                <div key={h.titleKey} className="list-item list-item-plain">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {t ? <Link to={titlePath(t)}>{t.title}</Link> : h.titleKey}
                    <span className="card-meta">{h.reason === "not_interested" ? "Not interested" : "Hidden"}</span>
                  </span>
                  <button className="btn btn-sm" onClick={() => void unhideTitle(h.titleKey)}>
                    Show again
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Titles you mark Not interested or hide are listed here.</p>
        )}
      </section>

      <section className="settings-group" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          Everything is stored on this device{isNative() ? ` (${platformName()})` : " in this browser"}. Export to back up or move to another device.
        </p>
        <div className="cluster" style={{ marginTop: 12 }}>
          <button
            className="btn"
            onClick={async () => {
              try {
                const data = await exportProfile();
                downloadJson(`dawghwa-${profile.name.replace(/\W+/g, "-").toLowerCase()}.json`, data);
                toast("Profile exported");
              } catch (err) {
                toast(err instanceof Error ? err.message : "Profile export failed");
              }
            }}
          >
            <Download size={16} /> Export profile
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload size={16} /> Import
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                if (f.size > MAX_TRANSFER_FILE_BYTES) throw new Error("Profile import files must be 100 MiB or smaller.");
                const p = await importProfile(await f.text());
                toast(`Imported as ${p.name}`);
              } catch (err) {
                toast(err instanceof Error ? err.message : "Import failed");
              }
            }}
          />
          <button className="btn btn-ghost" onClick={() => setConfirm("reset")}>
            <RotateCcw size={16} /> Reset recommendations
          </button>
        </div>
      </section>

      <p className="muted" style={{ fontSize: "var(--text-xs)", marginTop: 24 }}>
        <Link className="footer-link" to="/about">About Dawghwa and credits</Link>
      </p>

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="New reader">
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            const p = await createProfile(n);
            await switchProfile(p.id);
            setNewOpen(false);
            setName("");
            nav("/welcome?new=1");
          }}
        >
          <label className="field">
            <span>Name</span>
            <input className="input" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={!name.trim()}>
            Create and switch
          </button>
        </form>
      </Sheet>
      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === "delete" ? `Delete ${profile.name}?` : "Reset recommendations?"}>
        <p className="muted">{confirm === "delete" ? "This permanently removes this profile's library, history and taste profile from this device." : "Your library and history stay. The taste profile starts fresh from now on."}</p>
        <div className="cluster" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (confirm === "delete") await deleteProfile(profile.id);
              else await resetIntel();
              toast(confirm === "delete" ? "Profile deleted" : "Recommendations reset");
              setConfirm(null);
            }}
          >
            {confirm === "delete" ? "Delete profile" : "Reset"}
          </button>
          <button className="btn" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
