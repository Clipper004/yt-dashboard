// ====== HARD-CODE YOUR CHANNEL HERE ======
const CONFIG = {
  API_KEY: "AIzaSyCTQlcDsVIOvGkRAusdi-dITCsMFbjXbyQ",
  CHANNEL_ID: "UCIwqMe33MNm1nvOj8CJbYsg",
  HANDLE: "",
  OAUTH_CLIENT_ID: "1090601871890-hdt2j72a4hmoh48s0tu3masenfmgns2b.apps.googleusercontent.com",
  ACCESS_TOKEN: "", // leave blank in a public repo (tokens last ~1 hour). Use the Connect Analytics button instead
  CHANNEL_LABEL: "Aeroviation Studios",
  REFRESH_MS: 300000, // public stats refresh on the wall clock: :00 :05 :10 ... (5 min = ~9 API units each, ~2,600 of the 10,000 daily units)
  ANALYTICS_MS: 3600000, // Analytics refresh on the hour (its data is daily, and a token only lasts ~1 hour)
  REVENUE: true,
  MAX_VIDEOS: 200,
  RPM_LONG: null, // optional: your own average long-form RPM in USD (overrides the benchmark in the earnings estimate)
  // More channels: {label:"Name", id:"UC...", handle:"", token:""}
  // Password lock per channel ID: SHA-256 of LOCK_SALT + password (the password itself is not in this file)
  LOCK_SALT: "ytd-7f3a91c2",
  LOCKS: { "UCfYKpYSoFPHloHRUWBi0_8g": "ba9dd6359cfbdf88af77aca0edc6c09c835cfd63499232def87a71dbc8259282" },
  EXTRA_CHANNELS: [
    {label:"SG3083D_Productions", id:"UCfYKpYSoFPHloHRUWBi0_8g", handle:"", token:""},
    {label:"MinuteGeo", id:"UC68LKIg7U0Iuz4Sj1qYyn9g", handle:"", token:""}
  ]
};
// =========================================
