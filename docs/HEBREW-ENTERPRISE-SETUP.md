# SmartQ — הקמה ועלייה לאוויר

המדריך הזה מכסה הקמה של Supabase, הגדרת משתנים ב-Vercel ובדיקת המערכת. SSO והגדרות AI מופיעים בסוף, ורק אם צריך אותם.

## לפני שמתחילים

- פרויקט Supabase ופרויקט Vercel.
- דומיין HTTPS ל-SmartQ.
- Node.js 20.9 ומעלה, אם מריצים מקומית.
- **חשוב:** המיגרציות במאגר מרחיבות מסד קיים. הן לא יוצרות את טבלאות הבסיס. אם חסרות הטבלאות `tenants`, `tenant_users`, `tickets` או `platform_admins`, עצרו והגדירו קודם סכימת בסיס.

## 1. הכנת Supabase

ב-Supabase, פתחו את **SQL Editor**:

1. הריצו את [בדיקת המסד לקריאה בלבד](../supabase/maintenance/001_review_database.sql) וודאו שטבלאות הבסיס קיימות.
2. צרו גיבוי שניתן לשחזר.
3. הריצו לפי הסדר:
   - [001_enterprise.sql](../supabase/migrations/001_enterprise.sql)
   - [003_oidc_sso.sql](../supabase/migrations/003_oidc_sso.sql)
4. שמרו את **Project URL**, את מפתח ה-`anon` ואת מפתח `service_role` מתוך **Project Settings → API**.

אל תשתפו או תחשפו את מפתח `service_role`; הוא מיועד לשרת בלבד.

## 2. הגדרת משתני סביבה

השתמשו ב-[`.env.example`](../.env.example) כתבנית:

1. צרו עותק בשם `.env.local` לפיתוח המקומי.
2. החליפו את כל ערכי הדוגמה בערכים האמיתיים שלכם.
3. ב-Vercel, פתחו את הפרויקט ואת **Environment Variables**, בחרו הוספה בכמות גדולה (Bulk), והדביקו את תוכן הקובץ או העלו אותו. בחרו את הסביבות המתאימות (Production, ולפי הצורך גם Preview ו-Development).
4. אל תייבאו את `.env.example` כמו שהוא, אל תעלו `.env.local` ל-Git, ואל תשאירו ערכי דוגמה בפריסה. סמנו מפתחות וסיסמאות כ-**Secret** ב-Vercel; `NEXT_PUBLIC_*` מיועדים להיות גלויים לדפדפן.

הערכים הדרושים לפרודקשן:

| משתנה | מה להגדיר |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת פרויקט Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח `anon` של Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | מפתח `service_role` — משתנה שרת סודי |
| `SESSION_SECRET` | מפתח אקראי לחתימת session |
| `NEXT_PUBLIC_APP_URL` | כתובת האתר המדויקת, למשל `https://support.example.com` |
| `RESEND_API_KEY` | מפתח Resend לשליחת טופס יצירת הקשר |
| `RESEND_FROM_EMAIL` | כתובת שולח מאומתת ב-Resend, למשל `SmartQ <contact@example.com>` |
| `CONTACT_TO_EMAIL` | כתובת לקבלת פניות מהאתר |

צרו ערך ל-`SESSION_SECRET` והריצו את הפקודה ב-PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

העתיקו את הפלט ל-`SESSION_SECRET`. השתמשו בערך נפרד לכל סביבה ושמרו אותו קבוע; החלפתו תנתק את המשתמשים.

### ערכים לפי צורך

- `PLATFORM_BOOTSTRAP_EMAIL` ו-`PLATFORM_BOOTSTRAP_PASSWORD` — רק אם עדיין לא קיים מנהל SmartQ. הגדירו סיסמה ארוכה וייחודית, צרו מנהל קבוע ב-`/platform`, ואז הסירו את שני המשתנים מ-Vercel.
- `GEMINI_API_KEY` — נדרש לסיווג קריאות AI בארגונים. ההדגמה הציבורית אינה משתמשת במפתח הזה.
- `OIDC_CLIENT_ID` ו-`OIDC_CLIENT_SECRET` — זוג משתנים אופציונלי עבור אפליקציית OIDC משותפת של SmartQ. השאירו את שניהם ריקים או הגדירו את שניהם.
- `IDP_ENCRYPTION_KEY` — נדרש רק אם ארגונים שומרים ב-SmartQ את ה-Client Secret הפרטי שלהם ל-OIDC. צרו מפתח base64 אקראי של 32 bytes:

  ```powershell
  node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
  ```

- `DEMO_ENABLED=false` — מכבה את סביבת ההדגמה הציבורית. ברירת המחדל היא מופעלת.

אחרי שינוי משתני סביבה ב-Vercel, בצעו **Redeploy**.

## 3. הרצה מקומית (אופציונלי)

```powershell
npm ci
Copy-Item .env.example .env.local
```

ערכו את `.env.local`, מלאו את הערכים הדרושים והריצו:

```powershell
npm run dev
```

פתחו `http://localhost:3000`. `.env.local` אינו מיועד להעלאה ל-Git.

## 4. פריסה ובדיקת המערכת

1. פרסו ל-Vercel והגדירו את `NEXT_PUBLIC_APP_URL` לכתובת ה-HTTPS שבה תשתמשו בפועל.
2. פתחו `https://<הדומיין>/api/health`. צפו ל-HTTP `200`, עם `status: "ok"` ו-`database: "ok"`.
3. אם זו התקנה ראשונה, התחברו אל `/platform/login` עם פרטי ה-bootstrap וצרו מנהל SmartQ קבוע. הסירו אחר כך את משתני ה-bootstrap ובצעו Redeploy.
4. צרו ארגון ומנהל ארגון דרך `/platform`. המנהל מקבל סיסמה זמנית ומחליף אותה בכניסה הראשונה.
5. בדקו כניסה, שינוי סיסמה, פתיחת קריאה, תור הטיפול והרשאות של עובד, טכנאי ומנהל.
6. רק אחרי שהבדיקות עוברות, הריצו את [002_enable_rls.sql](../supabase/migrations/002_enable_rls.sql) ב-Supabase. בדקו שוב את `/api/health` ואת תהליכי הכניסה והקריאות.

אם בדיקה נכשלת, בדקו את לוגי ה-Deployment ב-Vercel ואת שגיאת ה-API. כשל נפוץ הוא URL או מפתח Supabase שגויים, משתנה חסר, או הרצת מיגרציה על סכימה לא מתאימה.

## 5. כניסת Entra ID (רק אם מפעילים SSO)

### OIDC

1. ב-App Registration הגדירו Redirect URI מסוג Web:
   `https://<הדומיין>/api/auth/oidc/callback`
2. הגדירו ב-Vercel את `OIDC_CLIENT_ID` ואת `OIDC_CLIENT_SECRET` אם משתמשים ב-App Registration המשותפת של SmartQ.
3. בהגדרות SSO של הארגון, הזינו את Issuer המדויק שלו, למשל `https://login.microsoftonline.com/<tenant-id>/v2.0` — לא `common` או `organizations`.
4. הקצו מראש ב-SmartQ משתמשים פעילים עם כתובת הדוא״ל המתאימה. התפקידים נקבעים ב-SmartQ; אין מיפוי קבוצות אוטומטי.

אפשר גם להשתמש ב-OIDC client של הארגון. במקרה כזה, מגדירים אותו במסך ה-SSO של הארגון ומוסיפים את `IDP_ENCRYPTION_KEY` ל-Vercel. רשמו ב-IdP את כתובת ה-callback שמוצגת במסך.

### SAML

1. במסך SSO של הארגון העתיקו את `Entity ID` ואת `Reply URL (ACS)` ל-IdP.
2. הזינו ב-SmartQ את Login URL ואת תעודת החתימה הציבורית.
3. בדקו עם משתמש פעיל שהוקצה מראש, ורק אז הפעילו SAML למשתמשים.

## בדיקה מהירה לפני מסירה

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- בדקו כניסה לכל תפקיד, יצירה וטיפול בקריאה, וגישה של משתמש לא מורשה.
- בדקו ש-`SUPABASE_SERVICE_ROLE_KEY`, סיסמאות ומפתחות API אינם ב-Git או בקוד הדפדפן.

ההדגמה בדף הבית היא סימולציה: היא לא יוצרת קריאה אמיתית ולא משתמשת ב-Gemini.
