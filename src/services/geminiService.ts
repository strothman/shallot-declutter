import type { ExtractedDocData } from '../types';

const PROMPT_SYSTEM = `You are an expert document organizer and data extraction system for physical and digital paperwork, medical records, radiology/imaging reports, hospital bills, insurance EOBs, utilities, taxes, and legal documents.
Examine the attached document and extract comprehensive structured metadata into clean JSON.

Output MUST be a valid JSON object matching this exact schema:
{
  "documentType": "MRI Report" | "Medical Record" | "Lab Result" | "Medical Bill" | "EOB" | "Water Bill" | "Electric Bill" | "Utility Bill" | "Tax Document" | "Receipt" | "Prescription" | "Insurance Policy" | "Legal Notice" | "Other",
  "category": "Medical" | "Bills & Utilities" | "Insurance" | "Taxes" | "Legal" | "Personal",
  "issuer": "Clinic, hospital, provider, utility, vendor or agency name (e.g. TJ Samson Community Hospital)",
  "personOrPatient": "Full name of patient, account holder, customer, or taxpayer (e.g. Jamie Lynn Scelso)",
  "statementDate": "YYYY-MM-DD (Date of service, exam/study date, or statement date)",
  "dueDate": "YYYY-MM-DD (Due date if this is an unpaid bill, otherwise 'N/A')",
  "referenceNumber": "MRN, Accession #, Account #, Claim #, or Invoice # (e.g. MRN: 7054372, Accession: 24-MR-26-0004752)",
  "providerOrDoctor": "Ordering physician, doctor, specialist, or attending provider (e.g. Jeremy Brown, MD)",
  "topicOrProcedure": "Specific procedure, exam, or bill subject (e.g. MRI Spine Lumbar w/o Contrast)",
  "amountDue": "Balance due or patient responsibility (e.g. '$0.00' or '$124.50'), or 'N/A'",
  "summary": "Concise 1-sentence plain-English summary of the document contents and key findings",
  "keyFindings": ["Key finding, diagnosis, or line item 1", "Key finding 2"],
  "suggestedFilename": "Standardized filename without spaces using format YYYY-MM-DD_[LastName-FirstName]_[Type]_[Topic].pdf (e.g. 2026-08-30_Scelso-Jamie_MRI-Spine_TJSamsonHospital.pdf)",
  "targetFolder": "Format: [documentType]\\\\[YYYY]\\\\[MM] (e.g. MRI Report\\\\2026\\\\08)",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"]
}

Return ONLY the raw JSON string without markdown code block fences.`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeDocumentWithGemini(
  imageDataUrl: string | string[],
  apiKey: string,
  model: string = 'gemini-3.1-flash-lite',
  _rootFolder: string = 'Shallot-Declutter'
): Promise<ExtractedDocData> {
  // Never fabricate data if API key is missing - halt immediately to protect file accuracy
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is not configured. Please enter your key in Settings before triaging documents.');
  }

  // Normalize pages array (if single string, wrap in array)
  const rawPages = Array.isArray(imageDataUrl) ? imageDataUrl : [imageDataUrl];
  // Analyze up to 3 pages for high-fidelity multi-page document understanding (e.g. EOB summary + claim line items)
  const pagesToAnalyze = rawPages.slice(0, 3);

  const parts: any[] = [{ text: PROMPT_SYSTEM }];

  for (const page of pagesToAnalyze) {
    const mimeMatch = page.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : (page.startsWith('JVBERi') ? 'application/pdf' : 'image/jpeg');
    const base64Data = page.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  // Models to attempt (tries user choice first, then fast fallbacks on 503)
  const primaryModel = (!model || model === 'gemini-2.5-flash') ? 'gemini-3.1-flash-lite' : model;
  const candidateModels = Array.from(new Set([primaryModel, 'gemini-3.1-flash-lite', 'gemini-flash-latest']));

  let lastError: any = null;
  let responseData: any = null;

  for (const currentModel of candidateModels) {
    // Up to 2 attempts per model to ride out transient 503 high-traffic spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

        const requestBody = {
          contents: [
            {
              role: 'user',
              parts,
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
          console.warn(`Model ${currentModel} attempt ${attempt} returned status ${response.status}:`, errorText);
          lastError = new Error(`Gemini API Error (${response.status}): ${errorText}`);

          // If 503 (high demand) or 429 (rate limit), wait and retry
          if ((response.status === 503 || response.status === 429) && attempt < 2) {
            console.log(`High traffic on ${currentModel}. Retrying in 1.8s...`);
            await sleep(1800);
            continue;
          }

          // If still 503 after attempt or 404, fall through to next candidate model
          if (response.status === 503 || response.status === 404) {
            await sleep(800);
            break;
          }
          throw lastError;
        }

        responseData = await response.json();
        if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
          break; // Successfully got extraction
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) {
          await sleep(1500);
          continue;
        }
      }
    }

    if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      break;
    }
  }

  if (!responseData) {
    throw lastError || new Error('All candidate Gemini models failed to respond.');
  }

  const data = responseData;
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No response text returned from Gemini');
    }

    // Clean any accidental markdown backticks
    const cleanedJson = candidateText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleanedJson);

    const docType = parsed.documentType || 'Other';
    const statementDate = parsed.statementDate || new Date().toISOString().split('T')[0];
    const dateMatch = statementDate.match(/^(\d{4})[-/.]?(\d{2})?/);
    const yyyy = dateMatch?.[1] || new Date().getFullYear().toString();
    const mm = dateMatch?.[2] || String(new Date().getMonth() + 1).padStart(2, '0');
    const computedFolder = `${docType}/${yyyy}/${mm}`;

    const person = parsed.personOrPatient || parsed.patientOrAccount || 'N/A';

    return {
      documentType: docType,
      category: parsed.category || 'Personal',
      issuer: parsed.issuer || 'Unknown Issuer',
      personOrPatient: person,
      patientOrAccount: person,
      statementDate,
      dueDate: parsed.dueDate || 'N/A',
      referenceNumber: parsed.referenceNumber || 'N/A',
      providerOrDoctor: parsed.providerOrDoctor || 'N/A',
      topicOrProcedure: parsed.topicOrProcedure || docType,
      amountDue: parsed.amountDue || 'N/A',
      summary: parsed.summary || 'Scanned document',
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      suggestedFilename: parsed.suggestedFilename || `${statementDate}_${docType.replace(/\s+/g, '')}.pdf`,
      targetFolder: computedFolder,
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Document'],
    };
}

/**
 * Intelligent sample fallback for offline / test / no-key demo
 */
export function generateDemoDocumentAnalysis(_rootFolder?: string): ExtractedDocData {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const today = new Date().toISOString().split('T')[0];

  const samples: ExtractedDocData[] = [
    {
      documentType: 'EOB',
      issuer: 'Aetna Health',
      statementDate: today,
      patientOrAccount: 'Claim #AE-98214',
      amountDue: '$0.00 (Fully Covered)',
      summary: 'Explanation of benefits for in-network routine preventive care examination.',
      suggestedFilename: `${today}_EOB_Aetna_PreventiveExam.pdf`,
      targetFolder: `EOB/${currentYear}/${currentMonth}`,
      tags: ['Aetna', 'EOB', 'In-Network', 'Medical'],
    },
    {
      documentType: 'Medical Bill',
      issuer: 'Quest Diagnostics',
      statementDate: today,
      patientOrAccount: 'Acct #QD-44109',
      amountDue: '$38.50',
      summary: 'Outpatient diagnostic blood panel copay & lab services.',
      suggestedFilename: `${today}_MedicalBill_QuestDiagnostics_LabPanel.pdf`,
      targetFolder: `Medical Bill/${currentYear}/${currentMonth}`,
      tags: ['Quest Diagnostics', 'Lab', 'Copay', 'Medical Bill'],
    },
    {
      documentType: 'Water Bill',
      issuer: 'City Water & Sewer Authority',
      statementDate: today,
      patientOrAccount: 'Acct #WTR-882104',
      amountDue: '$54.20',
      summary: 'Monthly municipal residential water and wastewater utility statement.',
      suggestedFilename: `${today}_WaterBill_CityWater_Monthly.pdf`,
      targetFolder: `Water Bill/${currentYear}/${currentMonth}`,
      tags: ['Water Bill', 'Utilities', 'City Water', 'Residential'],
    },
    {
      documentType: 'Tax Document',
      issuer: 'Internal Revenue Service',
      statementDate: `${currentYear}-01-31`,
      patientOrAccount: 'Form 1099-INT',
      amountDue: 'N/A (Informational)',
      summary: 'Annual interest income statement for annual tax preparation.',
      suggestedFilename: `${currentYear}-01-31_TaxDocument_Form1099.pdf`,
      targetFolder: `Tax Document/${currentYear}/01`,
      tags: ['Taxes', 'IRS', '1099', 'Finance'],
    }
  ];

  const randomIndex = Math.floor(Math.random() * samples.length);
  return samples[randomIndex];
}
