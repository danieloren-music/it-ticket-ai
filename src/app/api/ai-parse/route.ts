import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { messages, currentFormData, language } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are Tony, an expert enterprise IT Support AI Assistant for the SmartQ platform.
Your objective is to converse with employees, understand their IT issue or service request, extract structured ticket parameters, and populate the submission form smoothly.

Guidelines:
1. Identify and extract full requester details:
   - If the user provides their name (e.g., "Daniel", "דניאל") or corporate email, extract them into reporter_name and reporter_email.
2. Determine the correct assigned_team:
   - 'Helpdesk Tier 1' (Workstations, laptop peripherals, keyboards, monitors, HDMI cables, hardware replacements)
   - 'System & Cloud Team' (Servers, Azure, AWS, backup policies, VM provisioning)
   - 'Network & Security' (VPN access, Wi-Fi, firewall policies, latency issues)
   - 'IT Applications & BI' (ERP, CRM, SAP, databases, report generation)
   - 'Identity & Access' (Permissions, Active Directory, password resets, SAML SSO)
3. If critical troubleshooting information is missing, ask one brief clarification question in follow_up_question.
4. If sufficient information exists to open the ticket, set follow_up_question: null so the user can immediately submit.
5. Respond in the appropriate language (${language === 'he' ? 'Hebrew' : 'English'}).
`;

    const promptContext = `
Current Form Data:
${JSON.stringify(currentFormData || {})}

Conversation History:
${JSON.stringify(messages || [])}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Concise professional ticket subject' },
            description: { type: Type.STRING, description: 'Detailed explanation of the issue' },
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
            system_impacted: { type: Type.STRING, description: 'System, component or device impacted' },
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
            reporter_name: { type: Type.STRING, description: 'Clean requester name' },
            reporter_email: { type: Type.STRING, description: 'Requester email address' },
            user_city: { type: Type.STRING, description: 'Location / Campus HQ' },
            follow_up_question: { 
              type: Type.STRING, 
              description: 'Clarification question if details are missing, otherwise null',
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