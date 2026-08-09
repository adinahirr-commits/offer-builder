# בנאי דף ההצעה — מה בנוי ומה נשאר

## מה כבר עובד (אומת מקצה לקצה, מצב MOCK)
- **שאלון** בעברית עם דוגמאות → תצוגה מקדימה חיה → כפתור "פרסמי".
- **פרסום** יוצר טבלת לידים בגוגל, משתף אותה למייל המשתתפת, ומחזיר: קישור לדף חי + קישור לטבלה.
- **דף נחיתה חי** ב-`/p/<slug>` (קישור קצר ונקי לשיתוף).
- **קליטת לידים**: כל מי שממלאת בדף → שורה חדשה בטבלת הגוגל של המשתתפת.
- פרסום חוזר של אותו עסק = אותו דף ואותה טבלה (בלי כפילויות).

## מה נשאר — 3 צעדי הקמה חד-פעמיים (זהות/הרשאות)

### 1. חיבור לגוגל (mominvest10x) — פעם אחת
צריך OAuth credentials + refresh token של mominvest10x, שנכנסים כמשתני סביבה:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

איך משיגים (ב-Google Cloud Console, מחוברת כ-mominvest10x):
1. פרויקט → **Enable APIs**: Google Sheets API + Google Drive API.
2. **OAuth consent screen**: External, מצב Testing, מוסיפים את mominvest10x כ-Test user.
   (במצב Testing אין צורך באימות אפליקציה של גוגל — מספיק לעד 100 משתמשים, מושלם לפיילוט.)
3. **Credentials → Create OAuth client ID → Web application**. מקבלים Client ID + Secret.
4. פעם אחת מייצרים refresh token (סקריפט קצר / OAuth playground) עם scope:
   `https://www.googleapis.com/auth/drive` + `https://www.googleapis.com/auth/spreadsheets`.

> ברגע שיש לי את 3 המשתנים — הכל עובר אוטומטית ממצב MOCK לחי. אני מכין את סקריפט ה-refresh token מוכן להרצה.

### 2. אירוח (Render) — פעם אחת
- Deploy ל-Render (יש כבר תשתית).
- משתנה `PUBLIC_BASE` = הכתובת הציבורית (למשל `https://offer.mominvest.co.il`).
- keepalive כל 10 דק' כדי שהשרת לא יירדם (כמו במערכת המכירות).
- לפרודקשן: לחבר אחסון קבוע (Render disk או העברת ה-`data/pages.json` לגוגל) כדי שהדפים ישרדו deploy.

### 3. קישור בפורטל (משימת שיעור 6)
- הקישור לשאלון (`https://offer.mominvest.co.il`) נכנס כמשימה בשיעור 6.
- בפגישות האישיות: יושבות יחד, ממלאות את השאלון בשפת הלקוחה, ותוך דקות יש דף חי + טבלה.

## הרצה מקומית
```
cd ~/offer-builder && npm install && PORT=4900 npm start
```
בלי משתני גוגל → מצב MOCK (הכל עובד חוץ מיצירת טבלה אמיתית).
