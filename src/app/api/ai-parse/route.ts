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
אתה סוכן AI מומחה לניהול קריאות IT ותמיכה טכנית (Service Desk Intelligent Agent).
תפקידך:
1. לנתח את השיחה עם המשתמש ולחלץ נתונים מובנים לטופס פתיחת קריאת מחשוב.
2. לזהות האם חסרים פרטים מהותיים:
   - פרטי מדווח (שם מלא / אימייל)
   - תיאור מספיק של הבעיה או הודעת השגיאה
   - המערכת/חומרה הספציפית
3. אם חסר מידע חשוב (במיוחד שם המשתמש או מידע טכני מהותי), החזר ב-follow_up_question שאלה מנומסת, תמציתית וממוקדת בעברית. אם הכל ברור ומלא, החזר null בשדה זה.
4. קבע את הצוות המטפל (assigned_team) באופן אוטומטי מתוך:
   - 'Helpdesk Tier 1' (תקלות משתמש קצה, עמדות, ציוד היקפי)
   - 'System & Cloud Team' (תשתיות, ענן, שרתים, גיבויים)
   - 'Network & Security' (רשת, VPN, חומות אש, אבטחת מידע)
   - 'IT Applications & BI' (תוכנות ארגוניות, מערכות מידע, מסדי נתונים)
   - 'Identity & Access' (הרשאות, Active Directory, איפוס סיסמאות, SSO)
`;

    const promptContext = `
הנתונים הקיימים בטופס עד כה:
${JSON.stringify(currentFormData || {})}

היסטוריית השיחה עם המשתמש:
${JSON.stringify(messages || [])}

חלץ את הנתונים המעודכנים ביותר ובדוק אם נדרשת שאלת המשך.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'כותרת תמציתית ומקצועית' },
            description: { type: Type.STRING, description: 'תיאור מפורט ומסודר' },
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
            reporter_name: { type: Type.STRING, description: 'שם המדווח אם זוהה, או מחרוזת ריקה' },
            reporter_email: { type: Type.STRING, description: 'אימייל המדווח אם זוהה, או מחרוזת ריקה' },
            follow_up_question: { 
              type: Type.STRING, 
              description: 'שאלת הבהרה אם חסר מידע קריטי כגון שם המשתמש או פרטים טכניים, אחרת null',
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