<div dir="rtl" align="right">

<h1 dir="rtl" align="right">SmartQ — הקמה ועלייה לאוויר</h1>

<p dir="rtl" align="right">המדריך הזה מסביר איך להקים את Supabase, להגדיר משתנים ב-Vercel ולבדוק שהאתר עובד. הגדרות AI וכניסה ארגונית נמצאות בסוף, למי שצריך אותן.</p>

<h2 dir="rtl" align="right">לפני שמתחילים</h2>

<ul dir="rtl" align="right">
<li>פרויקט Supabase ופרויקט Vercel.</li>
<li>דומיין HTTPS ל-SmartQ.</li>
<li>Node.js 20.9 ומעלה, אם מריצים מקומית.</li>
<li><strong>חשוב:</strong> המיגרציות במאגר מרחיבות מסד קיים; הן לא יוצרות את טבלאות הבסיס. אם חסרה אחת מהטבלאות <code dir="ltr">tenants</code>, <code dir="ltr">tenant_users</code>, <code dir="ltr">tickets</code> או <code dir="ltr">platform_admins</code>, עצרו והגדירו קודם סכימת בסיס.</li>
</ul>

<h2 dir="rtl" align="right">1. הכנת Supabase</h2>

<p dir="rtl" align="right">ב-Supabase, פתחו את <strong>SQL Editor</strong> ובצעו:</p>

<ol dir="rtl" align="right">
<li>הריצו את <a href="../supabase/maintenance/001_review_database.sql">בדיקת המסד לקריאה בלבד</a> וודאו שטבלאות הבסיס קיימות.</li>
<li>צרו גיבוי שניתן לשחזר.</li>
<li>הריצו לפי הסדר את <a href="../supabase/migrations/001_enterprise.sql"><code dir="ltr">001_enterprise.sql</code></a> ואחריו את <a href="../supabase/migrations/003_oidc_sso.sql"><code dir="ltr">003_oidc_sso.sql</code></a>.</li>
<li>שמרו את ה-<strong>Project URL</strong>, מפתח <code dir="ltr">anon</code> ומפתח <code dir="ltr">service_role</code> מתוך <strong dir="ltr">Project Settings → API</strong>.</li>
</ol>

<p dir="rtl" align="right">מפתח <code dir="ltr">service_role</code> הוא סוד שרת. אל תשתפו אותו ואל תחשפו אותו לדפדפן.</p>

<h2 dir="rtl" align="right">2. הגדרת משתני סביבה</h2>

<p dir="rtl" align="right">השתמשו בקובץ <a href="../.env.example"><code dir="ltr">.env.example</code></a> כתבנית:</p>

<ol dir="rtl" align="right">
<li>צרו עותק בשם <code dir="ltr">.env.local</code> לפיתוח מקומי.</li>
<li>החליפו את ערכי הדוגמה בערכים האמיתיים שלכם.</li>
<li>ב-Vercel פתחו את הפרויקט → <strong dir="ltr">Environment Variables</strong> → <strong dir="ltr">Bulk</strong>. הדביקו את תוכן הקובץ או העלו אותו, ובחרו <strong dir="ltr">Production</strong>. בחרו גם <strong dir="ltr">Preview</strong> או <strong dir="ltr">Development</strong> רק אם צריך אותן.</li>
<li>אל תייבאו את <code dir="ltr">.env.example</code> כפי שהוא, אל תעלו את <code dir="ltr">.env.local</code> ל-Git, ואל תשאירו ערכי דוגמה בפריסה. סמנו מפתחות וסיסמאות כ-<strong dir="ltr">Secret</strong>. משתנים שמתחילים ב-<code dir="ltr">NEXT_PUBLIC_</code> גלויים לדפדפן.</li>
</ol>

<p dir="rtl" align="right"><strong>הגדירו בפרודקשן את המשתנים הבאים:</strong></p>

<table dir="rtl" align="right" width="100%">
<thead><tr><th align="right">משתנה</th><th align="right">מה להגדיר</th></tr></thead>
<tbody>
<tr><td><code dir="ltr">NEXT_PUBLIC_SUPABASE_URL</code></td><td>כתובת פרויקט Supabase</td></tr>
<tr><td><code dir="ltr">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></td><td>מפתח <code dir="ltr">anon</code> של Supabase</td></tr>
<tr><td><code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code></td><td>מפתח <code dir="ltr">service_role</code> — סוד שרת</td></tr>
<tr><td><code dir="ltr">SESSION_SECRET</code></td><td>מפתח אקראי לחתימת session</td></tr>
<tr><td><code dir="ltr">NEXT_PUBLIC_APP_URL</code></td><td>כתובת האתר, למשל <code dir="ltr">https://support.example.com</code></td></tr>
<tr><td><code dir="ltr">RESEND_API_KEY</code></td><td>מפתח Resend לטופס יצירת קשר</td></tr>
<tr><td><code dir="ltr">RESEND_FROM_EMAIL</code></td><td>כתובת שולח מאומתת, למשל <code dir="ltr">SmartQ &lt;contact@example.com&gt;</code></td></tr>
<tr><td><code dir="ltr">CONTACT_TO_EMAIL</code></td><td>כתובת לקבלת פניות מהאתר</td></tr>
</tbody>
</table>

<p dir="rtl" align="right">צרו <code dir="ltr">SESSION_SECRET</code> ב-PowerShell והריצו:</p>

<pre dir="ltr"><code>node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"</code></pre>

<p dir="rtl" align="right">העתיקו את הפלט ל-<code dir="ltr">SESSION_SECRET</code>. השתמשו בערך נפרד לכל סביבה ושמרו אותו קבוע; החלפתו תנתק משתמשים.</p>

<h3 dir="rtl" align="right">משתנים נוספים — רק אם צריך</h3>

<ul dir="rtl" align="right">
<li><code dir="ltr">PLATFORM_BOOTSTRAP_EMAIL</code> ו-<code dir="ltr">PLATFORM_BOOTSTRAP_PASSWORD</code> — רק בהקמה הראשונה, אם עדיין אין מנהל SmartQ. אחרי יצירת מנהל קבוע ב-<code dir="ltr">/platform</code>, הסירו את שניהם מ-Vercel.</li>
<li><code dir="ltr">GEMINI_API_KEY</code> — לסיווג קריאות AI בארגונים. ההדגמה הציבורית אינה זקוקה לו.</li>
<li><code dir="ltr">OIDC_CLIENT_ID</code> ו-<code dir="ltr">OIDC_CLIENT_SECRET</code> — צמד אופציונלי לאפליקציית OIDC משותפת של SmartQ. הגדירו את שניהם יחד או השאירו את שניהם ריקים.</li>
<li><code dir="ltr">IDP_ENCRYPTION_KEY</code> — נדרש רק אם ארגון שומר ב-SmartQ סוד OIDC משלו. צרו מפתח base64 אקראי של 32 bytes:</li>
</ul>

<pre dir="ltr"><code>node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"</code></pre>

<ul dir="rtl" align="right">
<li><code dir="ltr">DEMO_ENABLED=false</code> — מכבה את סביבת ההדגמה הציבורית. ברירת המחדל היא מופעלת.</li>
</ul>

<p dir="rtl" align="right">אחרי שינוי משתני סביבה ב-Vercel, בצעו <strong dir="ltr">Redeploy</strong>. השינוי לא נכנס לתוקף בפריסה קיימת.</p>

<h2 dir="rtl" align="right">3. הרצה מקומית (אופציונלי)</h2>

<p dir="rtl" align="right">ב-PowerShell, מתוך תיקיית הפרויקט:</p>

<pre dir="ltr"><code>npm ci
Copy-Item .env.example .env.local</code></pre>

<p dir="rtl" align="right">מלאו את הערכים בקובץ <code dir="ltr">.env.local</code> והריצו:</p>

<pre dir="ltr"><code>npm run dev</code></pre>

<p dir="rtl" align="right">פתחו <code dir="ltr">http://localhost:3000</code>. אל תעלו את <code dir="ltr">.env.local</code> ל-Git.</p>

<h2 dir="rtl" align="right">4. פריסה ובדיקת המערכת</h2>

<ol dir="rtl" align="right">
<li>פרסו ל-Vercel. ודאו ש-<code dir="ltr">NEXT_PUBLIC_APP_URL</code> מכיל את כתובת ה-HTTPS שבה תשתמשו.</li>
<li>פתחו <code dir="ltr">https://&lt;הדומיין&gt;/api/health</code>. בדיקה תקינה מחזירה HTTP <code dir="ltr">200</code>, עם <code dir="ltr">status: "ok"</code> ו-<code dir="ltr">database: "ok"</code>.</li>
<li>בהקמה הראשונה, היכנסו אל <code dir="ltr">/platform/login</code> עם פרטי ה-bootstrap, צרו מנהל SmartQ קבוע, הסירו את משתני ה-bootstrap ובצעו Redeploy.</li>
<li>ב-<code dir="ltr">/platform</code> צרו ארגון ומנהל ארגון. המנהל מקבל סיסמה זמנית ומחליף אותה בכניסה הראשונה.</li>
<li>בדקו כניסה, שינוי סיסמה, פתיחת קריאה ותור טיפול עבור עובד, טכנאי ומנהל.</li>
<li>רק אחרי שהבדיקות עוברות, הריצו ב-Supabase את <a href="../supabase/migrations/002_enable_rls.sql"><code dir="ltr">002_enable_rls.sql</code></a>. בדקו שוב את health ואת תהליכי הכניסה והקריאות.</li>
</ol>

<p dir="rtl" align="right">אם בדיקה נכשלת, בדקו את לוגי ה-Deployment ב-Vercel. ודאו שכתובת ומפתחות Supabase נכונים, שכל המשתנים הוגדרו, והמיגרציות מתאימות לסכימת המסד.</p>

<h2 dir="rtl" align="right">5. כניסת Entra ID (רק אם מפעילים SSO)</h2>

<h3 dir="rtl" align="right">OIDC</h3>

<ol dir="rtl" align="right">
<li>ב-App Registration הגדירו Redirect URI מסוג Web: <code dir="ltr">https://&lt;הדומיין&gt;/api/auth/oidc/callback</code>.</li>
<li>ב-App Registration המשותפת של SmartQ, הגדירו ב-Vercel את <code dir="ltr">OIDC_CLIENT_ID</code> ואת <code dir="ltr">OIDC_CLIENT_SECRET</code>.</li>
<li>בהגדרות SSO של הארגון, הזינו את ה-Issuer המדויק, למשל <code dir="ltr">https://login.microsoftonline.com/&lt;tenant-id&gt;/v2.0</code>. אל תשתמשו ב-<code dir="ltr">common</code> או ב-<code dir="ltr">organizations</code>.</li>
<li>צרו מראש ב-SmartQ משתמשים פעילים עם כתובות הדוא״ל המתאימות. התפקידים נקבעים ב-SmartQ; אין מיפוי קבוצות אוטומטי.</li>
</ol>

<p dir="rtl" align="right">אם משתמשים ב-OIDC client של הארגון, הגדירו אותו במסך ה-SSO, הוסיפו ל-Vercel את <code dir="ltr">IDP_ENCRYPTION_KEY</code>, ורשמו ב-IdP את כתובת ה-callback שמוצגת במסך.</p>

<h3 dir="rtl" align="right">SAML</h3>

<ol dir="rtl" align="right">
<li>במסך SSO של הארגון העתיקו את <code dir="ltr">Entity ID</code> ואת <code dir="ltr">Reply URL (ACS)</code> ל-IdP.</li>
<li>הזינו ב-SmartQ את כתובת ה-Login ואת תעודת החתימה הציבורית.</li>
<li>בדקו עם משתמש פעיל שהוקצה מראש, ורק אז הפעילו SAML למשתמשים.</li>
</ol>

<h2 dir="rtl" align="right">בדיקה מהירה לפני מסירה</h2>

<ul dir="rtl" align="right">
<li>הריצו <code dir="ltr">npm run lint</code>, <code dir="ltr">npm run typecheck</code> ו-<code dir="ltr">npm run build</code>.</li>
<li>בדקו כניסה לכל תפקיד, יצירה וטיפול בקריאה, וגישה של משתמש לא מורשה.</li>
<li>ודאו שמפתחות וסיסמאות אינם ב-Git או בקוד הדפדפן.</li>
</ul>

<p dir="rtl" align="right">ההדגמה בדף הבית היא סימולציה: היא לא יוצרת קריאה אמיתית ולא משתמשת ב-Gemini.</p>

</div>
