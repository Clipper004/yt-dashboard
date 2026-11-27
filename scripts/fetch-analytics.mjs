// Runs in GitHub Actions. Signs in as you with a stored refresh token, pulls the Analytics reports,
// and writes public data/analytics-<channelId>.json files for the dashboard.
import { mkdir, writeFile } from "node:fs/promises";

const need = k => { const v = process.env[k]; if (!v) throw new Error("Missing secret " + k); return v; };
const CID = need("GOOGLE_CLIENT_ID"), SEC = need("GOOGLE_CLIENT_SECRET");
const CHANNELS = JSON.parse(need("CHANNELS_JSON"));          // [{"id":"UC...","refresh":"1//..."}]
const REQUIRED_CHANNEL_IDS = ["UCIwqMe33MNm1nvOj8CJbYsg", "UC68LKIg7U0Iuz4Sj1qYyn9g", "UCfYKpYSoFPHloHRUWBi0_8g"];
const configuredIds = new Set(CHANNELS.map(c => c.id));
const missingIds = REQUIRED_CHANNEL_IDS.filter(id => !configuredIds.has(id));
if (missingIds.length) throw new Error("CHANNELS_JSON is missing required channel IDs: " + missingIds.join(", "));
const WITH_REV = process.env.WITH_REVENUE !== "false";
const QUIET_OPTIONAL_DIMENSIONS = new Set(["annotationType", "cardType", "adType", "subscribedStatus"]);
const iso = d => d.toISOString().slice(0, 10);

async function accessToken(refresh){
  const r = await fetch("https://oauth2.googleapis.com/token", {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:CID, client_secret:SEC, refresh_token:refresh, grant_type:"refresh_token"})});
  const j = await r.json(); if (!r.ok) throw new Error("token: " + (j.error_description || j.error)); return j.access_token;
}
async function report(tok, id, p){
  const maxResults = Math.min(200, Math.max(1, Number(p.maxResults) || 200));
  let startIndex = Number(p.startIndex) || 1, rows = [];
  for (let page = 0; page < 100; page++){
    const r = await fetch("https://youtubeanalytics.googleapis.com/v2/reports?" + new URLSearchParams({ids:"channel==" + id, ...p, maxResults, startIndex}), {headers:{Authorization:"Bearer " + tok}});
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || "Analytics error " + r.status);
    const batch = j.rows || []; rows.push(...batch);
    if (batch.length < maxResults) return rows;
    startIndex += batch.length;
  }
  return rows;
}
async function reportWithFallback(tok, id, name, expanded, simple){
  try { return await report(tok, id, expanded); }
  catch (e) { console.warn(`fallback ${name}: ${e.message}`); return report(tok, id, simple); }
}
async function reportExpandedWithFallback(tok, id, params){
  try { return await report(tok, id, params); }
  catch (e) {
    const dimensions = params.dimensions.split(","), metrics = params.metrics.split(","), dimensionCount = dimensions.length;
    console.warn(`fallback ${dimensions.join(",")} metrics: ${e.message}`);
    const merged = new Map();
    for (const metric of metrics.filter(metric => metric !== "views")){
      try {
        const rows = await report(tok, id, {...params, metrics:"views," + metric});
        for (const row of rows){
          const key = row.slice(0, dimensionCount).join("|");
          let result = merged.get(key);
          if (!result){
            result = [...row.slice(0, dimensionCount), ...Array(metrics.length).fill(null)];
            merged.set(key, result);
          }
          result[dimensionCount + metrics.indexOf("views")] = row[dimensionCount];
          result[dimensionCount + metrics.indexOf(metric)] = row[dimensionCount + 1];
        }
      } catch (fallbackError){
        console.warn(`optional metric unavailable ${dimensions.join(",")}/${metric}: ${fallbackError.message}`);
      }
    }
    const viewIndex = dimensionCount + metrics.indexOf("views");
    return [...merged.values()].sort((a,b) => (b[viewIndex] || 0) - (a[viewIndex] || 0));
  }
}
await mkdir("data", {recursive:true});
let ok = 0, failed = 0;
for (const c of CHANNELS){
  let skippedOptionalReports = 0;
  try {
    const tok = await accessToken(c.refresh), b = {startDate:iso(new Date(Date.now() - 90*864e5)), endDate:iso(new Date())};
    const [day, traffic, geo, vid, device, deviceMore, geoMore, trafficMore, dayMore, audience, cards, annotations, vidMore, playlist, rev, revMore] = await Promise.all([
      reportWithFallback(tok, c.id, "day", {...b, dimensions:"day", metrics:"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,shares,likes,comments", sort:"day"}, {...b, dimensions:"day", metrics:"views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,shares,likes", sort:"day"}),
      report(tok, c.id, {...b, dimensions:"insightTrafficSourceType", metrics:"views,estimatedMinutesWatched", sort:"-views"}),
      reportWithFallback(tok, c.id, "country", {...b, dimensions:"country", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:200}, {...b, dimensions:"country", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:8}),
      reportWithFallback(tok, c.id, "video", {...b, dimensions:"video", metrics:"views,averageViewPercentage,subscribersGained", sort:"-views", maxResults:200}, {...b, dimensions:"video", metrics:"views,averageViewPercentage,subscribersGained", sort:"-views", maxResults:10}),
      report(tok, c.id, {...b, dimensions:"deviceType", metrics:"views,estimatedMinutesWatched", sort:"-views"}).catch(() => []),
      reportExpandedWithFallback(tok, c.id, {...b, dimensions:"deviceType", metrics:"views,averageViewDuration,averageViewPercentage,likes,comments,shares", sort:"-views"}),
      reportExpandedWithFallback(tok, c.id, {...b, dimensions:"country", metrics:"views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares,dislikes,uniques", sort:"-views", maxResults:200}),
      reportExpandedWithFallback(tok, c.id, {...b, dimensions:"insightTrafficSourceType", metrics:"views,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares", sort:"-views"}),
      report(tok, c.id, {...b, dimensions:"day", metrics:"engagedViews,dislikes,videosAddedToPlaylists,videosRemovedFromPlaylists", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"uniques,redViews,estimatedRedMinutesWatched", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"cardImpressions,cardClicks,cardClickRate,cardTeaserImpressions,cardTeaserClicks,cardTeaserClickRate", sort:"day"}).catch(() => null),
      report(tok, c.id, {...b, dimensions:"day", metrics:"annotationImpressions,annotationClickableImpressions,annotationClicks,annotationCloses,annotationClosableImpressions,annotationClickThroughRate,annotationCloseRate", sort:"day"}).catch(() => null),
      reportExpandedWithFallback(tok, c.id, {...b, dimensions:"video", metrics:"views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments,shares,subscribersLost,uniques,engagedViews", sort:"-views", maxResults:200}),
      report(tok, c.id, {...b, dimensions:"playlist", metrics:"views,playlistEstimatedMinutesWatched,playlistStarts,playlistSaves,playlistAverageViewDuration", sort:"-views", maxResults:200}).catch(() => null),
      WITH_REV ? report(tok, c.id, {...b, dimensions:"day", metrics:"estimatedRevenue", sort:"day"}).catch(() => null) : Promise.resolve(null),
      WITH_REV ? report(tok, c.id, {...b, dimensions:"day", metrics:"estimatedAdRevenue,grossRevenue,estimatedRedPartnerRevenue,monetizedPlaybacks,adImpressions,playbackBasedCpm,cpm", sort:"day"}).catch(() => null) : Promise.resolve(null)]);
    const optional = p => report(tok, c.id, {...b, ...p}).catch(e => {
      if (p.dimensions === "insightTrafficSourceDetail" || p.dimensions === "insightPlaybackLocationDetail") skippedOptionalReports++;
      else if (!QUIET_OPTIONAL_DIMENSIONS.has(p.dimensions)) console.warn("optional report unavailable", p.dimensions, e.message);
      return [];
    });
    const extraPairs = await Promise.all([
      ["operatingSystem", {dimensions:"operatingSystem", metrics:"views,estimatedMinutesWatched,averageViewDuration", sort:"-views", maxResults:200}],
      ["demographics", {dimensions:"ageGroup,gender", metrics:"viewerPercentage", maxResults:200}],
      ["provinces", {dimensions:"province", metrics:"views,estimatedMinutesWatched", filters:"country==US", sort:"-views", maxResults:200}],
      ["playbackLocations", {dimensions:"insightPlaybackLocationType", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:200}],
      ["playbackLocationDetails", {dimensions:"insightPlaybackLocationDetail", metrics:"views,estimatedMinutesWatched", filters:"insightPlaybackLocationType==EMBEDDED", sort:"-views", maxResults:200}],
      ["sharingService", {dimensions:"sharingService", metrics:"shares", sort:"-shares", maxResults:200}],
      ["subscribedStatus", {dimensions:"subscribedStatus", metrics:"views,estimatedMinutesWatched,subscribersGained,subscribersLost", sort:"-views", maxResults:200}],
      ["creatorContentType", {dimensions:"creatorContentType", metrics:"views,estimatedMinutesWatched", sort:"-views", maxResults:200}],
      ["liveOrOnDemand", {dimensions:"liveOrOnDemand", metrics:"views,estimatedMinutesWatched,averageViewDuration", sort:"-views", maxResults:200}],
      ["cardTypes", {dimensions:"cardType", metrics:"cardImpressions,cardClicks,cardClickRate", sort:"-cardImpressions", maxResults:200}],
      ["annotationTypes", {dimensions:"annotationType", metrics:"annotationImpressions,annotationClicks,annotationClickThroughRate,annotationCloses,annotationCloseRate", sort:"-annotationImpressions", maxResults:200}],
      ["membershipCancellations", {dimensions:"membershipsCancellationSurveyReason", metrics:"membershipsCancellationSurveyResponses", maxResults:200}],
      ["adType", {dimensions:"adType", metrics:"estimatedRevenue,estimatedAdRevenue,grossRevenue,estimatedRedPartnerRevenue,monetizedPlaybacks,adImpressions,playbackBasedCpm,cpm", sort:"-estimatedRevenue", maxResults:200}]
    ].map(async ([name, params]) => [name, await optional(params)]));
    const trafficDetails = await Promise.all(traffic.slice(0, 12).map(async row => ({source:row[0], rows:await optional({dimensions:"insightTrafficSourceDetail", metrics:"views,estimatedMinutesWatched", filters:"insightTrafficSourceType==" + row[0], sort:"-views", maxResults:200})})));
    const retention = await Promise.all(vid.slice(0, 10).map(async row => ({videoId:row[0], rows:await optional({dimensions:"elapsedVideoTimeRatio", metrics:"audienceWatchRatio,relativeRetentionPerformance", filters:"video==" + row[0], sort:"elapsedVideoTimeRatio", maxResults:200})})));
    const extra = {...Object.fromEntries(extraPairs), trafficDetails, retention};
    await writeFile(`data/analytics-${c.id}.json`, JSON.stringify({t:Date.now(), AN:{day, traffic, geo, vid, device, deviceMore, geoMore, trafficMore, dayMore, audience, cards, annotations, vidMore, playlist, rev, revMore, extra}}));
    console.log("ok", c.id); ok++;
  } catch (e) { console.error("failed", c.id, e.message); failed++; }
  finally { console.log("optional reports skipped:", skippedOptionalReports); }
}
if (!ok || failed) process.exit(1);

