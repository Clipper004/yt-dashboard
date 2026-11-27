# Channel Dashboard

Static site, no build step. Upload this folder's files to a GitHub repo and turn on Pages.

## Deploy
1. Put `index.html`, `style.css`, `app.js`, `config.js` in the repo root.
2. Settings → Pages → Deploy from branch → `main` / root.
3. In Google Cloud, add `https://YOURNAME.github.io` as an Authorized JavaScript origin on the OAuth client, and `https://YOURNAME.github.io/*` as an HTTP referrer on the API key.

## Files
- `config.js` is the only file you edit: API key, channel IDs, refresh settings.
- Anything in it is public if the repo is public. Keep `ACCESS_TOKEN` blank and use the Connect Analytics button.

## Refresh schedule (fixed to the wall clock)
- Public stats: every 5 minutes at :00, :05, :10 ... no matter when the page was opened. Opening the page loads once straight away, then follows the clock.
- Analytics: on the hour. Its data is daily and a token lasts about an hour. Each refresh also fetches comments and device breakdowns; this does not change the hourly cadence.
- Costs about 9 API units per refresh (about 2,600 of the 10,000 daily units for one open tab).
- Change `REFRESH_MS` / `ANALYTICS_MS` in `config.js` if you want another cadence.

## Analytics for someone without access (encrypted snapshot)
A GitHub Action signs in as you every 3 hours, saves the Analytics data encrypted with a password, and the dashboard decrypts it in the browser. Your friend only needs the link and the password.
1. Google Cloud → OAuth consent screen → publish the app (In production). In Testing mode refresh tokens die after 7 days.
2. OAuth client: add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
3. OAuth Playground → gear → Use your own OAuth credentials (client ID + secret) → authorize `https://www.googleapis.com/auth/yt-analytics.readonly` and `.../yt-analytics-monetary.readonly` → Exchange → copy the Refresh token. Pick the right channel if Google asks.
4. Repo → Settings → Secrets and variables → Actions: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATA_PASSWORD` (a long passphrase), `CHANNELS_JSON` = `[{"id":"UC...","refresh":"1//..."}]`.
5. Settings → Pages → Source: GitHub Actions. Then Actions tab → Deploy dashboard → Run workflow.
6. Send the friend the link and the password separately. He's asked for it once per browser.

GitHub pauses scheduled workflows after 60 days without repo activity; re-enable them in the Actions tab if that happens.
