/* מחבר את mominvest10x פעם אחת: פותח דפדפן לאישור, ושומר refresh token ל-.env
   הרצה:  node get-token.js   (אחרי ששמת כאן את קובץ client_secret*.json מהקונסול) */
const fs = require("fs"), path = require("path"), http = require("http"), { exec } = require("child_process");
const { google } = require("googleapis");

const dir = __dirname;
const file = fs.readdirSync(dir).find(f => /^client_secret.*\.json$/.test(f));
if(!file){
  console.error("\n❌ לא נמצא קובץ client_secret*.json בתיקייה.\n   הורידי אותו מהקונסול (Credentials → OAuth client → הורדת JSON) ושימי כאן.\n");
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
const c = raw.installed || raw.web;
const PORT = 53682, redirect = "http://127.0.0.1:" + PORT;
const oauth = new google.auth.OAuth2(c.client_id, c.client_secret, redirect);
const scopes = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"];
const url = oauth.generateAuthUrl({ access_type:"offline", prompt:"consent", scope:scopes });

const server = http.createServer(async (req, res) => {
  if(!req.url.startsWith("/?")) { res.end("ok"); return; }
  try{
    const code = new URL(req.url, redirect).searchParams.get("code");
    res.end("<meta charset=utf-8><div style='font-family:sans-serif;font-size:22px;text-align:center;margin-top:80px'>החיבור הצליח! אפשר לחזור ל-Claude 💛</div>");
    const { tokens } = await oauth.getToken(code);
    if(!tokens.refresh_token){
      console.error("\n⚠️ לא התקבל refresh token. נסי שוב אחרי הסרת הגישה בחשבון, או ודאי prompt=consent.\n");
      process.exit(1);
    }
    fs.writeFileSync(path.join(dir, ".env"),
      "GOOGLE_CLIENT_ID="+c.client_id+"\nGOOGLE_CLIENT_SECRET="+c.client_secret+"\nGOOGLE_REFRESH_TOKEN="+tokens.refresh_token+"\n");
    console.log("\n✅ נשמר .env עם refresh token של mominvest10x. אפשר להריץ בדיקה.\n");
    server.close(); process.exit(0);
  }catch(e){ console.error("שגיאה:", e.message); process.exit(1); }
});
server.listen(PORT, () => { console.log("\n🔑 פותח דפדפן לאישור. התחברי עם mominvest10x ואשרי...\n"); exec('open "'+url+'"'); });
