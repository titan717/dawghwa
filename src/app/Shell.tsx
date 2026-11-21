import { lazy, Suspense, useEffect, useMemo, useSyncExternalStore } from "react";
import { NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router-dom";
import { Award, BookOpen, Compass, Home, Search, User, WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { Toasts } from "@/components/Toast";
import { Celebrations } from "@/components/Celebrate";
import { useSettings } from "@/lib/settings";
import { apiHealth } from "@/lib/api/client";
import { useOnline } from "@/lib/platform/useOnline";
import { useUser } from "@/lib/store/user";
import { useSignInRequired } from "@/lib/store/accounts";
import { SignIn } from "@/components/SignIn";
import { updateReady, applyUpdate } from "./pwa";
import { markEntered, shouldShowLanding } from "./landing";

const Landing = lazy(() => import("@/routes/Landing"));

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; aria?: string };
const HOME: NavItem = { to: "/", label: "Home", icon: Home, end: true };
const SEARCH: NavItem = { to: "/search", label: "Search", icon: Search };
const LIBRARY: NavItem = { to: "/library", label: "Library", icon: BookOpen };
const AWARDS: NavItem = { to: "/achievements", label: "Awards", icon: Award, aria: "Achievements" };
const DISCOVER: NavItem = { to: "/discover", label: "Discover", icon: Compass };
const PROFILE: NavItem = { to: "/profile", label: "Profile", icon: User };

/** Five slots (docs/DECISIONS.md D7). With Rewards off the Awards slot gives way to Discover. */
export const navItems = (rewards: boolean): NavItem[] => [HOME, SEARCH, LIBRARY, rewards ? AWARDS : DISCOVER, PROFILE];

function useApiHealth() {
  return useSyncExternalStore(apiHealth.subscribe, apiHealth.get, apiHealth.get);
}

export function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const online = useOnline();
  const health = useApiHealth();
  const update = useSyncExternalStore(updateReady.subscribe, updateReady.get, updateReady.get);
  const profile = useUser((s) => s.profile);
  const { rewards } = useSettings();
  const NAV = navItems(rewards);
  const ready = useUser((s) => s.ready);
  const locked = useSignInRequired();
  useEffect(() => {
    if (ready) void import("@/lib/rewards/runtime").then((m) => m.startRewards());
  }, [ready]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        nav("/search");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [nav]);
  const immersive = loc.pathname.startsWith("/title/");
  const landing = useMemo(() => loc.pathname === "/" && shouldShowLanding(profile, loc.search), [loc.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!landing) markEntered();
  }, [landing]);
  if (locked) return <SignIn />;
  if (landing) return <Suspense fallback={null}><Landing /></Suspense>;

  return (
    <div className="shell" data-own-chrome={immersive || undefined} style={{ display: "block" }}>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="main">
        {!online ? (
          <div className="banner banner-warn" role="status">
            <WifiOff size={16} /> You're offline. Library, history and saved data still work; new content will load when you reconnect.
          </div>
        ) : health === "unreachable" ? (
          <div className="banner banner-warn" role="status">
            <CloudOff size={16} /> The Dawghwa service isn't responding right now. Showing what's saved on this device.
          </div>
        ) : null}
        {update && (
          <div className="banner" role="status">
            <RefreshCw size={16} /> A new version of Dawghwa is ready.
            <button className="btn btn-sm btn-primary" onClick={applyUpdate}>Update</button>
          </div>
        )}
        <main id="main" tabIndex={-1}><Outlet /></main>
        {(loc.pathname === "/" || loc.pathname === "/about") && (
          <footer className="site-foot">
            <span>Dawghwa does not host content. Titles, covers and chapters come from their providers through Dawghwa.</span>
            <a href="https://github.com/Titan717/dawghwa" rel="noopener" target="_blank">Source</a>
            <NavLink to="/about">About and credits</NavLink>
          </footer>
        )}
      </div>
      <nav className="bottomnav" aria-label="Primary" style={{ display: "grid" }}>
        {NAV.map(({ to, label, icon: Icon, end, aria }) => (
          <NavLink key={to} to={to} end={end} aria-label={aria ? `${label}: ${aria}` : undefined}>
            <span className="nav-ico"><Icon size={21} strokeWidth={2} /></span>
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
