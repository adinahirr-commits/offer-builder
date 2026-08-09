/* בנאי דף ההצעה — שרת אחד: שאלון, פרסום, דף חי, וקליטת לידים */

// אתחול הרשאות גוגל בפרודקשן: אם הועבר GOOGLE_ADC_JSON כמשתנה סביבה, כותבים לקובץ זמני
if(process.env.GOOGLE_ADC_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS){
  const fs = require("fs"), os = require("os"), path = require("path");
  const p = path.join(os.tmpdir(), "adc.json");
  fs.writeFileSync(p, process.env.GOOGLE_ADC_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = p;
}

const express = require("express");
const path = require("path");
const { buildPageHTML } = require("./lib/page");
const { createLeadSheet, appendLead, isLive, warmUp } = require("./lib/google");
const store = require("./lib/store");

const app = express();
app.use(express.json({ limit:"400kb" }));

// CORS פתוח לקליטת לידים
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Content-Type");
  res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 4900;
const BASE = process.env.PUBLIC_BASE || process.env.RENDER_EXTERNAL_URL || ("http://localhost:"+PORT);

// מאגר הדפים בזיכרון, נטען מההתמדה בהפעלה
let PAGES = {};
function slugify(s){
  const latin = (s||"").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,30).toLowerCase();
  if(latin && latin.replace(/-/g,"").length>=3) return latin;
  return (Math.random().toString(36).slice(2,8));
}

app.use("/lib", express.static(path.join(__dirname,"lib")));
app.use(express.static(path.join(__dirname,"public")));

// ── פרסום דף ──
app.post("/api/publish", async (req,res)=>{
  try{
    const d = req.body || {};
    if(!d.bizName || !d.headline) return res.status(400).json({error:"חסר שם עסק או כותרת"});

    let slug = Object.keys(PAGES).find(k =>
      PAGES[k].email === d.email && (PAGES[k].data||{}).bizName === d.bizName);
    if(!slug){ slug = slugify(d.bizName); while(PAGES[slug]) slug = slugify(""); }

    let sheet = (PAGES[slug] && PAGES[slug].sheetId)
      ? { sheetId: PAGES[slug].sheetId, sheetUrl: PAGES[slug].sheetUrl }
      : await createLeadSheet(d.bizName, d.email);

    PAGES[slug] = { data:d, email:d.email, sheetId:sheet.sheetId, sheetUrl:sheet.sheetUrl, updated:Date.now() };
    await store.saveAll(PAGES);

    res.json({ ok:true, pageUrl: BASE + "/p/" + slug, sheetUrl: sheet.sheetUrl, live: isLive() });
  }catch(e){
    console.error(e);
    res.status(500).json({error:"הפרסום נכשל", detail:String(e.message||e)});
  }
});

// ── הדף החי ──
app.get("/p/:slug", (req,res)=>{
  const rec = PAGES[req.params.slug];
  if(!rec) return res.status(404).send("הדף לא נמצא");
  res.type("html").send(buildPageHTML(rec.data, { leadUrl: BASE + "/api/lead/" + req.params.slug, slug: req.params.slug }));
});

// ── קליטת ליד → כתיבה לטבלה ──
app.post("/api/lead/:slug", async (req,res)=>{
  try{
    const rec = PAGES[req.params.slug];
    if(!rec) return res.status(404).json({error:"not found"});
    await appendLead(rec.sheetId, req.body||{});
    res.json({ ok:true });
  }catch(e){ console.error("lead err", e); res.status(500).json({ ok:false }); }
});

app.get("/health", (_,res)=>res.json({ok:true, live:isLive()}));

(async ()=>{
  await warmUp();
  try{ PAGES = await store.loadAll(); }catch(e){ console.error("load store err", e.message); }
  app.listen(PORT, ()=>
    console.log("בנאי דף ההצעה רץ על "+BASE+"  (Google "+(isLive()?"מחובר":"מצב MOCK")+", "+Object.keys(PAGES).length+" דפים)"));
})();
