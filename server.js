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
const { buildCoursePageHTML } = require("./lib/coursepage");
const { buildWebinarPageHTML, buildWebinarThanksHTML } = require("./lib/webinarpage");
const { createLeadSheet, appendLead, uploadImage, isLive, warmUp } = require("./lib/google");
const store = require("./lib/store");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit:"24mb" }));  // תמונות (base64) עוברות גם דרך הפרסר הגלובלי — מגבלה נמוכה כאן חסמה כל העלאה מהטלפון

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


// ── שליטה בעריכה: מפתח עריכה סודי לכל דף, שמירת טיוטה בענן, פתיחה לעריכה מכל מכשיר ──
const newKey = () => crypto.randomBytes(12).toString("hex");
function keyOk(rec, key){
  if(!rec || !rec.editKey || typeof key !== "string" || key.length !== rec.editKey.length) return false;
  return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(rec.editKey));
}
const EDIT_PAGE = { offer: "/", course: "/course.html", webinar: "/webinar.html" };
function editUrl(slug, rec){ return BASE + (EDIT_PAGE[(rec.data||{}).kind || "offer"] || "/") + "?e=" + slug + "." + rec.editKey; }
function stripCtl(d){ const o = Object.assign({}, d); delete o.__slug; delete o.__key; return o; }

app.use("/lib", express.static(path.join(__dirname,"lib")));
app.use(express.static(path.join(__dirname,"public")));

// ── פרסום דף ──
app.post("/api/publish", async (req,res)=>{
  try{
    const d = req.body || {};
    if(!d.bizName || !(d.headline || (d.kind === "webinar" && d.w_headline))) return res.status(400).json({error:"חסר שם עסק או כותרת"});

    const ctl = { slug: d.__slug, key: d.__key };
    const data = stripCtl(d);
    let slug = (PAGES[ctl.slug] && keyOk(PAGES[ctl.slug], ctl.key)) ? ctl.slug : null;   // עריכה של דף קיים (גם אם שונה שם העסק)
    if(!slug) slug = Object.keys(PAGES).find(k =>
      PAGES[k].email === d.email && (PAGES[k].data||{}).bizName === d.bizName &&
      ((PAGES[k].data||{}).kind || "offer") === (d.kind || "offer") && PAGES[k].status !== "draft" && !PAGES[k].editKey);   // דפים ישנים בלי מפתח עריכה: הראשונה שמפרסמת מחדש מקבלת מפתח. לדף עם מפתח נכנסים רק עם הקישור, כך אי אפשר לדרוס דף של מישהי אחרת. דף קורס ודף הצעה של אותו עסק הם שני דפים
    if(!slug){ slug = slugify(d.bizName); while(PAGES[slug]) slug = slugify(""); }

    let sheet = (PAGES[slug] && PAGES[slug].sheetId)
      ? { sheetId: PAGES[slug].sheetId, sheetUrl: PAGES[slug].sheetUrl }
      : await createLeadSheet(d.bizName, d.email, d.ownership);

    const prev = PAGES[slug] || {};
    PAGES[slug] = { data, email:d.email, sheetId:sheet.sheetId, sheetUrl:sheet.sheetUrl, updated:Date.now(), editKey: prev.editKey || newKey(), status:"live" };
    await store.saveAll(PAGES);

    res.json({ ok:true, pageUrl: BASE + "/p/" + slug, sheetUrl: sheet.sheetUrl, live: isLive(), slug, editKey: PAGES[slug].editKey, editUrl: editUrl(slug, PAGES[slug]) });
  }catch(e){
    console.error(e);
    res.status(500).json({error:"הפרסום נכשל", detail:String(e.message||e)});
  }
});

// ── הדף החי ──
app.get("/p/:slug", (req,res)=>{
  const rec = PAGES[req.params.slug];
  if(!rec || rec.status === "draft") return res.status(404).send("הדף לא נמצא");
  const kind = rec.data && rec.data.kind;
  const build = kind === "course" ? buildCoursePageHTML : kind === "webinar" ? buildWebinarPageHTML : buildPageHTML;
  res.type("html").send(build(rec.data, { leadUrl: BASE + "/api/lead/" + req.params.slug, thanksUrl: BASE + "/p/" + req.params.slug + "/thanks", slug: req.params.slug }));
});

// ── דף תודה של וובינר ──
app.get("/p/:slug/thanks", (req,res)=>{
  const rec = PAGES[req.params.slug];
  if(!rec || rec.status === "draft" || (rec.data||{}).kind !== "webinar") return res.status(404).send("הדף לא נמצא");
  res.type("html").send(buildWebinarThanksHTML(rec.data));
});

// ── קליטת ליד → כתיבה לטבלה ──
app.post("/api/lead/:slug", async (req,res)=>{
  try{
    const rec = PAGES[req.params.slug];
    if(!rec || rec.status === "draft" || !rec.sheetId) return res.status(404).json({error:"not found"});
    await appendLead(rec.sheetId, req.body||{});
    res.json({ ok:true });
  }catch(e){ console.error("lead err", e); res.status(500).json({ ok:false }); }
});


// ── שמירת טיוטה בענן (בלי לפרסם ובלי ליצור טבלה). מחזיר קישור עריכה ──
app.post("/api/save", async (req,res)=>{
  try{
    const d = req.body || {};
    const data = stripCtl(d);
    if(JSON.stringify(data).length > 400*1024) return res.status(413).json({error:"הטיוטה גדולה מדי"});
    let slug = (PAGES[d.__slug] && keyOk(PAGES[d.__slug], d.__key)) ? d.__slug : null;
    if(!slug){ slug = slugify(data.bizName); while(PAGES[slug]) slug = slugify(""); }
    const prev = PAGES[slug] || {};
    PAGES[slug] = Object.assign({}, prev, { data, email: data.email || prev.email || "", updated: Date.now(),
      editKey: prev.editKey || newKey(), status: prev.status || "draft" });
    await store.saveAll(PAGES);
    res.json({ ok:true, slug, editKey: PAGES[slug].editKey, editUrl: editUrl(slug, PAGES[slug]), status: PAGES[slug].status,
      pageUrl: PAGES[slug].status === "live" ? BASE + "/p/" + slug : "" });
  }catch(e){ console.error("save err", e); res.status(500).json({error:"השמירה נכשלה"}); }
});

// ── פתיחת דף לעריכה (דורש את מפתח העריכה) ──
app.get("/api/edit/:slug/:key", (req,res)=>{
  const rec = PAGES[req.params.slug];
  if(!keyOk(rec, req.params.key)) return res.status(404).json({ error:"קישור העריכה לא נמצא" });
  res.json({ ok:true, data: rec.data, status: rec.status || "live", slug: req.params.slug, editKey: rec.editKey,
    pageUrl: (rec.status || "live") === "live" ? BASE + "/p/" + req.params.slug : "", sheetUrl: rec.sheetUrl || "" });
});

// ── העלאת תמונה (מכווצת בדפדפן → base64) ──
app.post("/api/upload", async (req,res)=>{
  const tag = "upload["+((req.body||{}).token||"-")+"]";
  try{
    const m = /^data:([a-z0-9.+\-\/]+);base64,(.+)$/i.exec((req.body||{}).dataUrl||"");
    if(!m) return res.status(400).json({error:"תמונה לא תקינה"});
    let buf = Buffer.from(m[2], "base64");
    const srcType = m[1].toLowerCase();
    console.log(tag, "received", srcType, Math.round(buf.length/1024)+"KB", "raw="+!!(req.body||{}).raw);
    if(buf.length > 16*1024*1024) return res.status(413).json({error:"התמונה גדולה מדי (עד 16MB)"});
    buf = await normalizeImage(buf, srcType);           // כל פורמט (גם HEIC) → JPEG עד 1600px, מסובב נכון
    const url = await uploadImage(buf, "jpeg");
    console.log(tag, "ok", Math.round(buf.length/1024)+"KB →", url);
    res.json({ ok:true, url });
  }catch(e){ console.error(tag, "failed:", e.message); res.status(500).json({error:"לא הצלחתי לעבד את התמונה. נסי תמונה אחרת או צילום מסך שלה"}); }
});

// המרה בשרת: HEIC/HEIF (אייפון, סמסונג) דרך heic-convert, כל השאר דרך sharp. הדפדפן לא צריך לדעת לקרוא את הקובץ.
async function normalizeImage(buf, type){
  const sharp = require("sharp");
  const head = buf.subarray(4, 12).toString("latin1");
  const isHeic = /heic|heif|heix|hevc|mif1|msf1/i.test(type) || /^ftyp(heic|heix|hevc|mif1|msf1)/.test(head);
  if(isHeic){
    const convert = require("heic-convert");
    buf = Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.9 }));
  }
  return sharp(buf, { failOn:"none" }).rotate()
    .resize({ width:1600, height:1600, fit:"inside", withoutEnlargement:true })
    .jpeg({ quality:82, mozjpeg:true }).toBuffer();
}

// דיווח מהדפדפן: מה קרה בהעלאה אצל המשתתפת (כדי לא לנחש מרחוק)
app.post("/api/log", (req,res)=>{
  const b = req.body || {};
  console.log("client["+(b.token||"-")+"]", b.stage||"", b.msg||"", "|", b.file||"", "|", (b.ua||"").slice(0,120));
  res.json({ok:true});
});

// ── מילוי אישי לפי משתתפת (מהמידע שלה מהקורס) ──
let PREFILLS = {};
app.get("/api/prefill/:token", (req,res)=>{
  res.json(PREFILLS[req.params.token] || null);
});

// ── העוזרת בבנאי: צ'אט שמעדכן שדות בדף (הדפדפן מחיל את השינויים) ──
const assistant = require("./lib/assist");
app.post("/api/assist", async (req,res)=>{
  const b = req.body || {};
  const id = (typeof b.token === "string" && b.token.length < 80 && b.token) || ("ip:" + (req.headers["x-forwarded-for"]||req.ip||"").toString().split(",")[0].trim());
  try{
    const message = String(b.message||"").trim();
    if(!message) return res.status(400).json({ error:"כתבי לי מה לשנות 🙂" });
    if(message.length > assistant.MAX_MSG) return res.status(400).json({ error:"ההודעה ארוכה מדי. אפשר לחלק לכמה הודעות" });
    if(!Array.isArray(b.fields) || !b.fields.length || b.fields.length > 400) return res.status(400).json({ error:"חסר מידע על הדף" });
    if(!assistant.isReady()) return res.status(503).json({ error:"העוזרת עדיין לא מחוברת. נסי שוב מאוחר יותר" });
    if(!assistant.allowed(id)) return res.status(429).json({ error:"הגעת למגבלת ההודעות לשעה. אפשר להמשיך בעוד קצת 💛" });
    const fields = b.fields.map(f => ({ k:String(f.k||"").slice(0,60), label:String(f.label||""), kind:["input","area","choice","list"].includes(f.kind)?f.kind:"input",
      fx:!!f.fx, value:String(f.value==null?"":f.value), options:Array.isArray(f.options)?f.options.slice(0,12).map(o=>({v:String(o.v)})):undefined,
      rows:Array.isArray(f.rows)?f.rows.slice(0,8).map(r=>({k:String(r.k).slice(0,20), label:String(r.label||"")})):undefined })).filter(f=>f.k);
    const out = await assistant.assist({ message, history:b.history, fields });
    console.log("assist["+(b.token||"-")+"]", "changes="+out.changes.map(c=>c.k).join(","));
    res.json({ ok:true, reply:out.reply, changes:out.changes });
  }catch(e){
    console.error("assist["+(b.token||"-")+"] failed:", e.message);
    res.status(500).json({ error:"משהו השתבש אצלי. נסי שוב בעוד רגע" });
  }
});

app.get("/health", (_,res)=>res.json({ok:true, live:isLive()}));

(async ()=>{
  await warmUp();
  try{ PAGES = await store.loadAll(); }catch(e){ console.error("load store err", e.message); }
  try{ PREFILLS = await store.loadPrefills(); }catch(e){ console.error("load prefills err", e.message); }
  app.listen(PORT, ()=>
    console.log("בנאי דף ההצעה רץ על "+BASE+"  (Google "+(isLive()?"מחובר":"מצב MOCK")+", "+Object.keys(PAGES).length+" דפים, "+Object.keys(PREFILLS).length+" מילויים)"));
})();
