import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { messages, currentFormData } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
את סוכנת AI מומחית וחכמה בשם Rebecca לניהול ופתיחת קריאות IT ומחשוב (SmartDesk AI Copilot).
המטרה שלך היא לפשט למשתמש את החיים ולמלא עבורו את כל הטופס בשיחה קצרה ונעימה.

הנחיות פעולה:
1. נתחי את השיחה עם המשתמש וחלצי נתונים מובנים ומדויקים.
2. זהי האם חסרים פרטים מהותיים:
   - שם המדווח / אימייל לחזרה
   - פירוט בסיסי המאפשר טיפול (מה התקלה או הבקשה הספציפית)
3. אם חסר פרט מהותי (למשל: לא צוין שם, או התקלה כללית מדי כמו "המחשב לא עובד"), החזירי ב-follow_up_question שאלת המשך קצרה, אנושית, מנומסת וממוקדת בעברית (למשל: "היי! רשמתי את התקלה. מה שמך המלא ואימייל כדי שנשייך את הקריאה?").
4. ברגע שיש לך את כל המידע הנדרש לפתיחת הקריאה, החזירי follow_up_question: null כדי שהמערכת תעביר את המשתמש מיד לטופס המלא.
5. קבעי את הצוות המטפל (assigned_team) מתוך:
   - 'Helpdesk Tier 1' (חומרה, עמדות, מסכים, מקלדות, ציוד קצה)
   - 'System & Cloud Team' (שרתים, ענן, גיבויים, תשתיות)
   - 'Network & Security' (VPN, תקשורת, חומות אש, איטיות רשת)
   - 'IT Applications & BI' (מערכות מידע, ERP, CRM, בסיסי נתונים)
   - 'Identity & Access' (הרשאות, Active Directory, איפוס סיסמאות, SSO)
`;

    const promptContext = `
נתוני טופס קיימים:
${JSON.stringify(currentFormData || {})}

היסטוריית השיחה:
${JSON.stringify(messages || [])}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'כותרת תמציתית ומקצועית' },
            description: { type: Type.STRING, description: 'תיאור מפורט ומסודר של התקלה' },
            category: {
              type: Type.STRING,
              enum: [
                'Hardware', 
                'Software & SaaS', 
                'Network & Connectivity', 
                'Access & IAM', 
                'Cloud & Infrastructure', 
                'Cyber Security', 
                'Workstation & Peripherals',
                'Database & BI',
                'General IT Request'
              ],
            },
            urgency: {
              type: Type.STRING,
              enum: ['Low', 'Medium', 'High', 'Critical'],
            },
            system_impacted: { type: Type.STRING, description: 'המערכת, השירות או החומרה שנפגעו' },
            assigned_team: {
              type: Type.STRING,
              enum: [
                'Helpdesk Tier 1',
                'System & Cloud Team',
                'Network & Security',
                'IT Applications & BI',
                'Identity & Access'
              ],
            },
            reporter_name: { type: Type.STRING, description: 'שם המדווח' },
            reporter_email: { type: Type.STRING, description: 'אימייל המדווח' },
            follow_up_question: { 
              type: Type.STRING, 
              description: 'שאלת הבהרה אם חסר מידע. אם הכל מוכן, החזירי null',
              nullable: true 
            },
          },
          required: ['title', 'description', 'category', 'urgency', 'system_impacted', 'assigned_team'],
        },
      },
    });

    return NextResponse.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error in ai-parse:', error);
    return NextResponse.json({ error: 'AI processing failed', details: error.message }, { status: 500 });
  }
}