# comix.ws: robots.txt, terms and DMCA pages (checked 2026-11-22)

Checked 2026-11-22 14:23 UTC from the Dawghwa agent sandbox with plain HTTPS GETs (browser-like user agent, about 1 request per second, no cookies, no login). Three requests in total. After the block, comix.ws was not contacted again.

| URL | HTTP | Result |
|---|---|---|
| https://comix.ws/robots.txt | 200 `text/plain` | Full text below |
| https://comix.ws/terms | 403 | Cloudflare block page "Sorry, you have been blocked / You are unable to access comix.ws" (Ray ID a5e8978c2e33a5f2) |
| https://comix.ws/dmca | 403 | Same Cloudflare block page (Ray ID a5e897947ac4f933) |

The Cloudflare page says: "This website is using a security service to protect itself from online attacks. The action you just performed triggered the security solution." It suggests emailing the site owner with the Ray ID.

**Outcome:** the brief says to stop on any 403 or anti-bot challenge, so I stopped there. I did not retry the terms or DMCA pages, try a browser, a proxy or a cache, or open any title page. That means the terms of service, the DMCA policy and any API terms could not be read, and I can't report them. No public API terms were found. Because the terms are unknown, the terms check for anything built on comix.ws has **not passed**.

## robots.txt (verbatim, as served)

```
# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a Content-Signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a Content-Signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a Content-Signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via Content-Signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.
# use:      how AI systems may consume the content (immediate, reference, or full).

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

# BEGIN Cloudflare Managed content


User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

# Training crawlers
User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: omgili
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: MistralAI-Training
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: GoogleOther
Disallow: /

User-agent: Baiduspider
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: AwarioSmartBot
User-agent: AwarioRssBot
Disallow: /

User-agent: Google-CloudVertexBot
Disallow: /

User-agent: QualifiedBot
Disallow: /

User-agent: Cotoyogi
Disallow: /

User-agent: ICC-Crawler
Disallow: /

User-agent: atlassian-bot
Disallow: /

User-agent: FishBot
Disallow: /

User-agent: BorderxBot
Disallow: /

User-agent: NavuBot
Disallow: /

User-agent: SemrushBot-SWA
Disallow: /

User-agent: WARDBot
Disallow: /

User-agent: magpie-crawler
Disallow: /

User-agent: KimiBot
Disallow: /

User-agent: CitibotSiteCrawler
Disallow: /

# END Cloudflare Managed Content

```

## What robots.txt says

- `User-agent: *` gets `Allow: /` with `Content-Signal: search=yes,ai-train=no,use=reference`. Search indexing is allowed. AI training and fine-tuning are not. AI use is limited to "reference".
- About 30 named AI and training crawlers are blocked from the whole site (`Disallow: /`).
- The file reserves rights under Article 4 of EU Directive 2019/790 (text-and-data-mining opt-out).
- The served file has no `/u/` disallow, although USER_REQUEST.md mentions one. I'm reporting it as served on 2026-11-22.

Dawghwa doesn't use comix.ws content for AI training, and this document doesn't reproduce any of the site's content, markup, styles, assets or branding.
