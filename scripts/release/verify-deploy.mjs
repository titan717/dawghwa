#!/usr/bin/env node
/**
 * Waits until Vercel reports a deploy result for a commit, then prints it.
 *
 * Vercel's Git integration reports deploys as a GitHub *commit status* with the
 * context "Vercel" (not as GitHub Deployments). This script polls
 *   GET /repos/<owner>/<repo>/commits/<sha>/status
 * until that status is `success` or `failure`/`error`, then prints the
 * inspector URL (the status target_url) and the production alias.
 *
 * Works for both repos:
 *   node scripts/release/verify-deploy.mjs --repo titan717/dawghwa --sha <sha>
 *   node scripts/release/verify-deploy.mjs --repo titan717/dawghwa.api --sha main
 *
 * Options:
 *   --repo <owner/name>   default titan717/dawghwa
 *   --sha <sha|ref>       default main (resolved to a full sha first)
 *   --context <name>      default Vercel
 *   --timeout <seconds>   default 900
 *   --interval <seconds>  default 15
 *   --json                print one JSON line instead of text
 *
 * Auth: uses GH_TOKEN or GITHUB_TOKEN when set (e.g. in Actions), otherwise
 * shells out to an authenticated `gh api`. Tokens are never printed.
 *
 * Exit codes: 0 success, 1 failure/error status or API error, 2 timeout.
 */
import { execFileSync } from "node:child_process";

const ALIASES = {
  "titan717/dawghwa": "https://dawghwa.vercel.app",
  "titan717/dawghwa.api": "https://dawghwaapi.vercel.app",
};

function parseArgs(argv) {
  const o = { repo: "titan717/dawghwa", sha: "main", context: "Vercel", timeout: 900, interval: 15, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${a}`);
      return v;
    };
    if (a === "--repo") o.repo = next();
    else if (a === "--sha") o.sha = next();
    else if (a === "--context") o.context = next();
    else if (a === "--timeout") o.timeout = Number(next());
    else if (a === "--interval") o.interval = Number(next());
    else if (a === "--json") o.json = true;
    else if (a === "-h" || a === "--help") {
      console.log("usage: verify-deploy.mjs [--repo owner/name] [--sha sha|ref] [--context Vercel] [--timeout s] [--interval s] [--json]");
      process.exit(0);
    } else throw new Error(`unknown argument: ${a}`);
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(o.repo)) throw new Error(`bad --repo: ${o.repo}`);
  if (!/^[\w./-]+$/.test(o.sha)) throw new Error(`bad --sha: ${o.sha}`);
  if (!(o.timeout > 0) || !(o.interval > 0)) throw new Error("--timeout and --interval must be positive numbers");
  return o;
}

async function gh(path) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    const r = await fetch(`https://api.github.com/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!r.ok) throw new Error(`GitHub API ${r.status} for ${path}`);
    return r.json();
  }
  const out = execFileSync("gh", ["api", path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const sha = /^[0-9a-f]{40}$/.test(o.sha) ? o.sha : (await gh(`repos/${o.repo}/commits/${o.sha}`)).sha;
  const alias = ALIASES[o.repo] ?? null;
  const commit = `https://github.com/${o.repo}/commit/${sha}`;
  const deadline = Date.now() + o.timeout * 1000;
  let last = "";
  for (;;) {
    let st;
    try {
      const combined = await gh(`repos/${o.repo}/commits/${sha}/status?per_page=100`);
      st = combined.statuses.find((s) => s.context === o.context);
    } catch (e) {
      // transient API errors are retried until the deadline
      if (Date.now() > deadline) throw e;
      console.error(`retrying after API error: ${e.message}`);
    }
    const state = st?.state ?? "missing";
    if (state !== last && !o.json) console.error(`[${new Date().toISOString()}] ${o.context}: ${state}${st?.description ? ` (${st.description})` : ""}`);
    last = state;
    if (state === "success" || state === "failure" || state === "error") {
      const res = { repo: o.repo, sha, commit, context: o.context, state, description: st.description, inspector: st.target_url, alias, updated_at: st.updated_at };
      if (o.json) console.log(JSON.stringify(res));
      else {
        console.log(`state:     ${state}`);
        console.log(`commit:    ${commit}`);
        console.log(`inspector: ${st.target_url}`);
        if (alias) console.log(`alias:     ${alias}`);
      }
      process.exit(state === "success" ? 0 : 1);
    }
    if (Date.now() > deadline) {
      const res = { repo: o.repo, sha, commit, context: o.context, state: "timeout", lastSeen: state, alias };
      if (o.json) console.log(JSON.stringify(res));
      else console.log(`state:     timeout after ${o.timeout}s (last seen: ${state})\ncommit:    ${commit}`);
      process.exit(2);
    }
    await sleep(o.interval * 1000);
  }
}

main().catch((e) => {
  console.error(`verify-deploy: ${e.message}`);
  process.exit(1);
});
