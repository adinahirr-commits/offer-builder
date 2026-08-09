/* התמדה של מאגר הדפים. בפרודקשן (Render) נשמר כקובץ JSON ב-Drive של mominvest10x
   כדי לשרוד ריסטארט/דיפלוי. מקומית ללא גוגל → קובץ data/pages.json. */
const fs = require("fs"), path = require("path");
const { google } = require("googleapis");

const NAME = "offer-builder-registry.json";
const LOCAL = path.join(__dirname, "..", "data", "pages.json");
let _drivePromise = null, _fileId = null;

function drive(){
  if(!_drivePromise){
    _drivePromise = (async()=>{
      try{
        const ga = new google.auth.GoogleAuth({ scopes:["https://www.googleapis.com/auth/drive.file"] });
        return google.drive({ version:"v3", auth: await ga.getClient() });
      }catch(e){ return null; }
    })();
  }
  return _drivePromise;
}

async function findFile(d){
  if(_fileId) return _fileId;
  const r = await d.files.list({ q:`name='${NAME}' and trashed=false`, fields:"files(id)", spaces:"drive" });
  _fileId = (r.data.files[0] || {}).id || null;
  return _fileId;
}

async function loadAll(){
  const d = await drive();
  if(!d){ try{ return JSON.parse(fs.readFileSync(LOCAL,"utf8")); }catch(e){ return {}; } }
  const id = await findFile(d);
  if(!id) return {};
  const c = await d.files.get({ fileId:id, alt:"media" }, { responseType:"json" });
  return c.data || {};
}

async function saveAll(obj){
  const d = await drive();
  if(!d){ fs.mkdirSync(path.dirname(LOCAL),{recursive:true}); fs.writeFileSync(LOCAL, JSON.stringify(obj,null,2)); return; }
  const media = { mimeType:"application/json", body: JSON.stringify(obj,null,2) };
  const id = await findFile(d);
  if(id){ await d.files.update({ fileId:id, media }); }
  else{
    const c = await d.files.create({ requestBody:{ name:NAME, mimeType:"application/json" }, media, fields:"id" });
    _fileId = c.data.id;
  }
}

module.exports = { loadAll, saveAll };
