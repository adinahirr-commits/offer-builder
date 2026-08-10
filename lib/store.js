/* התמדה ב-Drive של mominvest10x (drive.file). תומך בכמה קבצים בשם.
   מקומית ללא גוגל → קבצים ב-data/. */
const fs = require("fs"), path = require("path");
const { google } = require("googleapis");

const REGISTRY = "offer-builder-registry.json";
const PREFILLS = "offer-builder-prefills.json";
let _drivePromise = null;
const _ids = {};   // name → fileId cache

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
function localPath(name){ return path.join(__dirname, "..", "data", name); }

async function findFile(d, name){
  if(_ids[name]) return _ids[name];
  const r = await d.files.list({ q:`name='${name}' and trashed=false`, fields:"files(id)", spaces:"drive" });
  _ids[name] = (r.data.files[0] || {}).id || null;
  return _ids[name];
}
async function load(name){
  const d = await drive();
  if(!d){ try{ return JSON.parse(fs.readFileSync(localPath(name),"utf8")); }catch(e){ return {}; } }
  const id = await findFile(d, name);
  if(!id) return {};
  const c = await d.files.get({ fileId:id, alt:"media" }, { responseType:"json" });
  return c.data || {};
}
async function save(name, obj){
  const d = await drive();
  if(!d){ fs.mkdirSync(path.dirname(localPath(name)),{recursive:true}); fs.writeFileSync(localPath(name), JSON.stringify(obj,null,2)); return; }
  const media = { mimeType:"application/json", body: JSON.stringify(obj,null,2) };
  const id = await findFile(d, name);
  if(id){ await d.files.update({ fileId:id, media }); }
  else{ const c = await d.files.create({ requestBody:{ name, mimeType:"application/json" }, media, fields:"id" }); _ids[name] = c.data.id; }
}

module.exports = {
  loadAll: ()=>load(REGISTRY),   saveAll: (o)=>save(REGISTRY, o),
  loadPrefills: ()=>load(PREFILLS), savePrefills: (o)=>save(PREFILLS, o),
};
