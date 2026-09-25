# User analytics (self-hosted Umami)

Product analytics for [https://carabetta.xyz/dotsbr/](https://carabetta.xyz/dotsbr/) — page views and a few map interactions.
This is **not** pipeline observability. There is no Google Analytics / GTM snippet.

| Resource | Value |
|----------|-------|
| Dashboard | https://analytics.carabetta.xyz → website **dotsbr-prod** |
| Tracker | `https://analytics.carabetta.xyz/metrics.js` |
| Website | `dotsbr-prod` (domain `carabetta.xyz`, separate from the homepage’s **Carabetta** site so map traffic is not mixed) |
| Injection | `index.html` `<head>` — skipped on loopback (`localhost` / `127.0.0.1` / `::1` / `*.localhost`) |

Umami is cookieless. The website UUID is a public client id (same pattern as the carabetta.xyz homepage); it lives in `index.html` because this page has no build/env step.

Local `python3 scripts/serve.py` does not send events.

## Event taxonomy

| Event | When | Props |
|-------|------|-------|
| *(pageview)* | Production page load (Umami auto-track) | path `/dotsbr/` |
| `view_switch` | Click on Raça / Renda / Religião (desktop or sheet) | `view`: `race` \| `income` \| `religion` (`deaths` stays hidden) |
| `share` | Click **Compartilhar** (intent, including a cancelled OS sheet) | `via`: `native` \| `download` |

Custom events use `trackEvent` in `index.html` (`window.umami.track`). Property values are only string / number / boolean.

## Verify

```sh
curl -sfI https://analytics.carabetta.xyz/metrics.js | head -5
```

After a production deploy: open https://carabetta.xyz/dotsbr/, then in Umami under **dotsbr-prod** confirm a pageview. Switch Raça/Renda and share once if you want those events too. Localhost must not appear.
