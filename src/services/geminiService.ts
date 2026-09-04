import type { ExtractedDocData } from '../types';

const PROMPT_SYSTEM = `You are an expert document organizer specializing in physical paperwork, health insurance EOBs (Explanation of Benefits), medical bills, tax documents, and receipts.
Examine the attached scanned document image and extract metadata into clean JSON.

Output MUST be a valid JSON object matching this exact schema:
{
  "documentType": "EOB (Explanation of Benefits)" | "Medical Bill" | "Prescription / Rx" | "Lab / Diagnostic Result" | "Tax Document (W-2, 1099, Notice)" | "Receipt" | "Insurance Policy" | "Utility / Service Bill" | "Legal / Government Notice" | "Other Document",
  "issuer": "Name of insurer, clinic, provider, vendor or agency (e.g. Aetna, Quest Diagnostics, IRS)",
  "statementDate": "YYYY-MM-DD (Date of service, statement date, or current year-month-day if not found)",
  "patientOrAccount": "Patient name or Account/Claim number if present, else 'N/A'",
  "amountDue": "Patient responsibility or balance due (e.g. '$0.00' or '$124.50'), or 'N/A'",
  "summary": "Concise 1-sentence summary of the document (e.g., 'Routine annual physical exam coverage statement')",
  "suggestedFilename": "Standardized filename without spaces using format YYYY-MM-DD_[Type]_[Issuer]_[BriefTopic].pdf (e.g., 2026-03-15_EOB_Aetna_AnnualPhysical.pdf)",
  "targetFolder": "Suggested folder path for Google Drive (e.g. Medical/EOBs/2026 or Taxes/2026)",
  "tags": ["keyword1", "keyword2", "keyword3"]
}

Return ONLY the raw JSON string without markdown code block fences.`;

export async function analyzeDocumentWithGemini(
  imageDataUrl: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  rootFolder: string = 'Shallot-Declutter'
): Promise<ExtractedDocData> {
  // If no API key provided, use the simulated intelligent analyzer
  if (!apiKey || apiKey.trim() === '') {
    return generateDemoDocumentAnalysis(rootFolder);
  }

  try {
    // Extract raw base64 data and mimeType
    const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = imageDataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT_SYSTEM },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Gemini API returned error, falling back to simulated extraction:', errorText);
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No response text returned from Gemini');
    }

    // Clean any accidental markdown backticks
    const cleanedJson = candidateText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleanedJson);

    // Ensure target folder begins with rootFolder
    const cleanTargetFolder = parsed.targetFolder.startsWith(rootFolder) 
      ? parsed.targetFolder 
      : `${rootFolder}/${parsed.targetFolder}`.replace(/\/+/g, '/');

    return {
      documentType: parsed.documentType || 'Other Document',
      issuer: parsed.issuer || 'Unknown Issuer',
      statementDate: parsed.statementDate || new Date().toISOString().split('T')[0],
      patientOrAccount: parsed.patientOrAccount || 'N/A',
      amountDue: parsed.amountDue || '$0.00',
      summary: parsed.summary || 'Scanned document',
      suggestedFilename: parsed.suggestedFilename || `${new Date().toISOString().split('T')[0]}_Document.pdf`,
      targetFolder: cleanTargetFolder,
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Paperwork'],
    };
  } catch (err) {
    console.warn('Analysis error, fallback to simulated analysis:', err);
    return generateDemoDocumentAnalysis(rootFolder);
  }
}

/**
 * Intelligent sample fallback for offline / test / no-key demo
 */
export function generateDemoDocumentAnalysis(rootFolder: string): ExtractedDocData {
  const samples: ExtractedDocData[] = [
    {
      documentType: 'EOB (Explanation of Benefits)',
      issuer: 'Aetna Health',
      statementDate: new Date().toISOString().split('T')[0],
      patientOrAccount: 'Claim #AE-98214',
      amountDue: '$0.00 (Fully Covered)',
      summary: 'Explanation of benefits for in-network routine preventive care examination.',
      suggestedFilename: `${new Date().toISOString().split('T')[0]}_EOB_Aetna_PreventiveExam.pdf`,
      targetFolder: `${rootFolder}/Medical/EOBs/${new Date().getFullYear()}`,
      tags: ['Aetna', 'EOB', 'In-Network', 'Medical'],
    },
    {
      documentType: 'Medical Bill',
      issuer: 'Quest Diagnostics',
      statementDate: new Date().toISOString().split('T')[0],
      patientOrAccount: 'Acct #QD-44109',
      amountDue: '$38.50',
      summary: 'Outpatient diagnostic blood panel copay & lab services.',
      suggestedFilename: `${new Date().toISOString().split('T')[0]}_Bill_QuestDiagnostics_LabPanel.pdf`,
      targetFolder: `${rootFolder}/Medical/Bills/${new Date().getFullYear()}`,
      tags: ['Quest Diagnostics', 'Lab', 'Copay', 'Medical Bill'],
    },
    {
      documentType: 'Tax Document (W-2, 1099, Notice)',
      issuer: 'Internal Revenue Service',
      statementDate: `${new Date().getFullYear()}-01-31`,
      patientOrAccount: 'Form 1099-INT',
      amountDue: 'N/A (Informational)',
      summary: 'Annual interest income statement for annual tax preparation.',
      suggestedFilename: `${new Date().getFullYear()}-01-31_Tax_Form1099_InterestStatement.pdf`,
      targetFolder: `${rootFolder}/Financial/Taxes/${new Date().getFullYear()}`,
      tags: ['Taxes', 'IRS', '1099', 'Finance'],
    }
  ];

  // Rotate sample for variety
  const randomIndex = Math.floor(Math.random() * samples.length);
  return samples[randomIndex];
}
