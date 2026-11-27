// Supplemental-only provider: use Invidious for regional trending IDs and recommendation graph IDs, never primary video or channel metrics.
const DEFAULT_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com"
];
const validId = id => /^[\w-]{11}$/.test(id || "");

async function getFromInstances(path, {instances,fetchImpl,timeoutMs}){
  let lastError = new Error("No Invidious instances configured");
  for (const base of instances){
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),timeoutMs);
    try {
      const response = await fetchImpl(new URL(path,base),{signal:controller.signal,headers:{Accept:"application/json"}});
      if (!response.ok) throw new Error("Invidious returned " + response.status);
      return await response.json();
    } catch(error){ lastError = error.name === "AbortError" ? new Error("Invidious request timed out") : error; }
    finally { clearTimeout(timeout); }
  }
  throw lastError;
}

async function mapLimit(values,limit,worker){
  const output = Array(values.length); let cursor = 0;
  await Promise.all(Array.from({length:Math.min(limit,values.length)},async () => {
    while (cursor < values.length){ const index=cursor++; output[index]=await worker(values[index]); }
  }));
  return output;
}

export async function fetchInvidiousSignals({videoIds=[],regions=(process.env.INVIDIOUS_REGIONS || "US,GB,SG").split(",").map(x=>x.trim().toUpperCase()).filter(Boolean),instances=(process.env.INVIDIOUS_INSTANCES || "").split(",").map(x=>x.trim()).filter(Boolean),fetchImpl=fetch,timeoutMs=6000}={}){
  const hosts = instances.length ? instances : DEFAULT_INSTANCES;
  const trendingEntries = await Promise.all(regions.map(async region => {
    try {
      const rows = await getFromInstances("/api/v1/trending?region=" + encodeURIComponent(region),{instances:hosts,fetchImpl,timeoutMs});
      return [region,Array.isArray(rows) ? rows.map(row=>row.videoId).filter(validId).slice(0,25) : []];
    } catch(error){ console.warn("Invidious trending unavailable for " + region + ": " + error.message); return [region,[]]; }
  }));
  const sourceIds = [...new Set(videoIds.filter(validId))];
  const recommendationEntries = await mapLimit(sourceIds,4,async videoId => {
    try {
      const video = await getFromInstances("/api/v1/videos/" + encodeURIComponent(videoId),{instances:hosts,fetchImpl,timeoutMs});
      const ids = Array.isArray(video.recommendedVideos) ? video.recommendedVideos.map(row=>row.videoId).filter(validId).slice(0,20) : [];
      return [videoId,ids];
    } catch(error){ console.warn("Invidious recommendations unavailable for " + videoId + ": " + error.message); return [videoId,[]]; }
  });
  return {trending:Object.fromEntries(trendingEntries),recommendations:Object.fromEntries(recommendationEntries)};
}
