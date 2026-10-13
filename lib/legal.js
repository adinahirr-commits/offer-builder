/* הצ'קליסט המשפטי לכל דף ציבורי: נגישות (תפריט + הצהרה), פרטיות (מדיניות + אישור לפני שליחה), דיוור (אישור נפרד, לא מסומן מראש).
   רץ בשרת ובדפדפן. wrap() מזריק הכל לדף מוכן; consent() נכנס בתוך הטפסים.
   זו תבנית סבירה ולא ייעוץ משפטי: הפרטים האמיתיים (שם ודרך יצירת קשר של רכז/ת הנגישות) מגיעים מבעלת הדף. */
(function(root){

  var PE = (typeof module !== "undefined" && module.exports && typeof require === "function") ? require("./page") : null;
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function owner(d){ return (d.legalName || d.name || d.bizName || "").trim(); }
  function contact(d){ return (d.legalContact || "").trim(); }
  function today(){ var n = new Date(); return n.getDate() + "." + (n.getMonth()+1) + "." + n.getFullYear(); }

  function css(){
    return "a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:3px solid #1a56db;outline-offset:3px}"+
    ".chk{display:flex;gap:10px;align-items:flex-start;text-align:right;font-size:.92rem;line-height:1.5;margin:0 0 10px;cursor:pointer}"+
    ".chk input{width:20px;height:20px;margin-top:2px;flex-shrink:0;accent-color:var(--ink)}.formbox .chk input{width:20px;margin:2px 0 0;padding:0}"+
    ".chk a{color:inherit;font-weight:700}"+
    ".lgdisc{max-width:680px;margin:14px auto 0;font-size:.82rem;line-height:1.6;opacity:.75;text-align:center}"+
    ".lglinks{margin-top:10px;font-size:.88rem}.lglinks a{color:inherit;margin:0 8px;text-decoration:underline;cursor:pointer}"+
    "dialog.lg{border:none;border-radius:20px;max-width:640px;width:calc(100% - 32px);max-height:85vh;padding:0;color:#191A2E;background:#fff;font-family:inherit;direction:rtl}"+
    "dialog.lg::backdrop{background:rgba(25,26,46,.6)}"+
    "dialog.lg .in{padding:26px 24px;overflow:auto;max-height:85vh;line-height:1.7;font-size:1rem;text-align:right}"+
    "dialog.lg h2{font-size:1.3rem;margin-bottom:10px;line-height:1.3}dialog.lg h3{font-size:1.02rem;margin:16px 0 4px}dialog.lg p,dialog.lg li{font-size:.98rem;margin-bottom:6px}dialog.lg ul{padding-inline-start:20px}"+
    "dialog.lg .x{position:sticky;top:0;float:left;border:none;background:#191A2E;color:#fff;border-radius:100px;padding:8px 16px;font-weight:800;font-family:inherit;cursor:pointer}"+
    "#a11y-btn{position:fixed;bottom:16px;left:16px;z-index:90;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#1a56db;color:#fff;font-size:1.5rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);line-height:1}"+
    "#a11y-panel{position:fixed;bottom:74px;left:16px;z-index:90;background:#fff;color:#191A2E;border-radius:16px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.3);display:none;width:230px;direction:rtl;font-family:inherit}"+
    "#a11y-panel.on{display:block}#a11y-panel b{display:block;margin-bottom:8px}"+
    "#a11y-panel button{display:block;width:100%;text-align:right;font-family:inherit;font-size:.95rem;font-weight:700;padding:9px 12px;margin-bottom:6px;border:1.5px solid #cfd2dc;border-radius:10px;background:#fff;color:#191A2E;cursor:pointer}"+
    "#a11y-panel button[aria-pressed=true]{background:#191A2E;color:#fff}"+
    "html.a11y-hc{--canvas:#fff;--ink:#000;--soft:#000;--line:#000}html.a11y-hc body{background:#fff;color:#000}"+
    "html.a11y-hc .btn,html.a11y-hc .topbar a{border:2px solid #000}"+
    "html.a11y-ul a{text-decoration:underline!important}"+
    "html.a11y-noanim *{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
  }

  /* תיבות האישור בתוך הטופס */
  var WORDS = {   // ברירות המחדל; כל אחת ניתנת לשינוי בבנאי (txtConsentPrivacy, txtConsentPromo, txtLegalA11y, txtLegalPrivacy)
    txtConsentPrivacy: "קראתי ואני מסכים/ה ל{מדיניות הפרטיות}",
    txtConsentPromo:   "אני מאשר/ת קבלת עדכונים והודעות פרסומיות מ{העסק} (לא חובה, אפשר להסיר בכל עת)",
    txtLegalA11y:      "הצהרת נגישות",
    txtLegalPrivacy:   "מדיניות פרטיות"
  };
  function word(d, k){ var v = (d && d[k] || "").trim(); return v || WORDS[k]; }
  /* {מילים} → קישור למדיניות הפרטיות (אם המשתתפת מחקה את הסוגריים, כל המשפט הופך לקישור, כדי שתמיד יהיה קישור) */
  function privacyLine(d){
    var t = esc(word(d, "txtConsentPrivacy")), m = /\{([^}]+)\}/.exec(t);
    if(m) return t.replace(m[0], '<a href="#" data-legal="privacy">'+m[1]+'</a>');
    return '<a href="#" data-legal="privacy">'+t+'</a>';
  }
  function consent(d){
    var biz = esc(d.bizName || "בעלת הדף");
    return '<label class="chk"><input type="checkbox" name="privacy" required> <span>'+privacyLine(d)+'</span></label>'+
           '<label class="chk"><input type="checkbox" name="promo"> <span>'+esc(word(d, "txtConsentPromo")).replace(/\{העסק\}/g, biz)+'</span></label>';
  }
  /* מה נכתב בעמודת ההערה: ההסכמה לדיוור, כדי שיהיה תיעוד (התאריך נשמר בעמודה נפרדת בטבלה) */
  var CONSENT_NOTE_JS = '(f.promo&&f.promo.checked?"דיוור: אישר/ה":"דיוור: לא אישר/ה")';

  function a11yDialog(d){
    var o = esc(owner(d)), c = esc(contact(d));
    return '<dialog class="lg" id="lg-a11y" aria-labelledby="lg-a11y-t"><div class="in"><button class="x" type="button" data-close>סגירה ✕</button>'+
      '<h2 id="lg-a11y-t">הצהרת נגישות</h2>'+
      '<p>'+esc(d.bizName||"")+' רואה חשיבות בשוויון הזדמנויות ובמתן שירות נגיש לכלל הציבור. הדף הותאם, ככל האפשר, לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות) ולתקן הישראלי ת"י 5568 ברמה AA.</p>'+
      '<h3>התאמות שבוצעו</h3><ul><li>תפריט נגישות (כפתור כחול בפינת המסך): הגדלה והקטנה של הטקסט, ניגודיות גבוהה, הדגשת קישורים ועצירת אנימציות.</li><li>ניווט מלא במקלדת ומסגרת פוקוס נראית.</li><li>מבנה כותרות ברור, טקסט חלופי לתמונות, ושפה ויישור מוגדרים (עברית, מימין לשמאל).</li><li>הדף מותאם לטלפון ולמחשב.</li></ul>'+
      '<h3>מגבלות</h3><p>למרות המאמץ, ייתכן שחלק מהתכנים, למשל תמונות או צילומי מסך שהועלו על ידי בעלת הדף, לא נגישים באופן מלא.</p>'+
      '<h3>נתקלת בקושי? נשמח לעזור</h3><p>רכז/ת הנגישות: '+(o||"בעלת הדף")+(c?', '+c:'')+'.</p>'+
      '<p style="opacity:.7">עודכן לאחרונה: '+today()+'</p></div></dialog>';
  }

  function privacyDialog(d){
    var o = esc(owner(d)), c = esc(contact(d)), biz = esc(d.bizName||"");
    var isWeb = d.kind === "webinar";
    return '<dialog class="lg" id="lg-privacy" aria-labelledby="lg-privacy-t"><div class="in"><button class="x" type="button" data-close>סגירה ✕</button>'+
      '<h2 id="lg-privacy-t">מדיניות פרטיות</h2>'+
      '<h3>איזה מידע נאסף</h3><p>השם והטלפון שהזנת בטופס, מייל והערה אם מילאת, ותאריך השליחה. אנחנו לא אוספים מידע אחר עלייך.</p>'+
      '<h3>למה</h3><p>'+(isWeb?'כדי לרשום אותך להדרכה ולשלוח לך את הפרטים והקישור.':'כדי לחזור אלייך בנוגע לפנייה שלך.')+' הטלפון והשם נדרשים לצורך זה. אין חובה חוקית למסור אותם, אבל בלעדיהם לא נוכל ליצור קשר.</p>'+
      '<h3>איפה המידע נשמר</h3><p>בטבלה מקוונת (Google Sheets) שנוצרת בחשבון של אמא משקיעה ומשותפת עם '+(o||"בעלת הדף")+', בעלת הדף '+biz+'. המידע לא נמכר, ולא מועבר לצד שלישי מלבד ספקי התשתית שמפעילים את הדף והטבלה (Google ושירות האירוח של הדף).</p>'+
      '<h3>עוגיות וגופנים</h3><p>הדף לא משתמש בעוגיות מעקב או פרסום. הוא טוען גופן מ-Google Fonts, ולכן כתובת ה-IP שלך עוברת לגוגל. אם בדף משובץ סרטון, הוא נטען מ-YouTube או Vimeo, והם עשויים לקבל נתוני גלישה. ההעדפות בתפריט הנגישות נשמרות רק בדפדפן שלך.</p>'+
      '<h3>דיוור</h3><p>הודעות פרסומיות נשלחות רק אם סימנת את תיבת האישור הנפרדת, ואפשר להסיר את עצמך בכל עת בהודעה חוזרת או בפנייה אלינו.</p>'+
      '<h3>הזכויות שלך</h3><p>זכותך לעיין במידע שנשמר עלייך, לבקש לתקן או למחוק אותו. פנייה אל '+(o||"בעלת הדף")+(c?': '+c:'')+'.</p>'+
      '<p style="opacity:.7">עודכן לאחרונה: '+today()+'</p></div></dialog>';
  }

  function widget(d){
    d = d || {};
    return '<button id="a11y-btn" type="button" aria-label="תפריט נגישות" aria-expanded="false" aria-controls="a11y-panel">♿</button>'+
      '<div id="a11y-panel" role="region" aria-label="תפריט נגישות"><b>נגישות</b>'+
      '<button type="button" data-a11y="plus">הגדלת טקסט A+</button>'+
      '<button type="button" data-a11y="minus">הקטנת טקסט A-</button>'+
      '<button type="button" data-a11y="hc" aria-pressed="false">ניגודיות גבוהה</button>'+
      '<button type="button" data-a11y="ul" aria-pressed="false">הדגשת קישורים</button>'+
      '<button type="button" data-a11y="noanim" aria-pressed="false">עצירת אנימציות</button>'+
      '<button type="button" data-a11y="reset">איפוס</button>'+
      '<button type="button" data-legal="a11y">'+esc(word(d, "txtLegalA11y"))+'</button></div>';
  }

  var SCRIPT = '(function(){var K="pageA11y",st={size:100,hc:0,ul:0,noanim:0},h=document.documentElement;'+
    'try{var s=JSON.parse(localStorage.getItem(K)||"null");if(s)st=s;}catch(e){}'+
    'function apply(){h.style.fontSize=st.size+"%";h.classList.toggle("a11y-hc",!!st.hc);h.classList.toggle("a11y-ul",!!st.ul);h.classList.toggle("a11y-noanim",!!st.noanim);'+
    '["hc","ul","noanim"].forEach(function(k){var b=document.querySelector(\'[data-a11y="\'+k+\'"]\');if(b)b.setAttribute("aria-pressed",st[k]?"true":"false");});'+
    'try{localStorage.setItem(K,JSON.stringify(st));}catch(e){}}apply();'+
    'var btn=document.getElementById("a11y-btn"),pn=document.getElementById("a11y-panel");'+
    'if(btn)btn.addEventListener("click",function(){var on=pn.classList.toggle("on");btn.setAttribute("aria-expanded",on?"true":"false");});'+
    'document.addEventListener("keydown",function(e){if(e.key==="Escape"&&pn&&pn.classList.contains("on")){pn.classList.remove("on");btn.setAttribute("aria-expanded","false");btn.focus();}});'+
    'document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-a11y],[data-legal],[data-close]"):null;if(!t)return;'+
    'if(t.dataset.close!==undefined){t.closest("dialog").close();return;}'+
    'if(t.dataset.legal){e.preventDefault();var dlg=document.getElementById("lg-"+t.dataset.legal);if(dlg&&dlg.showModal){dlg.showModal();}return;}'+
    'var a=t.dataset.a11y;if(a==="plus")st.size=Math.min(160,st.size+10);else if(a==="minus")st.size=Math.max(80,st.size-10);'+
    'else if(a==="reset")st={size:100,hc:0,ul:0,noanim:0};else st[a]=st[a]?0:1;apply();});'+
    'document.addEventListener("click",function(e){if(e.target.tagName==="DIALOG")e.target.close();});})();';

  /* מזריק את כל החלקים לדף HTML מוכן */
  function wrap(html, d){
    var disc = (d && d.disclaimer || "").trim();
    var links = (disc ? '<p class="lgdisc">'+esc(disc).replace(/\n/g,"<br>")+'</p>' : '') + '<div class="lglinks"><a href="#" data-legal="a11y">'+esc(word(d, "txtLegalA11y"))+'</a><a href="#" data-legal="privacy">'+esc(word(d, "txtLegalPrivacy"))+'</a></div>';
    html = html.replace("</style>", css() + "</style>");
    if(/<\/footer>/.test(html)) html = html.replace(/<\/footer>/, links + "</footer>");
    else html = html.replace(/<\/body>/, '<footer>' + links + '</footer></body>');
    return html.replace(/<\/body>/, a11yDialog(d) + privacyDialog(d) + widget(d) + "<script>" + SCRIPT + "<\/script></body>");
  }

  var api = { wrap: wrap, consent: consent, CONSENT_NOTE_JS: CONSENT_NOTE_JS, css: css };
  if(typeof module !== "undefined" && module.exports){ module.exports = api; }
  else { root.PageLegal = api; }

})(typeof window !== "undefined" ? window : this);
