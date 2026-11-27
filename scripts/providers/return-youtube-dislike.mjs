// Supplemental-only provider: use RYD for estimated dislikes and rating; never take views or likes from this response.
const ENDPOINT = "https://returnyoutubedislikeapi.com/votes";
const asFiniteNumber = value => Number.isFinite(Number(value)) ? Number(value) : null;

export async function fetchDislikeSignal(videoId, {fetchImpl = fetch, timeoutMs = 7000} = {}){
  if (!/^[\w-]{11}$/.test(videoId || "")) throw new Error("Invalid YouTube video ID");
  const url = new URL(ENDPOINT);
  url.searchParams.set("videoId", videoId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {signal:controller.signal, headers:{Accept:"application/json"}});
    if (!response.ok) throw new Error("Return YouTube Dislike API returned " + response.status);
    const payload = await response.json();
    return {dislikes:asFiniteNumber(payload.dislikes), rating:asFiniteNumber(payload.rating)};
  } catch(error){
    if (error.name === "AbortError") throw new Error("Return YouTube Dislike API timed out");
    throw error;
  } finally { clearTimeout(timeout); }
}
