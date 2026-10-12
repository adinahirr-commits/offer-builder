/* מנוע יצירת דף הנחיתה — רץ גם בשרת וגם בדפדפן (preview)
   מבנה: רגש (חלום) → זיהוי (מדברת אלייך) → הגיון (מה עבד, מה יש, איך עובד)
   כל משתתפת בוחרת ערכת צבעים משלה + תמונות משלה. */
(function(root){

  /* ── ערכות צבעים לבחירת המשתתפת ──
     accent = כפתור/CTA (טקסט כהה עליו) · pop = הדגשות על רקע כהה
     ident = רקע מקטע הזיהוי · calm = מקטע "איך זה עובד" · softBg = רקע הטופס */
  var PALETTES = {
    blush:  { name:"ורוד רך",      canvas:"#FBFAF7", ink:"#191A2E", soft:"#6B6B7B", accent:"#EF55A5", ident:"#FCE1EF", pop:"#CCD537", calm:"#C7D2FF", softBg:"#DCEFFA", line:"#ECE7DF" },
    earth:  { name:"אדמה חמה",     canvas:"#FAF6EF", ink:"#3B2A20", soft:"#8A7365", accent:"#E89A6B", ident:"#F6E4D5", pop:"#F0C868", calm:"#E7D6BC", softBg:"#F1E7D4", line:"#EADDCC" },
    ocean:  { name:"ים ושמיים",    canvas:"#F6FAFC", ink:"#12293E", soft:"#5E7385", accent:"#7CC7E8", ident:"#DDEFF8", pop:"#8FE3CF", calm:"#C5DCEC", softBg:"#E3F1F8", line:"#DCE8EF" },
    forest: { name:"ירוק יער",     canvas:"#F7F9F3", ink:"#22372B", soft:"#6C7A6C", accent:"#A8C686", ident:"#E4EED8", pop:"#E8D26E", calm:"#CFDEC4", softBg:"#E9F1E0", line:"#DFE8D6" },
    sunset: { name:"שקיעה",        canvas:"#FDF8F5", ink:"#43273B", soft:"#8A6E80", accent:"#FFAD85", ident:"#FBE3DC", pop:"#FFD08A", calm:"#EBD0DE", softBg:"#F8E8E0", line:"#F0E0D8" },
    noir:   { name:"שחור וזהב",    canvas:"#FAF9F6", ink:"#181818", soft:"#6E6A62", accent:"#E5C56A", ident:"#F2ECDC", pop:"#E5C56A", calm:"#E4E0D6", softBg:"#EFECE4", line:"#E6E2D8" },
  };
  var DEFAULT_PALETTE = "blush";

  function esc(s){return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function escAttr(s){return esc(s).replace(/"/g,"&quot;");}
  function lines(s){return (s||"").split("\n").map(function(x){return x.trim();}).filter(Boolean);}
  function safeImg(u){
    u = (u||"").trim();
    return (/^https:\/\//.test(u)) ? u : "";
  }
  /* קישור שהמשתתפת מדביקה לכפתור: רק http(s), ווטסאפ, מייל או טלפון. "wa.me/..." בלי https מקבל https לבד. */
  function safeLink(u){
    u = (u||"").trim();
    if(!u) return "";
    if(/^(https?:\/\/|mailto:|tel:|whatsapp:)/i.test(u)) return u;
    if(/^[\w.-]+\.[a-z]{2,}(\/|$|\?)/i.test(u)) return "https://" + u;
    return "";
  }
  /* רשימות (ציטוטים, תמונות) נשמרות כ-JSON בשדה אחד */
  function parseList(v){
    if(Array.isArray(v)) return v;
    try{ var a = JSON.parse(v||"[]"); return Array.isArray(a) ? a : []; }catch(e){ return []; }
  }

  /* ── המילים הקבועות בדף: ברירת מחדל בלשון נקבה, וכל אחת ניתנת לשינוי בבנאי (למשל "מחיר מייסדים") ── */
  var TEXTS = {
    txtTopLink:   "דברי איתי",
    txtStages:    "הדרך, שלב אחרי שלב",
    txtHow:       "איך זה עובד",
    txtFullPrice: "מחיר מלא",
    txtFounders:  "מחיר מייסדות 🌱",
    txtStart:     "מתחילים ב-",
    txtPlaces:    "מקומות",
    txtFormName:  "השם שלך",
    txtFormPhone: "טלפון",
    txtFormNote:  "משהו שכדאי שאדע? (לא חובה)",
    txtFooter:    "נבנה באהבה 💛"
  };
  /* איפה בדף יכולה להיכנס תמונה (בנוסף לתמונה בראש ולתמונה ליד "מי את") */
  var IMG_POS = [
    { v:"hero",     label:"בראש הדף, מתחת לכפתור" },
    { v:"dream",    label:"אחרי החלום" },
    { v:"identify", label:"אחרי ״זה מדבר אלייך״" },
    { v:"about",    label:"אחרי ״מי את״" },
    { v:"proof",    label:"אחרי ההמלצות" },
    { v:"benefits", label:"אחרי ״מה מקבלים״" },
    { v:"stages",   label:"אחרי השלבים" },
    { v:"offer",    label:"אחרי המחיר" },
    { v:"form",     label:"לפני הטופס" },
    { v:"final",    label:"בסוף הדף" }
  ];

  function buildPageHTML(d, opts){
    opts = opts || {};
    var pal = PALETTES[d.palette] || PALETTES[DEFAULT_PALETTE];
    var nl = esc, list = function(a){return a.map(function(i){return "<li>"+esc(i)+"</li>";}).join("");};
    var heroImg = safeImg(d.heroImg), aboutImg = safeImg(d.aboutImg);
    var S = [];
    function T(k){ var v = (d[k]||"").trim(); return v || TEXTS[k]; }

    /* הכפתורים: לטופס שבדף, או לקישור שהמשתתפת בחרה (ווטסאפ, דף תשלום, יומן) */
    var ctaUrl = safeLink(d.ctaUrl);
    var ctaHref = ctaUrl ? escAttr(ctaUrl) : "#lead";
    var ctaExtra = ctaUrl && /^https?:/i.test(ctaUrl) ? ' target="_blank" rel="noopener"' : '';
    var ctaBtn = '<a class="btn" href="'+ctaHref+'"'+ctaExtra+'>'+esc(d.cta||"אני רוצה פרטים")+'</a>';

    /* תמונות נוספות, כל אחת במקום שנבחר לה. אחת = ברוחב מלא, כמה = רשת */
    var images = parseList(d.images).map(function(im){ return { url: safeImg(im && im.url), pos: (im && im.pos) || "hero", cap: (im && im.cap) || "" }; })
      .filter(function(im){ return im.url; });
    function imgsAt(pos){
      var arr = images.filter(function(im){ return im.pos === pos; });
      if(!arr.length) return "";
      return '<section class="pimgs"><div class="wrap"><div class="pgrid n'+Math.min(arr.length,3)+'">'+arr.map(function(im){
        return '<figure><img src="'+escAttr(im.url)+'" alt="'+escAttr(im.cap||d.bizName)+'" loading="lazy">'+(im.cap?'<figcaption>'+esc(im.cap)+'</figcaption>':'')+'</figure>';
      }).join("")+'</div></div></section>';
    }

    S.push('<div class="topbar"><span class="name">'+esc(d.bizName)+'</span><a href="'+ctaHref+'"'+ctaExtra+'>'+esc(T("txtTopLink"))+'</a></div>');

    // ═══ 1: הרגש ═══
    S.push('<section class="hero"><div class="wrap">'+
      (d.eyebrow?'<div class="eyebrow">'+esc(d.eyebrow)+'</div>':'')+
      '<h1>'+nl(d.headline)+'</h1>'+
      (d.sub?'<p class="sub">'+nl(d.sub)+'</p>':'')+
      ctaBtn+
      (heroImg?'<img class="heroimg" src="'+escAttr(heroImg)+'" alt="'+escAttr(d.bizName)+'">':'')+
      '</div></section>');
    S.push(imgsAt("hero"));

    if(lines(d.dreamLines).length) S.push('<section><div class="wrap"><div class="snap">'+
      (d.dreamTitle?'<h2>'+esc(d.dreamTitle)+'</h2>':'')+
      lines(d.dreamLines).map(function(l){return '<div class="line">'+esc(l)+'</div>';}).join("")+
      '</div></div></section>');
    S.push(imgsAt("dream"));

    // ═══ 2: הזיהוי ═══
    if(lines(d.identifyLines).length) S.push('<section><div class="wrap"><div class="identify">'+
      (d.identifyTitle?'<h2>'+esc(d.identifyTitle)+'</h2>':'')+
      lines(d.identifyLines).map(function(l){return '<div class="iline">'+esc(l)+'</div>';}).join("")+
      '</div></div></section>');
    S.push(imgsAt("identify"));

    // ═══ 3: ההגיון ═══
    if(d.aboutText) S.push('<section><div class="wrap about">'+
      '<div class="aboutrow">'+
      (aboutImg?'<img class="aboutimg" src="'+escAttr(aboutImg)+'" alt="">':'')+
      '<div>'+
      (d.aboutTitle?'<h2>'+esc(d.aboutTitle)+'</h2>':'')+
      '<p class="lead">'+nl(d.aboutText)+'</p>'+
      '</div></div>'+
      (lines(d.aboutPoints).length?'<div class="chips">'+lines(d.aboutPoints).map(function(p){return '<span class="chip">'+esc(p)+'</span>';}).join("")+'</div>':'')+
      '</div></section>');
    S.push(imgsAt("about"));

    // ═══ ההמלצות: כמה ציטוטים שהיא רוצה (דפים ישנים: ציטוט אחד בשדות t1q/t1n) ═══
    var quotes = parseList(d.testimonials).map(function(t){ return { q: ((t && t.q) || "").trim(), n: ((t && t.n) || "").trim() }; })
      .filter(function(t){ return t.q; });
    if(!quotes.length && (d.t1q||"").trim()) quotes = [{ q: d.t1q.trim(), n: (d.t1n||"").trim() }];
    if(quotes.length) S.push('<section><div class="wrap">'+
      (d.proofTitle?'<h2 style="margin-bottom:8px">'+esc(d.proofTitle)+'</h2>':'')+
      '<div class="tgrid">'+quotes.map(function(t){
        return '<div class="tcard"><div class="q">"'+esc(t.q)+'"</div>'+(t.n?'<div class="n">'+esc(t.n)+'</div>':'')+'</div>';
      }).join("")+'</div>'+
      '</div></section>');
    S.push(imgsAt("proof"));

    if(lines(d.benItems).length) S.push('<section><div class="wrap">'+
      (d.benTitle?'<h2>'+esc(d.benTitle)+'</h2>':'')+
      '<ul class="blist">'+list(lines(d.benItems))+'</ul></div></section>');
    S.push(imgsAt("benefits"));

    // ═══ השלבים, במילים שלה ═══
    var stages = [];
    for (var si = 1; si <= 5; si++) {
      var sn = (d["stage"+si+"n"]||"").trim(), sa = (d["stage"+si+"a"]||"").trim();
      if (sn || sa) stages.push({n: sn, a: sa});
    }
    if(d.mechText || d.mechTitle || stages.length) S.push('<section><div class="wrap"><div class="mech">'+
      '<div class="eyebrow">'+esc(stages.length?T("txtStages"):T("txtHow"))+'</div>'+
      (d.mechTitle?'<h2>'+esc(d.mechTitle)+'</h2>':'')+
      (d.mechText?'<p class="lead">'+nl(d.mechText)+'</p>':'')+
      (stages.length?'<ol class="stages">'+stages.map(function(st, i){
        return '<li><span class="snum">'+(i+1)+'</span><div>'+
          (st.n?'<div class="sname">'+esc(st.n)+'</div>':'')+
          (st.a?'<div class="safter">'+esc(st.a)+'</div>':'')+
          '</div></li>';
      }).join("")+'</ol>':'')+
      (d.formatLine?'<div class="fmt">'+esc(d.formatLine)+'</div>':'')+
      '</div></div></section>');
    S.push(imgsAt("stages"));

    // ═══ ההצעה: מחיר מלא, מחיר מייסדות, תאריך ומקומות ═══
    var hasFounders = !!(d.foundersPrice||"").trim();
    if(d.price || hasFounders) S.push('<section><div class="wrap"><div class="offer-card">'+
      (d.priceLabel?'<div class="plabel">'+esc(d.priceLabel)+'</div>':'')+
      (hasFounders
        ? '<div class="pfull">'+esc(T("txtFullPrice"))+' <s>'+esc(d.price)+'</s></div>'+
          '<div class="pftag">'+esc(T("txtFounders"))+'</div>'+
          '<div class="price">'+esc(d.foundersPrice)+'</div>'+
          (d.foundersNote?'<div class="pfnote">'+esc(d.foundersNote)+'</div>':'')
        : '<div class="price">'+esc(d.price)+'</div>')+
      ((d.startDate||d.places)?'<div class="when">'+
          (d.startDate?'<span class="chip">📅 '+esc(T("txtStart"))+esc(d.startDate)+'</span>':'')+
          (d.places?'<span class="chip">🪑 '+esc(d.places)+' '+esc(T("txtPlaces"))+'</span>':'')+
        '</div>':'')+
      (lines(d.includes).length?'<ul class="inc">'+list(lines(d.includes))+'</ul>':'')+
      '<br>'+ctaBtn+
      (d.offerNote?'<p class="offnote">'+esc(d.offerNote)+'</p>':'')+
      '</div></div></section>');
    S.push(imgsAt("offer"));

    if(d.faqQ) S.push('<section><div class="wrap faq">'+
      '<details open><summary>'+esc(d.faqQ)+'</summary><div class="a">'+esc(d.faqA)+'</div></details>'+
      '</div></section>');

    // ═══ טופס + סגירה ═══
    var formHTML, phName = escAttr(T("txtFormName")), phPhone = escAttr(T("txtFormPhone")), phNote = escAttr(T("txtFormNote"));
    if(opts.leadUrl){
      formHTML = '<form id="leadform" onsubmit="return sendLead(event)">'+
        '<input name="name" aria-label="'+phName+'" placeholder="'+phName+'" required>'+
        '<input name="phone" aria-label="'+phPhone+'" placeholder="'+phPhone+'" inputmode="tel" required>'+
        '<textarea name="note" aria-label="'+phNote+'" placeholder="'+phNote+'"></textarea>'+
        '<button class="btn wide" type="submit">'+esc(d.cta||"שליחה")+'</button></form>';
    } else {
      formHTML = '<form onsubmit="return false"><input aria-label="'+phName+'" placeholder="'+phName+'"><input aria-label="'+phPhone+'" placeholder="'+phPhone+'">'+
        '<textarea aria-label="'+phNote+'" placeholder="'+phNote+'"></textarea>'+
        '<button class="btn wide" type="submit">'+esc(d.cta||"שליחה")+'</button></form>';
    }
    S.push(imgsAt("form"));
    S.push('<section id="lead"><div class="wrap"><div class="formbox">'+
      '<h2>'+esc(d.leadTitle||"רוצה לשמוע עוד?")+'</h2>'+
      '<p class="lsub">'+esc(d.leadSub||"השאירי פרטים ואחזור אליך היום.")+'</p>'+
      '<div id="formslot">'+formHTML+'</div>'+
      '</div></div></section>');

    if(d.finalText) S.push('<section><div class="wrap final">'+
      (d.finalTitle?'<h2>'+esc(d.finalTitle)+'</h2>':'')+
      '<p class="lead">'+nl(d.finalText)+'</p>'+
      (d.sig?'<div class="sig">'+esc(d.sig)+'</div>':'')+
      '<br>'+ctaBtn+
      '</div></section>');
    S.push(imgsAt("final"));

    S.push('<footer>'+esc(d.bizName)+' · '+esc(T("txtFooter"))+'</footer>');

    var thanks = esc(d.thanks||"קיבלתי! אחזור אליך היום 💛");
    var leadScript = opts.leadUrl ? (
      '<script>function sendLead(e){e.preventDefault();var f=e.target;'+
      'var b={name:f.name.value,phone:f.phone.value,note:f.note.value};'+
      'fetch("'+opts.leadUrl+'",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});'+
      'document.getElementById("formslot").innerHTML=\'<div class="thanks">'+thanks+'</div>\';return false;}<\/script>'
    ) : '';

    return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>'+(esc(d.bizName)||"דף ההצעה")+'</title>'+
      '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap" rel="stylesheet">'+
      '<style>'+css(pal)+'</style></head><body>'+S.join("")+leadScript+'</body></html>';
  }

  function css(p){
    return ":root{--canvas:"+p.canvas+";--ink:"+p.ink+";--soft:"+p.soft+";--accent:"+p.accent+";--ident:"+p.ident+";--pop:"+p.pop+";--calm:"+p.calm+";--softBg:"+p.softBg+";--line:"+p.line+"}"+
    "*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}"+
    "body{font-family:'Heebo',sans-serif;background:var(--canvas);color:var(--ink);line-height:1.7}"+
    ".wrap{max-width:760px;margin:0 auto;padding:0 22px}section{padding:clamp(48px,8vw,96px) 0}"+
    ".eyebrow{font-size:.8rem;letter-spacing:.16em;color:var(--ink);opacity:.65;font-weight:700;margin-bottom:12px}"+
    "h1{font-size:clamp(2.1rem,7vw,3.6rem);font-weight:900;letter-spacing:-.02em;line-height:1.12;white-space:pre-line}"+
    "h2{font-size:clamp(1.6rem,5vw,2.5rem);font-weight:800;letter-spacing:-.02em;line-height:1.2}"+
    "h3{font-size:1.15rem;font-weight:700}.lead{white-space:pre-line}"+
    ".btn{display:inline-block;background:var(--accent);color:var(--ink);font-weight:800;font-size:1.05rem;padding:16px 34px;border-radius:100px;text-decoration:none;border:none;cursor:pointer;font-family:inherit;transition:transform .15s}"+
    ".btn:hover{transform:translateY(-1px)}.btn.wide{width:100%;text-align:center}"+
    ".topbar{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;max-width:760px;margin:0 auto}"+
    ".topbar .name{font-weight:800;font-size:1.05rem}"+
    ".topbar a{font-size:.9rem;color:var(--ink);text-decoration:none;font-weight:700;border:1.5px solid var(--ink);padding:8px 16px;border-radius:100px}"+
    ".hero{padding-top:30px}.hero .sub{font-size:1.2rem;color:var(--soft);margin:20px 0 28px;white-space:pre-line}"+
    ".heroimg{width:100%;max-height:420px;object-fit:cover;border-radius:24px;margin-top:30px;display:block}"+
    ".snap{background:var(--ink);color:var(--canvas);border-radius:28px;padding:clamp(36px,7vw,60px)}"+
    ".snap h2{color:var(--canvas);margin-bottom:20px}.snap .line{font-size:clamp(1.4rem,4.5vw,1.9rem);font-weight:800;line-height:1.5}"+
    ".snap .line:nth-child(even){color:var(--pop)}"+
    ".identify{background:var(--ident);border-radius:28px;padding:clamp(36px,7vw,60px)}"+
    ".identify h2{margin-bottom:18px}.identify .iline{font-size:clamp(1.35rem,4.2vw,1.8rem);font-weight:800;line-height:1.5}"+
    ".aboutrow{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}"+
    ".aboutimg{width:150px;height:150px;object-fit:cover;border-radius:50%;flex-shrink:0;border:4px solid var(--ident)}"+
    ".about .lead{font-size:1.25rem;margin:14px 0 22px}"+
    ".chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}.chip{background:#fff;border:1px solid var(--line);font-weight:700;font-size:.95rem;padding:9px 18px;border-radius:100px}"+
    ".mech{background:var(--calm);border-radius:28px;padding:clamp(36px,7vw,60px)}.mech .lead{font-size:1.3rem;font-weight:500;margin-top:12px}"+
    ".stages{list-style:none;margin-top:22px;display:grid;gap:12px}.stages li{display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.55);border-radius:18px;padding:16px 18px}"+
    ".snum{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--canvas);font-weight:900;display:flex;align-items:center;justify-content:center}"+
    ".sname{font-weight:800;font-size:1.15rem;line-height:1.35}.safter{color:var(--ink);opacity:.8;margin-top:4px;font-size:1.02rem}"+
    ".fmt{margin-top:18px;font-weight:700;opacity:.8}"+
    ".pfull{color:var(--soft);font-weight:600;margin-top:6px}.pfull s{opacity:.8}.pftag{margin-top:14px;font-weight:800;letter-spacing:.04em}"+
    ".pfnote{color:var(--soft);margin-top:10px;font-size:1.02rem}"+
    ".when{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:20px}.when .chip{background:var(--ident);border:none;font-size:1rem}"+
    ".blist{list-style:none;margin-top:22px;display:grid;gap:12px}"+
    ".blist li{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 20px;font-size:1.1rem;font-weight:500;display:flex;gap:12px;align-items:center}"+
    ".blist li::before{content:'✓';color:var(--ink);font-weight:900;font-size:1.2rem}"+
    ".offer-card{background:#fff;border:1px solid var(--line);border-radius:26px;padding:clamp(32px,6vw,50px);text-align:center;box-shadow:0 18px 40px -28px rgba(0,0,0,.22)}"+
    ".offer-card .plabel{color:var(--soft);font-weight:600;letter-spacing:.08em}"+
    ".offer-card .price{font-size:clamp(2.8rem,10vw,4.2rem);font-weight:900;color:var(--ink);line-height:1}"+
    ".inc{list-style:none;margin:22px auto;display:inline-grid;gap:10px;text-align:right}.inc li{font-size:1.1rem;font-weight:500}"+
    ".inc li::before{content:'✓ ';font-weight:900}.offnote{color:var(--soft);margin-top:18px}"+
    ".tgrid{display:grid;gap:14px;margin-top:14px}"+
    ".tcard{background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px}"+
    ".pimgs{padding:0 0 clamp(36px,6vw,64px)}.pgrid{display:grid;gap:14px}.pgrid.n2{grid-template-columns:1fr 1fr}.pgrid.n3{grid-template-columns:repeat(3,1fr)}"+
    "@media(max-width:560px){.pgrid.n3{grid-template-columns:1fr 1fr}}"+
    ".pgrid figure{margin:0}.pgrid img{width:100%;max-height:520px;object-fit:cover;border-radius:20px;display:block}.pgrid.n1 img{max-height:600px}"+
    ".pgrid figcaption{color:var(--soft);font-size:.95rem;margin-top:8px;text-align:center}"+
    ".tcard .q{font-size:1.25rem;font-weight:700;line-height:1.5}.tcard .n{color:var(--soft);margin-top:12px;font-weight:600}"+
    ".faq details{border-bottom:1px solid var(--line);padding:18px 0}"+
    ".faq summary{font-size:1.15rem;font-weight:700;cursor:pointer;list-style:none}.faq summary::-webkit-details-marker{display:none}"+
    ".faq .a{color:var(--soft);margin-top:10px;font-size:1.05rem}"+
    ".formbox{background:var(--softBg);border-radius:28px;padding:clamp(36px,7vw,56px);text-align:center}"+
    ".formbox .lsub{opacity:.75;margin:10px 0 24px;font-size:1.1rem}"+
    ".formbox input,.formbox textarea{width:100%;font-family:inherit;font-size:1.05rem;padding:15px 18px;border:1px solid var(--line);border-radius:14px;margin-bottom:12px;background:#fff}"+
    ".formbox textarea{min-height:70px;resize:vertical}.thanks{font-size:1.3rem;font-weight:800;padding:22px 0}"+
    ".final .lead{font-size:1.3rem;margin:14px 0 18px}.sig{font-weight:800;font-size:1.15rem}"+
    "footer{text-align:center;padding:40px 22px;color:var(--soft);font-size:.9rem}";
  }

  var api = { buildPageHTML: buildPageHTML, PALETTES: PALETTES, DEFAULT_PALETTE: DEFAULT_PALETTE,
              TEXTS: TEXTS, IMG_POS: IMG_POS, safeLink: safeLink, parseList: parseList };
  if(typeof module !== "undefined" && module.exports){ module.exports = api; }
  else { root.PageEngine = api; }

})(typeof window !== "undefined" ? window : this);
