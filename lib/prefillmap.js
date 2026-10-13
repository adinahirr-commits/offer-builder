/* ממפה את המילוי האישי של משתתפת (נגזר מהעבודה שלה בקורס, מפתחות הבנאי של דף ההצעה)
   לשדות של בנאי דף הקורס ובנאי דף הוובינר. ממלא רק שדות ריקים, ורק במה שיש לה. */
(function(root){
  function clean(s){ return String(s||"").split("\n").map(function(l){ return l.trim(); }).filter(Boolean); }
  function join(a, sep){ return a.filter(function(x){ return (x||"").trim(); }).join(sep||"\n"); }

  function map(pf, kind){
    if(!pf) return {};
    var stages = [], names = [];
    for(var i = 1; i <= 5; i++){
      var n = (pf["stage"+i+"n"]||"").trim(), a = (pf["stage"+i+"a"]||"").trim();
      if(n || a){ stages.push(join([n, a ? "(אחריו: "+a+")" : ""], " ")); if(n) names.push(n); }
    }
    var out = {
      name: pf._name || "",
      bizName: pf.bizName || "",
      audience: join([pf.eyebrow, clean(pf.identifyLines).join(" ")]),
      problem: clean(pf.identifyLines).join("\n"),
      result: join([pf.headline, pf.sub]),
      heaven: clean(pf.dreamLines).join("\n"),
      credentials: clean(pf.aboutPoints).join("\n"),
      bio: pf.aboutText || "",
      edge: pf.mechTitle ? "שם השיטה או התוכנית: " + pf.mechTitle : ""
    };
    if(kind === "course"){
      out.topics = stages.join("\n");
      out.format = pf.formatLine || "";
      out.price = pf.price || "";
      out.bonuses = clean(pf.includes).join("\n");
    } else {
      out.learnRaw = names.join("\n");
      out.places = pf.places || "";
    }
    return out;
  }

  /* מחיל על הטופס: ממלא רק שדות ריקים. מחזיר כמה שדות מולאו */
  function apply(doc, pf, kind){
    var m = map(pf, kind), n = 0;
    Object.keys(m).forEach(function(k){
      if(!m[k]) return;
      var el = doc.querySelector('[data-k="'+k+'"]');
      if(el && !el.value.trim()){ el.value = m[k]; n++; }
    });
    return n;
  }

  var api = { map: map, apply: apply };
  if(typeof module !== "undefined" && module.exports){ module.exports = api; }
  else { root.PrefillMap = api; }
})(typeof window !== "undefined" ? window : this);
