/* שליטה על מבנה הדף: סדר מקטעים, הסתרה, מקטעים חופשיים (כותרת, טקסט, תמונה, סרטון) ווידאו בראש הדף.
   משותף לדף הקורס ולדף הוובינר, רץ בשרת ובדפדפן. המצב נשמר בשדות הרגילים של הדף:
   sectionOrder, sectionHidden (רשימות מופרדות בפסיק) ו-x1..x5 (Title/Text/Img/Video). */
(function(root){

  var PE = (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./page") : root.PageEngine;
  var H = PE._h, esc = H.esc, escAttr = H.escAttr, safeImg = H.safeImg;
  var EXTRAS = ["x1","x2","x3","x4","x5"];
  var LOCKED = { lead: 1 };   // טופס הלידים לא מוסתר

  /* סרטון מוטמע רק מ-YouTube או Vimeo. כל קישור אחר לא מוטמע */
  function video(url){
    url = (url||"").trim();
    var m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/i.exec(url);
    if(m) return '<iframe src="https://www.youtube-nocookie.com/embed/'+m[1]+'" title="סרטון" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    m = /^https:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/i.exec(url);
    if(m) return '<iframe src="https://player.vimeo.com/video/'+m[1]+'" title="סרטון" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>';
    return "";
  }

  function csv(s){ return String(s||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean); }

  /* defaults = סדר ברירת המחדל (בלי המקטעים החופשיים, הם נכנסים לפני "lead" / "heart"). מחזיר את הסדר הסופי בלי המוסתרים */
  function order(defaults, d){
    var base = [];
    defaults.forEach(function(k){
      if(k === "@extras") EXTRAS.forEach(function(x){ base.push(x); }); else base.push(k);
    });
    var saved = csv(d.sectionOrder).filter(function(k){ return base.indexOf(k) >= 0; });
    var rest = base.filter(function(k){ return saved.indexOf(k) < 0; });
    // מקטעים שחסרים בשמירה נכנסים במקומם היחסי לפי ברירת המחדל: לפני המקטע הבא שכבר ממוקם
    rest.forEach(function(k){
      var i = base.indexOf(k), pos = saved.length;
      for(var j = i + 1; j < base.length; j++){ var at = saved.indexOf(base[j]); if(at >= 0){ pos = at; break; } }
      saved.splice(pos, 0, k);
    });
    var hidden = csv(d.sectionHidden);
    return saved.filter(function(k){ return LOCKED[k] || hidden.indexOf(k) < 0; });
  }

  function extraHTML(d, key, richFn){
    var t = (d[key+"Title"]||"").trim(), tx = (d[key+"Text"]||"").trim(), im = safeImg(d[key+"Img"]), v = video(d[key+"Video"]);
    if(!t && !tx && !im && !v) return "";
    return '<section><div class="wrap xblock">'+
      (t?'<h2 style="margin-bottom:16px">'+esc(t)+'</h2>':'')+
      (v?'<div class="vid">'+v+'</div>':'')+
      (im?'<img class="ximg" src="'+escAttr(im)+'" alt="'+escAttr(t||"")+'">':'')+
      (tx?'<div class="rich">'+richFn(tx)+'</div>':'')+
      '</div></section>';
  }

  /* מרכיב את הדף: put-ים של מקטעים רגילים + מקטעים חופשיים, לפי הסדר */
  function assemble(B, defaults, d, richFn){
    EXTRAS.forEach(function(x){ var h = extraHTML(d, x, richFn); if(h) B[x] = h; });
    return order(defaults, d).filter(function(k){ return B[k]; }).map(function(k){ return B[k]; });
  }

  function css(){
    return ".vid{position:relative;width:100%;aspect-ratio:16/9;border-radius:20px;overflow:hidden;margin:18px 0;background:#000}"+
      ".vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}"+
      ".ximg{width:100%;max-height:520px;object-fit:cover;border-radius:20px;margin:6px 0 16px;display:block}";
  }

  var api = { video: video, order: order, assemble: assemble, extraHTML: extraHTML, css: css, EXTRAS: EXTRAS };
  if(typeof module !== "undefined" && module.exports){ module.exports = api; }
  else { root.PageBlocks = api; }
})(typeof window !== "undefined" ? window : this);
