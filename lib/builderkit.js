/* כלי עזר משותף לבנאים (דפדפן בלבד): שמירה בענן וקישור עריכה, סדר והסתרת מקטעים.
   EditSync: ?e=<slug>.<key> פותח את הדף לעריכה מכל מכשיר. OrderUI: ▲▼ ותיבת "מוצג" לכל מקטע. */
(function(root){
  var st = { slug: "", key: "" };
  var cfg = null;

  function api(path, body){
    return fetch(path, body ? { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) } : undefined)
      .then(function(r){ return r.json().catch(function(){ return { error:"השרת לא ענה כמו שצריך ("+r.status+")" }; }); });
  }
  function lsKey(){ return cfg.storageKey + "_srv"; }
  function persist(){ try{ localStorage.setItem(lsKey(), JSON.stringify(st)); }catch(e){} }
  function setUrl(){ try{ if(st.slug) history.replaceState(null, "", location.pathname + "?e=" + st.slug + "." + st.key); }catch(e){} }

  function box(html){
    var b = document.getElementById("editbox");
    if(!b){
      b = document.createElement("div"); b.id = "editbox";
      b.style.cssText = "background:#CCD537;border-radius:14px;padding:14px 18px;font-size:.9rem;margin-bottom:16px;line-height:1.6";
      var board = document.getElementById("board"); board.insertBefore(b, board.firstChild);
    }
    b.innerHTML = html; b.style.display = html ? "block" : "none";
  }
  function linkBox(url, live){
    box('<b>'+(live?'הדף שלך חי. ':'הטיוטה שמורה בענן. ')+'</b>הקישור הזה פותח אותו לעריכה מכל מכשיר, ורק מי שיש לה אותו יכולה לערוך. שמרי אותו:<br>'+
      '<input readonly value="'+url+'" style="width:100%;margin:8px 0;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.2);font-family:inherit;direction:ltr;font-size:.8rem" onclick="this.select()">'+
      '<button type="button" class="cbtn" id="editcopy" style="font-family:inherit;font-weight:800;padding:9px 16px;border-radius:100px;border:none;background:#191A2E;color:#fff;cursor:pointer">📋 העתיקי את קישור העריכה</button>');
    var b = document.getElementById("editcopy");
    if(b) b.onclick = function(){ (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function(){ b.textContent = "✓ הועתק"; }, function(){ var i = document.querySelector("#editbox input"); i.select(); }); };
  }

  var EditSync = {
    /* cfg: { storageKey, applyAll(obj) → ממלא את הטופס ומרענן, readAll() } */
    init: function(c){
      cfg = c;
      try{ var s = JSON.parse(localStorage.getItem(lsKey()) || "null"); if(s && s.slug) st = s; }catch(e){}
      var m = /[?&]e=([a-z0-9-]+)\.([a-f0-9]+)/i.exec(location.search);
      if(m){
        return api("/api/edit/" + m[1] + "/" + m[2]).then(function(j){
          if(!j || !j.ok){ box("קישור העריכה לא נמצא. בדקי שהעתקת אותו שלם."); return; }
          st = { slug: j.slug, key: j.editKey }; persist();
          cfg.applyAll(j.data || {});
          try{ localStorage.setItem(cfg.storageKey, JSON.stringify(cfg.readAll())); }catch(e){}
          linkBox(location.origin + location.pathname + "?e=" + st.slug + "." + st.key, j.status === "live");
        }).catch(function(){ box("לא הצלחתי לטעון את הדף. נסי לרענן."); });
      }
      if(st.slug){ linkBox(location.origin + location.pathname + "?e=" + st.slug + "." + st.key, false); setUrl(); }
    },
    withKey: function(d){ if(st.slug){ d.__slug = st.slug; d.__key = st.key; } return d; },
    remember: function(j){ if(j && j.slug){ st = { slug: j.slug, key: j.editKey }; persist(); setUrl(); } },
    save: function(btn){
      var d = EditSync.withKey(cfg.readAll()), old = btn ? btn.textContent : "";
      if(!(d.bizName||"").trim()){ alert("רק צריך שם, ואפשר לשמור 🙂"); return; }
      if(btn){ btn.textContent = "שומרת..."; btn.disabled = true; }
      return api("/api/save", d).then(function(j){
        if(btn){ btn.textContent = old; btn.disabled = false; }
        if(!j || !j.ok){ alert("השמירה נכשלה: " + ((j||{}).error || "נסי שוב")); return; }
        EditSync.remember(j);
        linkBox(j.editUrl, j.status === "live");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }).catch(function(){ if(btn){ btn.textContent = old; btn.disabled = false; } alert("השמירה נכשלה. נסי שוב"); });
    },
    doneHTML: function(j){
      if(!j || !j.editUrl) return "";
      return '<a href="'+j.editUrl+'" style="background:#CCD537">✏️ הקישור שלך לעריכה (שמרי אותו!)</a>'+
        '<p style="color:#6B6B7B;font-size:.85rem">כל שינוי: פותחת את הקישור, מתקנת, ולוחצת שוב ״פרסמי״. הדף והטבלה נשארים באותה כתובת.</p>';
    }
  };

  /* סדר ומה מוצג: opts = { host: אלמנט, defaults: [...], labels: {key: "שם"}, onChange }
     המצב נשמר בשדות הנסתרים data-k="sectionOrder" ו-"sectionHidden" */
  var OrderUI = {
    render: function(opts){
      var host = opts.host, orderEl = document.querySelector('[data-k="sectionOrder"]'), hidEl = document.querySelector('[data-k="sectionHidden"]');
      function csv(s){ return String(s||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean); }
      function current(){ return root.PageBlocks.order(opts.defaults, { sectionOrder: orderEl.value, sectionHidden: "" }); }
      function labelOf(k){
        if(/^x\d$/.test(k)){ var t = (document.querySelector('[data-k="'+k+'Title"]')||{}).value; return "מקטע חופשי " + k.slice(1) + (t ? ": " + t : ""); }
        return opts.labels[k] || k;
      }
      function draw(){
        var arr = current(), hidden = csv(hidEl.value);
        host.innerHTML = arr.map(function(k, i){
          var locked = k === "lead";
          return '<div class="orow" data-key="'+k+'" style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #ECE7DF">'+
            '<span style="flex:1;font-weight:700;font-size:.95rem">'+labelOf(k)+(locked?' <small style="color:#6B6B7B">(הטופס, תמיד מוצג)</small>':'')+'</span>'+
            '<button type="button" data-mv="-1" aria-label="הזיזי למעלה" '+(i===0?'disabled':'')+' style="border:1.5px solid #ECE7DF;background:#fff;border-radius:10px;padding:6px 11px;cursor:pointer">▲</button>'+
            '<button type="button" data-mv="1" aria-label="הזיזי למטה" '+(i===arr.length-1?'disabled':'')+' style="border:1.5px solid #ECE7DF;background:#fff;border-radius:10px;padding:6px 11px;cursor:pointer">▼</button>'+
            (locked?'':'<label style="font-size:.85rem;white-space:nowrap"><input type="checkbox" data-show '+(hidden.indexOf(k)<0?'checked':'')+'> מוצג</label>')+
            '</div>';
        }).join("");
      }
      host.addEventListener("click", function(e){
        var mv = e.target.dataset && e.target.dataset.mv; if(!mv) return;
        var row = e.target.closest(".orow"), k = row.dataset.key, arr = current(), i = arr.indexOf(k), j = i + parseInt(mv, 10);
        if(j < 0 || j >= arr.length) return;
        arr.splice(i, 1); arr.splice(j, 0, k);
        // שומרים גם את המוסתרים שלא מופיעים ברשימה (הם נשארים במקומם היחסי)
        orderEl.value = arr.join(","); draw(); opts.onChange && opts.onChange();
      });
      host.addEventListener("change", function(e){
        if(e.target.dataset.show === undefined) return;
        var k = e.target.closest(".orow").dataset.key, h = csv(hidEl.value).filter(function(x){ return x !== k; });
        if(!e.target.checked) h.push(k);
        hidEl.value = h.join(","); opts.onChange && opts.onChange();
      });
      host._redraw = draw; draw();
      return draw;
    }
  };

  root.EditSync = EditSync; root.OrderUI = OrderUI;
})(window);
