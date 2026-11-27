// Supplemental-only provider: retain only yt-dlp heatmaps, hidden tags, and caption text. Ignore all other extracted metadata and counters.
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp, readdir, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const execFileAsync = promisify(execFile);
const VIDEO_URL = id => "https://www.youtube.com/watch?v=" + encodeURIComponent(id);
const run = (args, timeout = 25000) => execFileAsync("yt-dlp", args, {timeout, maxBuffer:8 * 1024 * 1024, windowsHide:true});

function cleanCaption(vtt){
  const lines = vtt.split(/\r?\n/).filter(line => line.trim() && line.trim() !== "WEBVTT" && !/^NOTE\b/.test(line.trim()) && !/^\d+$/.test(line.trim()) && !/\d{2}:\d{2}[.:]\d{3}\s+-->/.test(line));
  const text = lines.map(line => line.replace(/<[^>]*>/g, "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">" ).trim()).filter(Boolean);
  return text.filter((line,index) => index === 0 || line !== text[index-1]).join(" ").slice(0,20000);
}

function tracksFrom(files, id, type){
  return files.filter(file => file.startsWith(id + ".") && file.endsWith(".vtt")).slice(0,5).map(async file => {
    const language = file.slice(id.length + 1, -4).replace(/-orig$/,"" );
    return {language, type, text:cleanCaption(await readFile(file,"utf8"))};
  });
}

async function fetchTracks(videoId, type, directory){
  const args = [type === "manual" ? "--write-subs" : "--write-auto-subs", "--sub-langs", process.env.YTDLP_SUB_LANGS || "en.*,en", "--sub-format", "vtt/best", "--skip-download", "--no-warnings", "--no-playlist", "--output", join(directory,"%(id)s.%(language)s.%(ext)s"), VIDEO_URL(videoId)];
  try {
    await run(args);
    const files = await readdir(directory);
    return await Promise.all(tracksFrom(files,videoId,type));
  } catch(error){
    console.warn("yt-dlp " + type + " captions unavailable for " + videoId + ": " + error.message);
    return [];
  }
}

export async function fetchVideoSignals(videoId){
  if (!/^[\w-]{11}$/.test(videoId || "")) throw new Error("Invalid YouTube video ID");
  const directory = await mkdtemp(join(tmpdir(),"ytd-supplemental-"));
  try {
    let info = {};
    try {
      const {stdout} = await run(["--dump-single-json","--skip-download","--no-warnings","--no-playlist",VIDEO_URL(videoId)]);
      info = JSON.parse(stdout);
    } catch(error){ console.warn("yt-dlp metadata signals unavailable for " + videoId + ": " + error.message); }
    const manualDir = join(directory,"manual"), autoDir = join(directory,"automatic");
    const {mkdir} = await import("node:fs/promises");
    await Promise.all([mkdir(manualDir),mkdir(autoDir)]);
    const [manual,automatic] = await Promise.all([
      fetchTracks(videoId,"manual",manualDir),
      fetchTracks(videoId,"automatic",autoDir)
    ]);
    const heatmap = Array.isArray(info.heatmap) ? info.heatmap.map(point => ({
      startTime:Number(point.start_time ?? point.startTime),
      endTime:Number(point.end_time ?? point.endTime),
      intensity:Number(point.value ?? point.intensity)
    })).filter(point => Number.isFinite(point.startTime) && Number.isFinite(point.endTime) && Number.isFinite(point.intensity)).slice(0,1000) : [];
    const tags = Array.isArray(info.tags) ? [...new Set(info.tags.filter(tag => typeof tag === "string" && tag.trim()).map(tag => tag.trim()))].slice(0,100) : [];
    return {heatmap,tags,captions:[...manual,...automatic].filter(track => track.text)};
  } finally { await rm(directory,{recursive:true,force:true}); }
}
