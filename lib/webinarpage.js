/* דף הרשמה לוובינר + דף תודה — המבנה:
   הקשר ← הבטחה גדולה ← סקרנות (מה תגלי) ← חיבור לבעיה ← למי זה מתאים ← דחיפות + טופס ← מי אני ← הוכחות.
   אחרי ההרשמה: דף תודה עם קבוצת וואטסאפ שקטה, הוספה ליומן וקישור לשידור (אם יש). רץ בשרת ובדפדפן. */
(function(root){

  var PE = (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./page") : root.PageEngine;
  var CP = (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./coursepage") : root.CoursePage;
  var H = PE._h, esc = H.esc, escAttr = H.escAttr, lines = H.lines, safeImg = H.safeImg, rich = CP.rich;

  var DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

  function blocks(){ return (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./blocks") : root.PageBlocks; }
  function legal(){ return (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./legal") : root.PageLegal; }
  function safeLink(u){ u = (u||"").trim(); return /^https:\/\//i.test(u) ? u : ""; }

  /* "2026-10-21" + "20:30" → { text:"יום רביעי, 21.10 בשעה 20:30", cal:"2026..." } ; ריק אם חסר */
  function when(d){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((d.webDate||"").trim()), t = /^(\d{1,2}):(\d{2})$/.exec((d.webTime||"").trim());
    if(!m) return null;
    var day = DAYS[new Date(Date.UTC(+m[1], +m[2]-1, +m[3])).getUTCDay()];
    var text = "יום " + day + ", " + (+m[3]) + "." + (+m[2]) + (t ? " בשעה " + ("0"+t[1]).slice(-2) + ":" + t[2] : "");
    var cal = "";
    if(t){
      var mins = Math.max(15, parseInt(d.webDuration,10) || 60);
      var start = Date.UTC(+m[1], +m[2]-1, +m[3], +t[1], +t[2]), end = new Date(start + mins*60000);
      var f = function(x){ return x.getUTCFullYear() + ("0"+(x.getUTCMonth()+1)).slice(-2) + ("0"+x.getUTCDate()).slice(-2) + "T" + ("0"+x.getUTCHours()).slice(-2) + ("0"+x.getUTCMinutes()).slice(-2) + "00"; };
      cal = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(d.webTitle || d.bizName || "הדרכה") +
        "&dates=" + f(new Date(start)) + "/" + f(end) + "&ctz=Asia%2FJerusalem" +
        "&details=" + encodeURIComponent("הקישור להדרכה נשלח בקבוצת הוואטסאפ השקטה.");
    }
    return { text: text, cal: cal };
  }

  function extraCss(){
    return ".pain{font-size:1.15rem;font-weight:700;color:var(--soft);margin-bottom:14px}"+
    ".rich p{font-size:1.15rem;margin:0 0 14px;line-height:1.75}.rich h3{font-size:1.3rem;font-weight:800;margin:26px 0 10px}"+
    ".rich ul{list-style:none;display:grid;gap:10px;margin:8px 0 18px}.rich li{padding-inline-start:30px;position:relative;font-size:1.1rem}"+
    ".rich li::before{content:'✓';position:absolute;inset-inline-start:0;font-weight:900}.rich>*:last-child{margin-bottom:0}"+
    ".when{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 4px}.when .chip{background:var(--ident);border:none;font-size:1.02rem}"+
    ".learnbox{background:var(--calm);border-radius:28px;padding:clamp(32px,6vw,56px)}.learnbox h2{margin-bottom:18px}"+
    ".learnbox .blist li{background:rgba(255,255,255,.7);border:none}"+
    ".aboutrow{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}.aboutrow>.rich{flex:1;min-width:240px}"+
    ".aboutimg{width:150px;height:150px;object-fit:cover;border-radius:50%;flex-shrink:0;border:4px solid var(--ident)}"+
    ".proofgrid{display:grid;gap:14px}.proofimg{width:100%;border-radius:18px;border:1px solid var(--line);display:block}"+
    ".formbox{text-align:center}.formbox .after{font-size:.92rem;opacity:.75;margin-top:12px;line-height:1.5}"+
    ".steps{list-style:none;display:grid;gap:12px;margin:26px 0;text-align:right}"+
    ".steps li{display:flex;gap:14px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px 18px;font-size:1.08rem}"+
    ".steps .n{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:var(--ink);color:var(--canvas);font-weight:900;display:flex;align-items:center;justify-content:center}"+
    ".bigbtn{display:block;width:100%;text-align:center;margin-top:10px}.btn.ghost{background:transparent;border:2px solid var(--ink)}"+
    ".thx{text-align:center;padding-top:clamp(40px,10vw,90px)}.thx .big{font-size:clamp(3rem,12vw,5rem)}";
  }

  function head(d, pal, title){
    return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>'+esc(title)+'</title>'+
      '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap" rel="stylesheet">'+
      '<style>'+H.css(pal)+extraCss()+(blocks()?blocks().css():'')+'</style></head><body>';
  }

  /* ── דף ההרשמה ── */
  function build(d, opts){
    opts = opts || {};
    var pal = PE.PALETTES[d.palette] || PE.PALETTES[PE.DEFAULT_PALETTE];
    var heroImg = safeImg(d.heroImg), aboutImg = safeImg(d.aboutImg);
    var w = when(d);
    var cta = esc(d.cta || "אני בפנים! שלחו לי את הקישור");
    var S = [], B = {};
    function put(k, h){ B[k] = h; }
    var BL = blocks(), hv = BL.video(d.heroVideo);

    function chips(){
      var c = [];
      if(w) c.push('<span class="chip">📅 '+esc(w.text)+'</span>');
      if((d.places||"").trim()) c.push('<span class="chip">🪑 ל-'+esc(d.places)+' הראשונות בלבד</span>');
      c.push('<span class="chip">ההרשמה בחינם</span>');
      return '<div class="when">'+c.join("")+'</div>';
    }
    function btn(){ return '<a class="btn" href="#lead">'+cta+'</a>'; }

    S.push('<div class="topbar"><span class="name">'+esc(d.bizName)+'</span><a href="#lead">להרשמה</a></div>');

    S.push('<section class="hero"><div class="wrap">'+
      (d.w_pre?'<div class="pain">'+esc(d.w_pre)+'</div>':'')+
      '<h1>'+esc(d.w_headline)+'</h1>'+
      (d.w_without?'<p class="sub">'+esc(d.w_without)+'</p>':'')+
      chips()+'<br>'+btn()+
      (hv?'<div class="vid">'+hv+'</div>':(heroImg?'<img class="heroimg" src="'+escAttr(heroImg)+'" alt="'+escAttr(d.bizName)+'">':''))+
      '</div></section>');

    if(lines(d.w_learn).length) put("learn", '<section><div class="wrap"><div class="learnbox">'+
      '<h2>'+esc(d.w_learnTitle || "מה הולך לקרות בהדרכה?")+'</h2>'+
      '<ul class="blist">'+lines(d.w_learn).map(function(l){return '<li>'+esc(l.replace(/^[-•*]\s*/,""))+'</li>';}).join("")+'</ul>'+
      '</div></div></section>');

    if(d.w_problem) put("problem", '<section><div class="wrap"><div class="identify rich">'+rich(d.w_problem)+'</div><br>'+btn()+'</div></section>');

    if(d.w_forwhom) put("forwhom", '<section><div class="wrap"><h2 style="margin-bottom:16px">'+esc(d.w_forwhomTitle || "למי זה מתאים?")+'</h2><div class="rich">'+rich(d.w_forwhom)+'</div></div></section>');

    var tcards = [];
    for(var i = 1; i <= 3; i++){
      var q = (d["t"+i+"q"]||"").trim(), n = (d["t"+i+"n"]||"").trim(), im = safeImg(d["proofImg"+i]);
      if(im) tcards.push('<img class="proofimg" src="'+escAttr(im)+'" alt="'+escAttr(n||"המלצה")+'">');
      if(q) tcards.push('<div class="tcard"><div class="q">"'+esc(q)+'"</div>'+(n?'<div class="n">'+esc(n)+'</div>':'')+'</div>');
    }
    if(tcards.length) put("proof", '<section><div class="wrap">'+(d.proofTitle?'<h2 style="margin-bottom:14px">'+esc(d.proofTitle)+'</h2>':'')+
      '<div class="proofgrid">'+tcards.join("")+'</div></div></section>');

    if(d.w_about) put("about", '<section><div class="wrap"><div class="aboutrow">'+
      (aboutImg?'<img class="aboutimg" src="'+escAttr(aboutImg)+'" alt="'+escAttr(d.name||d.bizName)+'">':'')+
      '<div class="rich"><h2 style="margin-bottom:12px">'+esc(d.w_aboutTitle || ("נעים להכיר" + (d.name ? " – "+d.name : "")))+'</h2>'+rich(d.w_about)+'</div></div></div></section>');

    var form;
    var inputs = '<input name="name" aria-label="השם שלך" placeholder="השם שלך" required>'+
      '<input name="phone" aria-label="טלפון" placeholder="טלפון" inputmode="tel" required>'+
      '<input name="email" type="email" aria-label="מייל (לא חובה)" placeholder="מייל (לא חובה)">';
    if(opts.leadUrl) form = '<form id="leadform" onsubmit="return sendLead(event)">'+inputs+legal().consent(d)+'<button class="btn wide" type="submit">'+cta+'</button></form>';
    else form = '<form onsubmit="return false">'+inputs+legal().consent(d)+'<button class="btn wide" type="submit">'+cta+'</button></form>';
    put("lead", '<section id="lead"><div class="wrap"><div class="formbox">'+
      '<h2>'+esc(d.leadTitle || "שומרת לך מקום?")+'</h2>'+
      (w?'<p class="lsub"><b>'+esc(w.text)+'</b>'+((d.places||"").trim()?' · ל-'+esc(d.places)+' הראשונות בלבד':'')+'</p>':'')+
      '<div id="formslot">'+form+'</div>'+
      '<p class="after">'+esc(d.afterNote || "אחרי ההרשמה יחכה לך קישור לקבוצת וואטסאפ שקטה, שם אשלח את הקישור להדרכה ותזכורת.")+'</p>'+
      '</div></div></section>');

    BL.assemble(B, ["learn","problem","forwhom","proof","about","@extras","lead"], d, CP.rich).forEach(function(h){ S.push(h); });

    S.push('<footer>'+esc(d.bizName)+' · נבנה באהבה 💛</footer>');

    var script = opts.leadUrl ? (
      '<script>function sendLead(e){e.preventDefault();var f=e.target,b=f.querySelector("button");b.disabled=true;'+
      'var body={name:f.name.value,phone:f.phone.value,note:(f.email.value?("מייל: "+f.email.value+" | "):"")+'+legal().CONSENT_NOTE_JS+'};'+
      'var go=function(){location.href="'+(opts.thanksUrl||"#")+'";};'+
      'fetch("'+opts.leadUrl+'",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(go,go);return false;}<\/script>'
    ) : '';

    return legal().wrap(head(d, pal, d.bizName || "הרשמה להדרכה") + S.join("") + script + '</body></html>', d);
  }

  /* ── דף התודה ── */
  function thanks(d){
    var pal = PE.PALETTES[d.palette] || PE.PALETTES[PE.DEFAULT_PALETTE];
    var w = when(d), wa = safeLink(d.waUrl), live = safeLink(d.liveUrl);
    var steps = [];
    if(wa) steps.push('<li><span class="n">1</span><div><b>מצטרפת לקבוצת הוואטסאפ השקטה</b><br>שם אשלח את הקישור להדרכה, תזכורת וטיזרים. בלי חפירות.</div></li>');
    if(w && w.cal) steps.push('<li><span class="n">'+(steps.length+1)+'</span><div><b>שומרת ביומן</b><br>'+esc(w.text)+'</div></li>');
    steps.push('<li><span class="n">'+(steps.length+1)+'</span><div><b>מכינה מחברת</b><br>'+esc(d.thanksNote || "ומגיעה בזמן. זה הולך להיות שווה.")+'</div></li>');
    return legal().wrap(head(d, pal, "נרשמת! " + (d.bizName||"")) +
      '<section class="thx"><div class="wrap">'+
      '<div class="big">🎉</div>'+
      '<h1 style="font-size:clamp(2rem,7vw,3rem)">'+esc(d.thanksTitle || "נרשמת! המקום שלך שמור")+'</h1>'+
      '<p class="lead" style="font-size:1.2rem;margin-top:12px">'+esc(d.thanksSub || "עוד צעד קטן אחד כדי לא לפספס.")+'</p>'+
      '<ol class="steps">'+steps.join("")+'</ol>'+
      (wa?'<a class="btn bigbtn" href="'+escAttr(wa)+'" target="_blank" rel="noopener">'+esc(d.waBtn || "מצטרפת לקבוצת הוואטסאפ")+'</a>':'')+
      (w&&w.cal?'<a class="btn ghost bigbtn" href="'+escAttr(w.cal)+'" target="_blank" rel="noopener">📅 הוסיפי ליומן</a>':'')+
      (live?'<a class="btn ghost bigbtn" href="'+escAttr(live)+'" target="_blank" rel="noopener">'+esc(d.liveBtn || "הקישור להדרכה")+'</a>':'')+
      '</div></section><footer>'+esc(d.bizName)+' · נבנה באהבה 💛</footer></body></html>', d);
  }

  var api = { buildWebinarPageHTML: build, buildWebinarThanksHTML: thanks, when: when };
  if(typeof module !== "undefined" && module.exports){ module.exports = api; }
  else { root.WebinarPage = api; }

})(typeof window !== "undefined" ? window : this);
