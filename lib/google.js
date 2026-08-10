/* אינטגרציית גוגל דרך ADC (חשבון mominvest10x, הרשאת drive.file).
   יוצר טבלת לידים כקובץ של האפליקציה, משתף עם המשתתפת, ומוסיף שורות.
   בלי ADC (פרודקשן ללא הגדרה) → מצב MOCK ולא נופל. */
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
let _authPromise = null, _live = false;

function auth(){
  if(!_authPromise){
    _authPromise = (async()=>{
      try{
        const ga = new google.auth.GoogleAuth({ scopes: SCOPES });
        const c = await ga.getClient();
        _live = true;
        return c;
      }catch(e){ _live = false; return null; }
    })();
  }
  return _authPromise;   // מוחזרת אותה הבטחה לכל הקוראים → בלי מרוץ
}

/* יוצר טבלה (כקובץ של האפליקציה), כותב כותרות, ומשתף עם המשתתפת.
   ownership: "own" → מעביר בעלות למשתתפת (היא מאשרת במייל, בלי התחברות);
              אחרת → משותף אלייך (החשבון העסקי נשאר הבעלים). */
async function createLeadSheet(bizName, participantEmail, ownership){
  const c = await auth();
  if(!c){
    const fake = "MOCK-" + Date.now();
    return { sheetId: fake, sheetUrl: "https://docs.google.com/spreadsheets/d/"+fake, mock:true };
  }
  const drive  = google.drive({ version:"v3", auth: c });
  const sheets = google.sheets({ version:"v4", auth: c });

  const file = await drive.files.create({
    requestBody: { name: "לידים - " + (bizName||"דף הצעה"),
                   mimeType: "application/vnd.google-apps.spreadsheet" },
    fields: "id",
  });
  const sheetId = file.data.id;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: "A1:D1", valueInputOption: "RAW",
    requestBody: { values: [["תאריך","שם","טלפון","הערה"]] },
  });

  if(participantEmail){
    const created = await drive.permissions.create({
      fileId: sheetId, sendNotificationEmail: true, fields: "id",
      requestBody: { type:"user", role:"writer", emailAddress: participantEmail },
    });
    if(ownership === "own"){
      // הזמנה להעברת בעלות (חשבון פרטי) — נעשה כעדכון על ההרשאה הקיימת
      await drive.permissions.update({
        fileId: sheetId, permissionId: created.data.id,
        requestBody: { role:"writer", pendingOwner:true },
      });
    }
  }
  return { sheetId, sheetUrl: "https://docs.google.com/spreadsheets/d/"+sheetId, mock:false };
}

async function appendLead(sheetId, { name, phone, note }){
  const when = new Date().toLocaleString("he-IL");
  const c = await auth();
  if(!c || String(sheetId).startsWith("MOCK-")){
    console.log("[MOCK ליד]", sheetId, when, name, phone, note);
    return { ok:true, mock:true };
  }
  const sheets = google.sheets({ version:"v4", auth: c });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: "A:D", valueInputOption: "RAW",
    requestBody: { values: [[ when, name||"", String(phone||""), note||"" ]] },
  });
  return { ok:true };
}

module.exports = { createLeadSheet, appendLead, isLive: ()=>_live, warmUp: auth };
