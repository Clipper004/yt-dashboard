// Build a separate supplemental snapshot. Never replace or modify official YouTube Analytics/Data API metrics.
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {fetchDislikeSignal} from "./providers/return-youtube-dislike.mjs";
import {fetchVideoSignals} from "./providers/yt-dlp.mjs";
import {fetchInvidiousSignals} from "./providers/invidious.mjs";

const channels = JSON.parse(process.env.CHANNELS_JSON || "[]");
const limit = Math.max(1,Math.min(30,Number(process.env.SUPPLEMENTAL_VIDEO_LIMIT) || 10));

async function mapLimit(values,limit,worker){
  const output=Array(values.length); let cursor=0;
  await Promise.all(Array.from({length:Math.min(limit,values.length)},async () => {
    while(cursor<values.length){const index=cursor++; output[index]=await worker(values[index]);}
  }));
  return output;
}

await mkdir("data",{recursive:true});
for(const channel of channels){
  const file="data/analytics-"+channel.id+".json";
  let official;
  try { official=JSON.parse(await readFile(file,"utf8")).AN; }
  catch(error){ console.warn("Supplemental snapshot skipped for "+channel.id+": official Analytics snapshot unavailable ("+error.message+")"); continue; }

  const videoIds=(official.vid || []).map(row=>row[0]).filter(id=>/^[\w-]{11}$/.test(id || "")).slice(0,limit);
  const officialLikes=new Map((official.vidMore || []).filter(row=>Number.isFinite(row[4])).map(row=>[row[0],row[4]]));
  const videoEntries=await mapLimit(videoIds,3,async videoId=>{
    const signals={};
    const [dislikeResult,ytDlpResult]=await Promise.allSettled([
      fetchDislikeSignal(videoId),
      fetchVideoSignals(videoId)
    ]);
    if(dislikeResult.status==="fulfilled"){
      const {dislikes,rating}=dislikeResult.value;
      if(dislikes!=null || rating!=null){
        const likes=officialLikes.get(videoId);
        signals.returnYouTubeDislike={
          dislikes,
          rating,
          likeToDislikeRatio:likes!=null && dislikes>0 ? likes/dislikes : null
        };
      }
    } else console.warn("Return YouTube Dislike unavailable for "+videoId+": "+dislikeResult.reason.message);
    if(ytDlpResult.status==="fulfilled") signals.ytDlp=ytDlpResult.value;
    else console.warn("yt-dlp signals unavailable for "+videoId+": "+ytDlpResult.reason.message);
    return [videoId,signals];
  });

  let invidious={trending:{},recommendations:{}};
  try { invidious=await fetchInvidiousSignals({videoIds}); }
  catch(error){ console.warn("Invidious unavailable for "+channel.id+": "+error.message); }
  const snapshot={schemaVersion:1,t:Date.now(),channelId:channel.id,videos:Object.fromEntries(videoEntries),invidious};
  try {
    await writeFile("data/supplemental-"+channel.id+".json",JSON.stringify(snapshot));
    console.log("supplemental snapshot written",channel.id);
  } catch(error){ console.warn("Could not write supplemental snapshot for "+channel.id+": "+error.message); }
}
