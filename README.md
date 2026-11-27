# Channel Dashboard

Static site, no build step. Upload this folder's files to a GitHub repo and turn on Pages.

## Deploy
1. Put `index.html`, `style.css`, `app.js`, `config.js` in the repo root.
2. Settings → Pages → Deploy from branch → `main` / root.
3. In Google Cloud, add `https://YOURNAME.github.io` as an Authorized JavaScript origin on the OAuth client, and `https://YOURNAME.github.io/*` as an HTTP referrer on the API key.

## Files
- `config.js` is the only file you edit: API key, channel IDs, refresh settings.
- Anything in it is public if the repo is public. Keep `ACCESS_TOKEN` blank; shared Analytics are published as public JSON by GitHub Actions.

## Refresh schedule (fixed to the wall clock)
- Public stats: every 5 minutes at :00, :05, :10 ... while the page is open. Closed pages make no requests. Reopening within 10 minutes reuses that channel's local cache; after 10 minutes it fetches fresh data.
- Analytics: on the hour. Its data is daily and a token lasts about an hour. Each refresh also fetches comments and device breakdowns; this does not change the hourly cadence.
- Private Analytics rows are cached in this browser for 10 minutes. OAuth access tokens are never written to browser storage.
- Costs about 9 API units per refresh (about 2,600 of the 10,000 daily units for one open tab).
- Change `REFRESH_MS` / `ANALYTICS_MS` in `config.js` if you want another cadence.

## Public Analytics sharing
A GitHub Action fetches the channel's private Analytics every 3 hours using a refresh token that you authorize once, then publishes the report as plain JSON. Visitors do not need a Google account, token, or password.

Anyone who can access the dashboard can also access all published Analytics, including revenue and audience data. Private Analytics still require authorization from an account that owns or manages the channel. The refresh token stays in GitHub Actions secrets; do not hard-code it or an access token in the website.
1. Google Cloud → OAuth consent screen → publish the app (In production). In Testing mode refresh tokens die after 7 days.
2. OAuth client: add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
3. OAuth Playground → gear → Use your own OAuth credentials (client ID + secret) → authorize `https://www.googleapis.com/auth/yt-analytics.readonly` and `.../yt-analytics-monetary.readonly` → Exchange → copy the Refresh token. Pick the right channel if Google asks.
4. Repo → Settings → Secrets and variables → Actions: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CHANNELS_JSON` = `[{"id":"UC...","refresh":"1//..."}]`.
5. Settings → Pages → Source: GitHub Actions. Then Actions tab → Deploy dashboard → Run workflow.
6. Share the dashboard link. No password is required.

GitHub pauses scheduled workflows after 60 days without repo activity; re-enable them in the Actions tab if that happens.
