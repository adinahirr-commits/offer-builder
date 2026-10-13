/* מנוע דף הנחיתה של קורס / תכנית ליווי — 13 המקטעים
   רץ גם בשרת וגם בדפדפן (preview). משתמש בערכות הצבעים וב-CSS של page.js.
   הטקסטים של המקטעים מגיעים כטקסט חופשי (לרוב מ-AI) ומרונדרים בעיצוב קריא. */
(function(root){

  var PE = (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./page") : root.PageEngine;
  var H = PE._h, esc = H.esc, escAttr = H.escAttr, lines = H.lines, safeImg = H.safeImg;

  /* קישור יציאה מותר: https, או וואטסאפ/טלפון */
  function blocks(){ return (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./blocks") : root.PageBlocks; }
  function legal(){ return (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./legal") : root.PageLegal; }
  function safeLink(u){
    u = (u||"").trim();
    return /^(https:\/\/|tel:|mailto:)/i.test(u) ? u : "";
  }

  /* טקסט חופשי → HTML: כותרות ###, **הדגשה**, בולטים, פסקאות קצרות.
     מסיר כותרות "מקטע 3 –" והערות הנחיה בסוגריים ("כאן לשלב צילום מסך") שה-AI מוסיף. */
  function rich(t){
    var out = [], inUl = false;
    function closeUl(){ if(inUl){ out.push("</ul>"); inUl = false; } }
    function inline(s){
      return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g,"$1<em>$2</em>");
    }
    String(t||"").split("\n").forEach(function(raw){
      var l = raw.trim();
      if(!l){ closeUl(); return; }
      if(/^[-_=*]{3,}$/.test(l)){ closeUl(); return; }
      if(/^#{0,4}\s*\**\s*מקטע\s*\d+/.test(l)) return;
      if(/^[\[\(].*(לשלב|מוקאפ|צילום|וידאו|סרטון|תמונה).*[\]\)]$/.test(l)) return;
      var m;
      if((m = /^#{1,4}\s*(.+)$/.exec(l))){ closeUl(); out.push("<h3>"+inline(m[1].replace(/\*\*/g,""))+"</h3>"); return; }
      if((m = /^[-•*]\s+(.+)$/.exec(l))){ if(!inUl){ out.push("<ul>"); inUl = true; } out.push("<li>"+inline(m[1])+"</li>"); return; }
      closeUl();
      out.push("<p>"+inline(l)+"</p>");
    });
    closeUl();
    return out.join("");
  }

  function build(d, opts){
    opts = opts || {};
    var pal = PE.PALETTES[d.palette] || PE.PALETTES[PE.DEFAULT_PALETTE];
    var heroImg = safeImg(d.heroImg), aboutImg = safeImg(d.aboutImg), courseImg = safeImg(d.courseImg);
    var mode = d.ctaMode || "lead";
    var ctaUrl = safeLink(d.ctaUrl);
    var useForm = (mode === "lead") || !ctaUrl;           // בלי קישור תקין → חוזרים לטופס
    var ctaHref = useForm ? "#lead" : escAttr(ctaUrl);
    var ctaTarget = useForm ? "" : ' target="_blank" rel="noopener"';
    var ctaText = esc(d.cta || (mode === "pay" ? "אני מצטרפת" : mode === "call" ? "קובעת שיחה" : "אני רוצה פרטים"));
    function btn(){ return '<a class="btn" href="'+ctaHref+'"'+ctaTarget+'>'+ctaText+'</a>'; }
    var S = [], B = {};
    function put(k, h){ B[k] = h; }
    var BL = blocks(), hv = BL.video(d.heroVideo);

    S.push('<div class="topbar"><span class="name">'+esc(d.bizName)+'</span><a href="'+ctaHref+'"'+ctaTarget+'>'+ctaText+'</a></div>');

    // ═══ 1: כותרת — פתיחה על הבעיה, תוצאה + הרגשה, "בלי... בלי..." ═══
    S.push('<section class="hero"><div class="wrap">'+
      (d.h_pain?'<div class="pain">'+esc(d.h_pain)+'</div>':'')+
      '<h1>'+esc(d.headline)+'</h1>'+
      (d.h_without?'<p class="sub">'+esc(d.h_without)+'</p>':'')+
      btn()+
      (hv?'<div class="vid">'+hv+'</div>':(heroImg?'<img class="heroimg" src="'+escAttr(heroImg)+'" alt="'+escAttr(d.bizName)+'">':''))+
      '</div></section>');

    // ═══ 2: חיבור לבעיה ═══
    if(d.s_problem) put("problem", '<section><div class="wrap"><div class="identify rich">'+rich(d.s_problem)+'</div></div></section>');

    // ═══ 3: הצגה עצמית ═══
    if(d.s_about) put("about", '<section><div class="wrap about"><div class="aboutrow">'+
      (aboutImg?'<img class="aboutimg" src="'+escAttr(aboutImg)+'" alt="'+escAttr(d.name||d.bizName)+'">':'')+
      '<div class="rich">'+rich(d.s_about)+'</div></div></div></section>');

    // ═══ 4-5: סיפור, תקווה ופתרון ═══
    if(d.s_story) put("story", '<section><div class="wrap"><div class="mech rich">'+rich(d.s_story)+'</div></div></section>');

    // ═══ 6-7: הקורס / התוכנית, הסילבוס והבונוסים ═══
    if(d.s_course) put("course", '<section><div class="wrap">'+
      (courseImg?'<img class="courseimg" src="'+escAttr(courseImg)+'" alt="">':'')+
      '<div class="rich">'+rich(d.s_course)+'</div><br>'+btn()+'</div></section>');

    // ═══ 8-9: מחיר והנעה לפעולה ═══
    if(d.s_price || d.price) put("price", '<section><div class="wrap">'+
      (d.s_price?'<div class="rich">'+rich(d.s_price)+'</div>':'')+
      (d.price?'<div class="offer-card">'+
        (d.priceLabel?'<div class="plabel">'+esc(d.priceLabel)+'</div>':'')+
        '<div class="price">'+esc(d.price)+'</div>'+
        (d.priceNote?'<p class="offnote">'+esc(d.priceNote)+'</p>':'')+
        '<br>'+btn()+
        (d.offerNote?'<p class="offnote">'+esc(d.offerNote)+'</p>':'')+
        '</div>':'')+
      '</div></section>');

    // ═══ 10: למי זה מתאים ═══
    if(d.s_forwhom) put("forwhom", '<section><div class="wrap"><div class="identify rich">'+rich(d.s_forwhom)+'</div></div></section>');

    // ═══ 11: הוכחות חברתיות ═══
    var tcards = [];
    for(var i = 1; i <= 3; i++){
      var q = (d["t"+i+"q"]||"").trim(), n = (d["t"+i+"n"]||"").trim(), im = safeImg(d["proofImg"+i]);
      if(im) tcards.push('<img class="proofimg" src="'+escAttr(im)+'" alt="'+escAttr(n||"המלצה")+'">');
      if(q) tcards.push('<div class="tcard"><div class="q">"'+esc(q)+'"</div>'+(n?'<div class="n">'+esc(n)+'</div>':'')+'</div>');
    }
    if(tcards.length) put("proof", '<section><div class="wrap">'+
      (d.proofTitle?'<h2 style="margin-bottom:14px">'+esc(d.proofTitle)+'</h2>':'')+
      '<div class="proofgrid">'+tcards.join("")+'</div></div></section>');

    // ═══ 12: שאלות ותשובות — "**שאלה**" ואחריה תשובה ═══
    if(d.s_faq){
      var faqHTML = faqBlocks(d.s_faq);
      put("faq", '<section><div class="wrap faq">'+faqHTML+'</div></section>');
    }

    // ═══ טופס (רק כשבוחרים ליד) ═══
    if(useForm){
      var formHTML;
      if(opts.leadUrl){
        formHTML = '<form id="leadform" onsubmit="return sendLead(event)">'+
          '<input name="name" aria-label="השם שלך" placeholder="השם שלך" required>'+
          '<input name="phone" aria-label="טלפון" placeholder="טלפון" inputmode="tel" required>'+
          '<textarea name="note" aria-label="משהו שכדאי שאדע? (לא חובה)" placeholder="משהו שכדאי שאדע? (לא חובה)"></textarea>'+
          legal().consent(d)+'<button class="btn wide" type="submit">'+ctaText+'</button></form>';
      } else {
        formHTML = '<form onsubmit="return false"><input aria-label="השם שלך" placeholder="השם שלך"><input aria-label="טלפון" placeholder="טלפון">'+
          '<textarea aria-label="משהו שכדאי שאדע? (לא חובה)" placeholder="משהו שכדאי שאדע? (לא חובה)"></textarea>'+
          legal().consent(d)+'<button class="btn wide" type="submit">'+ctaText+'</button></form>';
      }
      put("lead", '<section id="lead"><div class="wrap"><div class="formbox">'+
        '<h2>'+esc(d.leadTitle||"רוצה להצטרף?")+'</h2>'+
        '<p class="lsub">'+esc(d.leadSub||"השאירי פרטים ואחזור אלייך היום.")+'</p>'+
        '<div id="formslot">'+formHTML+'</div></div></div></section>');
    }

    // ═══ 13: משהו קטן מהלב ═══
    if(d.s_heart) put("heart", '<section><div class="wrap final"><div class="rich">'+rich(d.s_heart)+'</div>'+
      (d.sig?'<div class="sig">'+esc(d.sig)+'</div>':'')+
      '<br>'+btn()+'</div></section>');

    BL.assemble(B, ["problem","about","story","course","price","forwhom","proof","faq","@extras","lead","heart"], d, rich).forEach(function(h){ S.push(h); });

    S.push('<footer>'+esc(d.bizName)+' · נבנה באהבה 💛</footer>');

    var thanks = esc(d.thanks||"קיבלתי! אחזור אלייך היום 💛");
    var leadScript = (useForm && opts.leadUrl) ? (
      '<script>function sendLead(e){e.preventDefault();var f=e.target;'+
      'var b={name:f.name.value,phone:f.phone.value,note:(f.note.value?f.note.value+" | ":"")+'+legal().CONSENT_NOTE_JS+'};'+
      'fetch("'+opts.leadUrl+'",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});'+
      'document.getElementById("formslot").innerHTML=\'<div class="thanks">'+thanks+'</div>\';return false;}<\/script>'
    ) : '';

    return legal().wrap('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>'+(esc(d.bizName)||"דף הקורס")+'</title>'+
      '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap" rel="stylesheet">'+
      '<style>'+H.css(pal)+extraCss()+BL.css()+'</style></head><body>'+S.join("")+leadScript+'</body></html>', d);
  }

  /* שאלות ותשובות: שורה שנראית כשאלה (מודגשת / מסתיימת ב-?) פותחת פריט, השורות שאחריה הן התשובה */
  function faqBlocks(text){
    var items = [], cur = null, intro = [];
    String(text||"").split("\n").forEach(function(raw){
      var l = raw.trim();
      if(!l || /^[-_=*]{3,}$/.test(l)) return;
      if(/^#{0,4}\s*\**\s*מקטע\s*\d+/.test(l)) return;
      var plain = l.replace(/^#{1,4}\s*/,"").replace(/^\d+[.)]\s*/,"").replace(/\*\*/g,"").replace(/^["“”]|["“”]$/g,"").trim();
      var isQ = /\?$/.test(plain) || (/^\**\d*[.)]?\s*\*\*.+\*\*\s*$/.test(l) && plain.length < 140);
      if(isQ){ cur = { q: plain.replace(/\?*$/,"?"), a: [] }; items.push(cur); }
      else if(cur) cur.a.push(l.replace(/^["“”]|["“”]$/g,""));
      else intro.push(l);
    });
    if(!items.length) return '<div class="rich">'+rich(text)+'</div>';
    return (intro.length?'<div class="rich" style="margin-bottom:10px">'+rich(intro.join("\n"))+'</div>':'')+
      items.map(function(it, i){
        return '<details'+(i===0?' open':'')+'><summary>'+esc(it.q)+'</summary><div class="a">'+rich(it.a.join("\n"))+'</div></details>';
      }).join("");
  }

  function extraCss(){
    return ".pain{font-size:1.15rem;font-weight:700;color:var(--soft);margin-bottom:14px}"+
    ".rich p{font-size:1.15rem;margin:0 0 14px;line-height:1.75}.rich h3{font-size:1.3rem;font-weight:800;margin:26px 0 10px;line-height:1.3}"+
    ".rich ul{list-style:none;display:grid;gap:10px;margin:8px 0 18px}.rich li{padding-inline-start:30px;position:relative;font-size:1.1rem}"+
    ".rich li::before{content:'✓';position:absolute;inset-inline-start:0;font-weight:900}"+
    ".rich>*:last-child{margin-bottom:0}.aboutrow>.rich{flex:1;min-width:240px}"+
    ".courseimg{width:100%;max-height:420px;object-fit:contain;border-radius:20px;margin-bottom:24px;display:block}"+
    ".offer-card{margin-top:26px}"+
    ".proofgrid{display:grid;gap:14px}.proofimg{width:100%;border-radius:18px;border:1px solid var(--line);display:block}"+
    ".faq .a p{font-size:1.05rem;margin:0 0 10px;color:var(--soft)}"+
    ".final .rich p{font-size:1.25rem}"+
    ".mech.rich p{font-weight:500}";
  }

  var api = { buildCoursePageHTML: build, rich: rich, faqBlocks: faqBlocks };
  if(typeof module !== "undefined" && module.exports){ module.exports = api; }
  else { root.CoursePage = api; }

})(typeof window !== "undefined" ? window : this);
