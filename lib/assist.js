/* העוזרת בבנאי: צ'אט ששולח ל-Claude את מצב הטופס ומחזיר שינויים בשדות (הדפדפן מחיל אותם מיד).
   כלום לא נשמר ולא מתפרסם כאן. הפרסום נשאר ללחיצה של המשתתפת. */
const fs = require("fs");
const os = require("os");
const path = require("path");

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 4000;
const LIMIT_PER_HOUR = 40;      // הודעות לשעה לכל משתתפת (לפי טוקן, ובלי טוקן לפי כתובת)
const LIMIT_PER_DAY = 800;      // תקרה כללית ליום, שלא תרוץ הוצאה בלי שליטה
const MAX_MSG = 2000;

function apiKey(){
  if(process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  for(const f of [path.join(os.homedir(), "super-agent/.env"), path.join(os.homedir(), "course-portal/.env")]){
    try{
      const m = /^ANTHROPIC_API_KEY=(.+)$/m.exec(fs.readFileSync(f, "utf8"));
      if(m) return m[1].trim().replace(/^["']|["']$/g, "");
    }catch(e){}
  }
  return "";
}
function isReady(){ return !!apiKey(); }

const hits = new Map();   // id → [timestamps]
let dayStart = Date.now(), dayCount = 0;
function allowed(id){
  const now = Date.now();
  if(now - dayStart > 864e5){ dayStart = now; dayCount = 0; }
  if(dayCount >= LIMIT_PER_DAY) return false;
  const arr = (hits.get(id) || []).filter(t => now - t < 36e5);
  if(arr.length >= LIMIT_PER_HOUR){ hits.set(id, arr); return false; }
  arr.push(now); hits.set(id, arr); dayCount++;
  return true;
}

const SYSTEM = `את "העוזרת של הבנאי" — עוזרת כתיבה שיושבת ליד משתתפת בליווי "אמא משקיעה" שבונה דף נחיתה להצעה שלה. את רואה את כל שדות הדף שלה ויכולה לשנות אותם בזמן אמת, בלי שהיא תצטרך לעבור דרך עדי.

איך עובדים:
- היא מבקשת, ואת עושה: כותבת, מקצרת, מחדדת, מוסיפה מרכיבים ל"מה כלול", משנה לשון (נקבה/זכר/רבים), מציעה כותרות, מתקנת. כדי לשנות משהו את חייבת לקרוא לכלי update_page, ובו גם התשובה אליה (השדה reply). בלי הקריאה לכלי שום דבר לא משתנה בדף. כשאין מה לשנות (שאלה, בקשה להבהרה) עונים בטקסט רגיל, בלי לקרוא לכלי.
- משנים רק מה שהתבקשת. שדה שלא ביקשו לגעת בו נשאר כמו שהוא.
- זה הדף שלה, במילים שלה. כשיש לה ניסוח, שומרים אותו ומשפרים רק כשהיא מבקשת. הקול: חם, ישיר, עברית מדוברת, משפטים קצרים, בלי מקף ארוך (—) ובלי ז'רגון שיווקי.
- כותבים חיובי: מה היא מקבלת, לא ממה היא נמנעת. בלי הבטחות רפואיות/כספיות מוגזמות ובלי "מובטח".
- לא ממציאים עובדות. מחיר, תאריך, מספר מקומות, תוצאות של לקוחות, עדויות, ציטוטים ושמות: רק מה שהיא אמרה או שכבר כתוב בטופס. חסר פרט? שואלים אותה במשפט אחד במקום לנחש. עדות מומצאת אסורה, גם כדוגמה.
- כשהיא מבקשת רעיונות למה לכלול בהצעה, מציעים לפי מה שכבר כתוב בטופס על העסק, ומיישמים ישר בכלי, והיא תמחק מה שלא מתאים. כל המרכיבים ב"מה כלול" באותו משקל: שם קצר ושורת הסבר לכל אחד, בלי להקטין מרכיב על חשבון אחר.
- שדות שבמבנה "list" הם רשימות של שורות (למשל מה כלול, ציטוטים, שאלות). כשמשנים רשימה שולחים את הרשימה המלאה והמעודכנת, לא רק את החדש.
- שדות שבהם הערך "מילה קבועה" הם טקסטים קבועים בדף (כפתורים, תוויות). גם אותם אפשר לשנות כשמבקשים.
- אין לך גישה לתמונות, למייל, לקישורי הפרטיות והנגישות ולפרסום. תמונה היא מעלה בעצמה, ופרסום זה כפתור "פרסמי" למעלה.

התשובה אליה: קצרה, בעברית, בלשון נקבה, בטון של חברה שעוזרת. אחרי שינוי: משפט אחד על מה עשית, והצעה אחת להמשך אם יש. בלי רשימות ארוכות ובלי הסברים על איך את עובדת.`;

const TOOL = {
  name: "update_page",
  description: "משנה שדות בדף של המשתתפת. כל שינוי מוחל מיד בטופס שלה. לכל שדה שולחים את הערך החדש המלא.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "מה שהמשתתפת תראה בצ'אט, פונים אליה בגוף שני בלשון נקבה: משפט אחד על מה שעדכנת, ואם יש, הצעה אחת להמשך. לא מתארים את הבקשה שלה ולא מדברים עליה בגוף שלישי." },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            k: { type: "string", description: "מפתח השדה בדיוק כפי שהוא ברשימה" },
            value: { description: "לשדה טקסט/בחירה: מחרוזת. לשדה list: מערך מלא של אובייקטים עם המפתחות של השורה." },
          },
          required: ["k", "value"],
        },
      },
    },
    required: ["changes", "reply"],
  },
};

function clip(s, n){ s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) + "…" : s; }

/* fields: [{k,label,kind,value,options?,rows?:[{k,label}]}] מהדפדפן. מחזיר {reply, changes:[{k,value}]} */
async function assist({ message, history, fields }){
  const key = apiKey();
  if(!key) throw Object.assign(new Error("no key"), { code:"NO_KEY" });

  const byKey = {};
  fields.forEach(f => { byKey[f.k] = f; });
  const state = fields.map(f => {
    let line = "• " + f.k + " [" + f.kind + (f.fx ? ", מילה קבועה" : "") + "] " + clip(f.label, 80);
    if(f.options) line += " (אפשרויות: " + f.options.map(o => o.v).join(" / ") + ")";
    if(f.rows) line += " (שורה: " + f.rows.map(r => r.k + "=" + clip(r.label, 40)).join(", ") + ")";
    line += "\n   ערך נוכחי: " + (String(f.value || "").trim() ? clip(f.value, 1200) : "(ריק)");
    return line;
  }).join("\n");

  const msgs = [];
  (history || []).slice(-10).forEach(h => {
    if(!h || !h.text) return;
    msgs.push({ role: h.role === "assistant" ? "assistant" : "user", content: clip(h.text, 1500) });
  });
  while(msgs.length && msgs[0].role !== "user") msgs.shift();
  // הודעות רצופות מאותו צד מתמזגות (ה-API דורש החלפה)
  const merged = [];
  msgs.forEach(m => { const l = merged[merged.length-1]; if(l && l.role === m.role) l.content += "\n" + m.content; else merged.push(m); });
  if(merged.length && merged[merged.length-1].role === "user") merged.pop();   // ההודעה הנוכחית נשלחת בנפרד
  const last = merged[merged.length-1];
  const cur = "מצב הטופס עכשיו:\n" + state + "\n\n---\nההודעה שלה: " + clip(message, MAX_MSG);
  if(last && last.role === "user") last.content += "\n\n" + cur; else merged.push({ role: "user", content: cur });

  const body = { model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM, messages: merged, tools: [TOOL], thinking: { type: "between_tools" } };
  let data;
  for(let attempt = 1; attempt <= 2; attempt++){
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if(r.ok){ data = await r.json(); break; }
    const txt = (await r.text()).slice(0, 300);
    if(attempt === 1 && [429, 500, 502, 503, 529].includes(r.status)){ await new Promise(s => setTimeout(s, 1500)); continue; }
    throw new Error("anthropic " + r.status + " " + txt);
  }

  let reply = "", toolReply = "";
  const changes = [];
  (data.content || []).forEach(b => {
    if(b.type === "text") reply += b.text;
    if(b.type === "tool_use" && b.name === "update_page"){
      if(typeof (b.input || {}).reply === "string") toolReply = b.input.reply;
      let list = (b.input || {}).changes;
      if(typeof list === "string"){ try{ list = JSON.parse(list); }catch(e){ list = []; } }
      if(!Array.isArray(list)) list = list && typeof list === "object" ? [list] : [];
      list.forEach(c => {
        const f = c && byKey[c.k];
        if(!f) return;
        if(f.kind === "list"){
          let arr = c.value;
          if(typeof arr === "string"){ try{ arr = JSON.parse(arr); }catch(e){ arr = null; } }
          if(!Array.isArray(arr)) return;
          const allowed = new Set((f.rows || []).map(r => r.k));
          const rows = arr.slice(0, 40).map(o => {
            const out = {};
            allowed.forEach(k => { out[k] = clip(o && o[k] != null ? o[k] : "", 1500).replace(/…$/, ""); });
            return out;
          });
          changes.push({ k: f.k, value: rows.length ? JSON.stringify(rows) : "" });
        }else{
          let v = typeof c.value === "string" ? c.value : (c.value == null ? "" : String(c.value));
          if(f.options && !f.options.some(o => o.v === v)) return;
          changes.push({ k: f.k, value: v.slice(0, 4000) });
        }
      });
    }
  });
  reply = (changes.length && toolReply.trim()) ? toolReply.trim() : reply.trim();
  if(!reply) reply = changes.length ? "עדכנתי 💛" : "לא הצלחתי להבין מה לשנות. אפשר לנסח אחרת?";
  if(data.stop_reason === "max_tokens") console.error("assist: max_tokens", JSON.stringify(data.usage));
  return { reply, changes };
}

module.exports = { assist, allowed, isReady, MAX_MSG };
