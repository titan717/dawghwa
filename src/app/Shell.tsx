import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  Compass,
  History,
  Home,
  Search,
  Shuffle,
  User,
  WifiOff,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Toasts } from "@/components/Toast";
import { Celebrations } from "@/components/Celebrate";
import { useSettings } from "@/lib/settings";
import { apiHealth } from "@/lib/api/client";
import { useOnline } from "@/lib/platform/useOnline";
import { useUser } from "@/lib/store/user";
import { useSignInRequired } from "@/lib/store/accounts";
import { SignIn } from "@/components/SignIn";
import { StreakChip } from "@/components/StreakChip";
import { IncognitoNotice } from "@/components/IncognitoNotice";
import { useIncognito } from "@/lib/store/incognito";
import { updateReady, applyUpdate } from "./pwa";
import { markEntered, shouldShowLanding } from "./landing";
import "@/styles/shell.css";

const Landing = lazy(() => import("@/routes/Landing"));

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; aria?: string; fill?: boolean };
const HOME: NavItem = { to: "/", label: "Home", icon: Home, end: true, fill: true };
const SEARCH: NavItem = { to: "/search", label: "Search", icon: Search };
const LIBRARY: NavItem = { to: "/library", label: "My Series", icon: BookOpen, fill: true };
const DISCOVER: NavItem = { to: "/discover", label: "Discover", icon: Compass };
const PROFILE: NavItem = { to: "/profile", label: "Profile", icon: User, fill: true };
/** Desktop header only: on phones History is reached from Profile. */
const HISTORY: NavItem = { to: "/history", label: "History", icon: History };

/**
 * Five slots, in the v2 blueprint order. Streak, XP and level live on the profile card,
 * not in the main navigation, so the slots are the same with Rewards on or off.
 */
export const navItems = (_rewards?: boolean): NavItem[] => [HOME, DISCOVER, SEARCH, LIBRARY, PROFILE];

/** True once the page has scrolled a little: the sticky header and Home's bar pick up a soft edge. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

function useApiHealth() {
  return useSyncExternalStore(
    apiHealth.subscribe,
    apiHealth.get,
    apiHealth.get,
  );
}

export function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const online = useOnline();
  const health = useApiHealth();
  const update = useSyncExternalStore(
    updateReady.subscribe,
    updateReady.get,
    updateReady.get,
  );
  const profile = useUser((s) => s.profile);
  const incognito = useIncognito();
  const { rewards } = useSettings();
  const NAV = navItems(rewards);
  const ready = useUser((s) => s.ready);
  const locked = useSignInRequired();
  const scrolled = useScrolled();
  useEffect(() => {
    // Reward moments are optional and lazy: the engine stays out of the initial bundle.
    if (ready) void import("@/lib/rewards/runtime").then((m) => m.startRewards());
  }, [ready]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !typing)
      ) {
        e.preventDefault();
        nav("/search");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [nav]);
  // Title pages bring their own header and sticky read button on phones (blueprint), so the shell steps aside there.
  const immersive = loc.pathname.startsWith("/title/");
  // Decided once per location: leaving the landing sets the "entered" flag before the
  // router finishes loading the next screen, and a re-render of "/" in between must not
  // swap in Home (whose onboarding redirect would drop the hand-off query).
  const landing = useMemo(() => loc.pathname === "/" && shouldShowLanding(profile, loc.search), [loc.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // Anyone who has reached a screen inside the app (a deep link, /welcome, a shared
  // title) has entered it; the landing is only for a first visit to the bare root.
  useEffect(() => {
    if (!landing) markEntered();
  }, [landing]);
  if (locked) return <SignIn />;
  // First-time web visitors meet the landing page at "/" (src/app/landing.ts).
  if (landing)
    return (
      <Suspense fallback={null}>
        <Landing />
      </Suspense>
    );
  return (
    <div className="shell" data-own-chrome={immersive || undefined} data-scrolled={scrolled || undefined}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header" data-scrolled={scrolled || undefined}>
        <NavLink to="/" end className="app-header-brand" aria-label="Dawghwa home">
          <Brand />
        </NavLink>
        <nav className="app-header-nav" aria-label="Primary">
          {[...NAV.filter((n) => n.to !== "/profile"), HISTORY].map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="app-header-actions">
          {loc.pathname === "/" && (
            <button
              type="button"
              className="app-header-icon"
              onClick={() => nav("/?surprise=1")}
              aria-label="Surprise me: open a random pick"
              title="Surprise me"
            >
              <Shuffle size={19} strokeWidth={1.9} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="app-header-search"
            onClick={() => nav("/search")}
            aria-label="Search (press / or Ctrl+K)"
          >
            <Search size={17} strokeWidth={1.9} aria-hidden="true" />
            <span aria-hidden="true">Search</span>
            <kbd aria-hidden="true">/</kbd>
          </button>
          <StreakChip to="/achievements" incognito={incognito} className="app-header-streak" />
          {profile && (
            <NavLink to="/profile" className="app-header-avatar" aria-label={`Profile: ${profile.name}`}>
              <ProfileAvatar profile={profile} size={34} />
            </NavLink>
          )}
        </div>
      </header>
      <div className="main">
        {!online ? (
          <div className="banner banner-warn" role="status">
            <WifiOff size={16} /> You're offline. Library, history and saved
            data still work; new content will load when you reconnect.
          </div>
        ) : health === "unreachable" ? (
          <div className="banner banner-warn" role="status">
            <CloudOff size={16} /> The Dawghwa service isn't responding right
            now. Showing what's saved on this device.
          </div>
        ) : null}
        {update && (
          <div className="banner" role="status">
            <RefreshCw size={16} /> A new version of Dawghwa is ready.
            <button className="btn btn-sm btn-primary" onClick={applyUpdate}>
              Update
            </button>
          </div>
        )}
        {loc.pathname !== "/profile" && <IncognitoNotice />}
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        {(loc.pathname === "/" || loc.pathname === "/about") && (
          <footer className="site-foot">
            <span>
              Dawghwa does not host content. Titles, covers and chapters come
              from their providers through Dawghwa.
            </span>
            <a
              href="https://github.com/Titan717/dawghwa"
              rel="noopener"
              target="_blank"
            >
              Source
            </a>
            <NavLink to="/about">About and credits</NavLink>
          </footer>
        )}
      </div>
      <nav className="bottomnav" aria-label="Primary">
        {NAV.map(({ to, label, icon: Icon, end, aria, fill }) => (
          <NavLink key={to} to={to} end={end} aria-label={aria ? `${label}: ${aria}` : undefined}>
            <span className="nav-ico">
              <Icon size={23} strokeWidth={1.7} className={fill ? "fillable" : undefined} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
      <Toasts />
      <Celebrations />
      <ScrollRestoration getKey={(l) => l.pathname + l.search} />
    </div>
  );
}
