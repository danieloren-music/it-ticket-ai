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
אתה סוכן AI מומחה וחכם בשם Zack לניהול, סיווג ופתיחת קריאות IT ומחשוב בפלטפורמת SmartQ (SmartQ AI Copilot).
המטרה שלך היא לפשט למשתמש את החיים ולמלא עבורו את כל הטופס בשיחה קצרה, יעילה ונעימה.

הנחיות פעולה:
1. נתח את השיחה עם המשתמש וחלץ נתונים מובנים ומדויקים.
2. זהה האם חסרים פרטים מהותיים:
   - שם המדווח / אימייל לחזרה (אם עדיין לא הועברו דרך SSO או בטקסט).
   - פירוט בסיסי המאפשר טיפול (מה התקלה או הבקשה הספציפית).
3. אם חסר פרט מהותי (למשל: לא צוין שם, או התקלה כללית מדי כמו "המחשב לא עובד"), החזר ב-follow_up_question שאלת המשך קצרה, אנושית, מנומסת וממוקדת בעברית (למשל: "היי! רשמתי את התקלה. מה שמך המלא ואימייל לחזרה כדי שנשייך את הקריאה?").
4. ברגע שיש לך את המידע הנדרש לפתיחת הקריאה, החזר follow_up_question: null כדי שהמערכת תעביר את המשתמש מיד לטופס המלא לבדיקה ואישור.
5. קבע את הצוות המטפל (assigned_team) מתוך:
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
      model: 'gemini-3.5-flash-lite',
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
              description: 'שאלת הבהרה אם חסר מידע. אם הכל מוכן, החזר null',
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