#!/bin/bash
# מחזיר את offer-builder לתוכנית החינמית ב-Render ב-1/9/2026 (איפוס מכסת 750 השעות).
# רץ יומית ב-09:20 דרך local.offerbuilder.downgrade; יוצא בשקט לפני 1/9; מוחק את עצמו אחרי ריצה אמיתית.
set -u
[ "$(date +%Y%m%d)" -lt 20260901 ] && exit 0

SRV="srv-d9se5uk9v7es73enjk7g"
K=$(grep -ho "rnd_[A-Za-z0-9]*" "$HOME/.render/cli.yaml" | head -1)
TOKEN=$(python3 -c "import json;print(json.load(open('$HOME/claude-telegram-bot/config.json'))['botToken'])" 2>/dev/null)

notify(){
  [ -n "$TOKEN" ] && curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d chat_id=390198534 --data-urlencode "text=$1" >/dev/null
}

curl -s -X PATCH "https://api.render.com/v1/services/$SRV" \
  -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  --data-raw '{"serviceDetails":{"plan":"free"}}' >/dev/null
sleep 10
PLAN=$(curl -s "https://api.render.com/v1/services/$SRV" -H "Authorization: Bearer $K" | \
  python3 -c "import json,sys;print(json.load(sys.stdin).get('serviceDetails',{}).get('plan','?'))" 2>/dev/null)

if [ "$PLAN" = "free" ]; then
  curl -s -X POST "https://api.render.com/v1/services/$SRV/deploys" \
    -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{}' >/dev/null
  sleep 90
  H=$(curl -s --max-time 20 "https://offer-builder.onrender.com/health")
  notify "✅ בנאי דף ההצעה (offer-builder) הוחזר אוטומטית לתוכנית החינמית של Render — החיוב של 7\$ הופסק. בריאות: ${H:-עדיין עולה, כדאי לבדוק בעוד כמה דקות}. ה-keepalive שומר עליו ער."
else
  notify "⚠️ ההחזרה האוטומטית של offer-builder לתוכנית החינמית נכשלה (plan=$PLAN). ידנית, 2 לחיצות: dashboard.render.com ← offer-builder ← Settings ← Instance Type ← Free. בלי זה ממשיך חיוב 7\$/חודש."
fi

launchctl bootout "gui/$(id -u)/local.offerbuilder.downgrade" 2>/dev/null
rm -f "$HOME/Library/LaunchAgents/local.offerbuilder.downgrade.plist"
rm -f "$0"
