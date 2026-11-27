// Runs in GitHub Actions. Signs in as you with a stored refresh token, pulls the Analytics reports,
// and writes public data/analytics-<channelId>.json files for the dashboard.
import { mkdir, writeFile } from "node:fs/promises";

const need = k => { const v = process.env[k]; if (!v) throw new Error("Missing secret " + k); return v; };
const CID = need("GOOGLE_CLIENT_ID"), SEC = need("GOOGLE_CLIENT_SECRET");
const CHANNELS = JSON.parse(need("CHANNELS_JSON"));          // [{"id":"UC...","refresh":"1//..."}]
const WITH_REV = process.env.WITH_REVENUE !== "false";
const iso = d => d.toISOString().slice(0, 10);

async function accessToken(refresh){
  const r = await fetch("https://oauth2.googleapis.com/token", {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:CID, client_secret:SEC, refresh_token:refresh, grant_type:"refresh_token"})});
  const j = await r.json(); if (!r.ok) throw new Error("token: " + (j.error_description || j.error)); return j.access_token;
}
async function report(tok, id, p){
  const r = await fetch("https://youtubeanalytics.googleapis.com/v2/reports?" + new URLSearchParams({ids:"channel==" + id, ...p}), {headers:{Authorization:"Bearer " + tok}});
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || "Analytics error " + r.status); return j.rows || [];
}
await mkdir("data", {recursive:true});
let ok = 0;
for (const c of CHANNELS){
  try {
    const tok = await accessToken(c.refresh), b = {startDate:iso(new Date(Date.now() - 90*864e5)), endDate:iso(new Date())};
    const [day, traffic, geo, vid, device, deviceMore, geoMore, trafficMore, dayMore, audience, cards, annotations, vidMore, playlist, rev, revMore] = await Promise.all([
      report(tok, c.id, {...b, dimensions:"day", metrics:"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,shares,likes,comments", sort:"day"}),
      report(tok, c.id, {...b, dimensions:"insightTrafficSourceType", metrics:"views,estimatedMinutesWatched", sort:"-views"}),
      report(tok, c.id, {...b, dimensions:"country", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:8}),
      report(tok, c.id, {...b, dimensions:"video", metrics:"views,averageViewPercentage,subscribersGained", sort:"-views", maxResults:10}),
      report(tok, c.id, {...b, dimensions:"deviceType", metrics:"views,estimatedMinutesWatched", sort:"-views"}).catch(() => []),
      report(tok, c.id, {...b, dimensions:"deviceType", metrics:"views,averageViewDuration,averageViewPercentage,likes,comments,shares", sort:"-views"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"country", metrics:"views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares,dislikes,uniques", sort:"-views", maxResults:8}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"insightTrafficSourceType", metrics:"views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares", sort:"-views"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"engagedViews,dislikes,videosAddedToPlaylists,videosRemovedFromPlaylists", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"uniques,redViews,estimatedRedMinutesWatched", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"cardImpressions,cardClicks,cardClickRate,cardTeaserImpressions,cardTeaserClicks,cardTeaserClickRate", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"annotationImpressions,annotationClickableImpressions,annotationClicks,annotationCloses,annotationClosableImpressions,annotationClickThroughRate,annotationCloseRate", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"video", metrics:"views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments,shares,subscribersLost,uniques,engagedViews", sort:"-views", maxResults:10}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"playlist", metrics:"views,playlistEstimatedMinutesWatched,playlistStarts,playlistSaves,playlistAverageViewDuration", sort:"-views", maxResults:10}).catch(() => null),
      WITH_REV ? report(tok, c.id, {...b, dimensions:"day", metrics:"estimatedRevenue", sort:"day"}).catch(() => null) : Promise.resolve(null),
      WITH_REV ? report(tok, c.id, {...b, dimensions:"day", metrics:"estimatedAdRevenue,grossRevenue,estimatedRedPartnerRevenue,monetizedPlaybacks,adImpressions,playbackBasedCpm,cpm", sort:"day"}).catch(() => null) : Promise.resolve(null)]);
    await writeFile(`data/analytics-${c.id}.json`, JSON.stringify({t:Date.now(), AN:{day, traffic, geo, vid, device, deviceMore, geoMore, trafficMore, dayMore, audience, cards, annotations, vidMore, playlist, rev, revMore}}));
    console.log("ok", c.id); ok++;
  } catch (e) { console.error("failed", c.id, e.message); }
}
if (!ok) process.exit(1);

