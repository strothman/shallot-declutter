import type { ExtractedDocData } from '../types';

const PROMPT_SYSTEM = `You are an expert document organizer and data extraction system for physical and digital paperwork, medical records, radiology/imaging reports, hospital bills, insurance EOBs, utilities, taxes, legal documents, and retail/grocery receipts.
Examine the attached document and extract comprehensive structured metadata into clean JSON.

Output MUST be a valid JSON object matching this exact schema:
{
  "documentType": "MRI Report" | "Medical Record" | "Lab Result" | "Medical Bill" | "EOB" | "Water Bill" | "Electric Bill" | "Utility Bill" | "Tax Document" | "Receipt" | "Recipe" | "Prescription" | "Insurance Policy" | "Legal Notice" | "Other",
  "category": "Medical" | "Bills & Utilities" | "Insurance" | "Taxes" | "Legal" | "Personal" | "Recipes & Cooking",
  "issuer": "Clinic, hospital, provider, utility, vendor, store, or cookbook/website name (e.g. TJ Samson Community Hospital, Kroger, or Greek Gateway)",
  "personOrPatient": "Full name of patient, account holder, customer, or loyalty card (e.g. Jamie Lynn Scelso or Kroger Plus *3756)",
  "statementDate": "YYYY-MM-DD (Date of service, exam/study date, statement date, or purchase date)",
  "dueDate": "YYYY-MM-DD (Due date if this is an unpaid bill, otherwise 'N/A')",
  "referenceNumber": "MRN, Accession #, Account #, Claim #, Invoice #, or unique receipt survey barcode / Entry ID (e.g. MRN: 7054372 or Entry ID: 024-802-98-785-502-600)",
  "providerOrDoctor": "Ordering physician, doctor, specialist, or attending provider (e.g. Jeremy Brown, MD), or 'N/A'",
  "topicOrProcedure": "Specific procedure, exam, bill subject, or shopping category (e.g. MRI Spine Lumbar w/o Contrast or Groceries)",
  "amountDue": "Balance due, patient responsibility, or total purchase balance paid (e.g. '$30.38' or '$0.00')",
  "summary": "Concise 1-sentence plain-English summary of the document contents and key findings",
  "keyFindings": ["Key finding, diagnosis, or transaction highlight 1", "Highlight 2"],
  "suggestedFilename": "Standardized filename without spaces using format YYYY-MM-DD_[LastName-FirstName_or_Store]_[Type]_[Topic].pdf (e.g. 2026-09-12_Kroger_Receipt_Groceries.pdf)",
  "targetFolder": "Format: [documentType]\\\\[YYYY]\\\\[MM] (e.g. Receipt\\\\2026\\\\09)",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],

  "receiptDetails": {
    "store": {
      "name": "Store name (e.g. Kroger)",
      "storeNumber": "Store or division # if present",
      "address": "Store street address if printed (e.g. 4915 Dixie Highway)",
      "phone": "Store phone number if printed (e.g. (502)448-8215)",
      "registerNumber": "Terminal or register lane # (e.g. CHEC 502)"
    },
    "transaction": {
      "time": "Transaction time in HH:MM or HH:MM AM/PM format (e.g. 16:06 or 04:06PM)",
      "paymentMethod": "Payment type and masked card (e.g. US DEBIT *1874)",
      "cardLast4": "Last 4 digits of payment card (e.g. 1874)",
      "authCode": "Approval, reference, or auth # (e.g. 050704)",
      "aid": "EMV Application ID if present",
      "tc": "EMV Transaction Certificate if present",
      "itemsSold": 15
    },
    "financials": {
      "subtotal": 29.96,
      "tax": 0.42,
      "total": 30.38,
      "totalSavings": 9.49,
      "savingsPercentage": "24%",
      "coupons": 9.49,
      "cashback": 0.00,
      "annualSavingsYTD": 1408.85
    },
    "rewards": {
      "loyaltyCardLast4": "Loyalty card digits (e.g. 3756)",
      "fuelPointsEarned": 30,
      "fuelPointsMonthTotal": 877,
      "fuelPointsPriorRemaining": 287,
      "communityPartner": "Community rewards recipient if printed (e.g. Eisenhower Elementary)",
      "surveyEntryId": "Survey or barcode lookup number at bottom of receipt (e.g. 024-802-98-785-502-600)",
      "feedbackUrl": "www.kroger.com/feedback"
    },
    "lineItems": [
      {
        "name": "Clean item name (e.g. Kroger Pizza Sauce)",
        "rawText": "Exact text from receipt line (e.g. KRO PIZZA SAUCE 1.39 F)",
        "price": 1.39,
        "quantity": 1,
        "totalPrice": 1.39,
        "discount": 0.00,
        "discountDescription": "Description of any promo/coupon modifying this item, or empty string",
        "taxFlag": "F (Food) or B (Beverage) or T (Taxable) or N (Non-taxable)",
        "category": "Pantry" | "Produce" | "Dairy" | "Meat" | "Beverages" | "Snacks" | "Bakery" | "Frozen" | "Household" | "Personal Care" | "Health" | "Other"
      }
    ]
  }
}

SPECIAL RULES FOR RECEIPTS (Grocery & Retail):
1. If the document is a receipt (such as Kroger, Walmart, Target, Costco, etc.):
   - Populate "documentType": "Receipt"
   - Populate "category": "Personal"
   - Under "referenceNumber": ALWAYS extract the unique receipt identifier (such as Kroger Entry ID: 024-802-98-785-502-600, barcode number, or transaction REF#). This is critical for deduplication.
   - Populate "receiptDetails" with the complete itemized breakdown of EVERY line item purchased, including discounts/coupons (e.g. Mega Event Savings, Buy-X-Get-Y) paired with their corresponding items, tax flags, totals, store location, and loyalty/fuel points.
2. If the document is NOT a receipt (e.g. MRI, medical bill, tax form, recipe), omit "receiptDetails" or set it to null.

SPECIAL RULES FOR RECIPES & COOKING:
1. If the document is a recipe, cooking/baking instructions, ingredient list, culinary guide, or meal preparation page:
   - Populate "documentType": "Recipe"
   - Populate "category": "Recipes & Cooking"
   - Populate "issuer": Source website, cookbook title, blog, or author (e.g. "Greek Gateway", "Allrecipes", "NYT Cooking")
   - Populate "personOrPatient": Chef, author, or "N/A"
   - Populate "topicOrProcedure": The full title of the recipe or dish (e.g. "Greek Tiropita Cheese Pie Spiral Recipe")
   - Populate "amountDue": "$0.00"
   - Populate "referenceNumber": "N/A"
   - Populate "keyFindings": 2-4 concise bullet points detailing:
     * Key ingredients and measurements (e.g. "Requires phyllo dough, Greek feta cheese, eggs, and unsalted butter")
     * Oven temperature, baking/cooking time, and prep time (e.g. "Baked at 350°F for 30-35 minutes until golden and crispy")
     * Important culinary techniques, servings/yield, or tips
   - Populate "summary": Concise 1-sentence summary of the dish and cooking method
   - Populate "suggestedFilename": "YYYY-MM-DD_[Issuer]_[DishNameClean].pdf" (e.g. "2015-05-03_GreekGateway_Recipe_GreekTiropita.pdf")
   - Populate "targetFolder": "Recipe\\\\YYYY\\\\MM" (e.g. "Recipe\\\\2015\\\\05")
   - Populate "tags": ["Recipe", "Cooking", "[Cuisine]", "[DishType]"] (e.g. ["Recipe", "Greek", "Baking", "Cheese", "Phyllo"])

Return ONLY the raw JSON string without markdown code block fences.`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeDocumentWithGemini(
  imageDataUrl: string | string[],
  apiKey: string,
  model: string = 'gemini-3.5-flash-lite',
  _rootFolder: string = 'Shallot-Declutter',
  onProgress?: (step: string, percent: number) => void
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

  // High-performance models in prioritized order (gemini-3.5-flash-lite is 17x faster with zero 503s)
  const userModel = (!model || model === 'gemini-2.5-flash' || model === 'gemini-3.1-flash-lite')
    ? 'gemini-3.5-flash-lite'
    : model;

  const candidateModels = Array.from(new Set([
    userModel,
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
  ]));

  let lastError: any = null;
  let responseData: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    const nextModel = candidateModels[mIdx + 1];

    onProgress?.(`Extracting personal data points (${currentModel})...`, 80 + Math.min(15, mIdx * 4));

    // Up to 2 attempts per model with short backoff to bypass transient spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s hard timeout per attempt to avoid hanging

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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Model ${currentModel} attempt ${attempt} returned status ${response.status}:`, errorText);
          lastError = new Error(`Gemini API Error (${response.status}): ${errorText}`);

          // If 503 (high demand) or 429 (rate limit), notify user and retry or fallback
          if ((response.status === 503 || response.status === 429) && attempt < 2) {
            onProgress?.(`High traffic on ${currentModel} (503). Retrying in 1s...`, 84);
            await sleep(1000);
            continue;
          }

          // If still 503 or 429 after attempt, immediately fail over to next model
          if (response.status === 503 || response.status === 429 || response.status === 404) {
            if (nextModel) {
              onProgress?.(`Model busy. Switching to backup (${nextModel})...`, 86);
            }
            await sleep(500);
            break;
          }
          throw lastError;
        }

        responseData = await response.json();
        if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
          onProgress?.('Personal data points extracted successfully!', 96);
          break; // Successfully got extraction
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.name === 'AbortError') {
          console.warn(`Model ${currentModel} timed out after 12s.`);
          onProgress?.(`Model ${currentModel} timed out. Trying backup model...`, 86);
          break;
        }
        if (attempt < 2) {
          await sleep(1000);
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

    // Defensively parse and normalize receipt details (handles camelCase and snake_case)
    const rawReceipt = parsed.receiptDetails || parsed.receipt_details || parsed.receipt;
    let receiptDetails = undefined;
    if (rawReceipt && typeof rawReceipt === 'object') {
      const rawLineItems = Array.isArray(rawReceipt.lineItems)
        ? rawReceipt.lineItems
        : (Array.isArray(rawReceipt.line_items) ? rawReceipt.line_items : (Array.isArray(rawReceipt.items) ? rawReceipt.items : []));

      receiptDetails = {
        store: rawReceipt.store || { name: parsed.issuer || 'Kroger' },
        transaction: rawReceipt.transaction || {},
        financials: rawReceipt.financials || { total: parseFloat(parsed.amountDue?.replace(/[^0-9.]/g, '') || '0') },
        rewards: rawReceipt.rewards || {},
        lineItems: rawLineItems.map((li: any) => ({
          name: li.name || li.description || li.item || 'Item',
          rawText: li.rawText || li.raw_text || '',
          price: typeof li.price === 'number' ? li.price : parseFloat(String(li.price || '0').replace(/[^0-9.]/g, '') || '0'),
          quantity: li.quantity || 1,
          totalPrice: typeof li.totalPrice === 'number' ? li.totalPrice : (typeof li.total_price === 'number' ? li.total_price : (typeof li.price === 'number' ? li.price : 0)),
          discount: typeof li.discount === 'number' ? li.discount : 0,
          discountDescription: li.discountDescription || li.discount_description || '',
          taxFlag: li.taxFlag || li.tax_flag || 'F',
          category: li.category || 'Other',
        })),
      };
    }

    return {
      documentType: docType,
      category: parsed.category || (docType === 'Receipt' ? 'Personal' : (docType === 'Recipe' ? 'Recipes & Cooking' : 'Personal')),
      issuer: parsed.issuer || (docType === 'Receipt' ? 'Kroger' : (docType === 'Recipe' ? 'Cookbook / Recipe' : 'Unknown Issuer')),
      personOrPatient: person,
      patientOrAccount: person,
      statementDate,
      dueDate: parsed.dueDate || 'N/A',
      referenceNumber: parsed.referenceNumber || 'N/A',
      providerOrDoctor: parsed.providerOrDoctor || 'N/A',
      topicOrProcedure: parsed.topicOrProcedure || (docType === 'Receipt' ? 'Groceries' : docType),
      amountDue: parsed.amountDue || 'N/A',
      summary: parsed.summary || 'Scanned document',
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      suggestedFilename: parsed.suggestedFilename || `${statementDate}_${docType.replace(/\s+/g, '')}.pdf`,
      targetFolder: computedFolder,
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Document'],
      receiptDetails,
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
      documentType: 'Receipt',
      category: 'Personal',
      issuer: 'Kroger (4915 Dixie Hwy)',
      personOrPatient: 'Kroger Plus *3756',
      statementDate: today,
      referenceNumber: '024-802-98-785-502-600',
      amountDue: '$30.38',
      summary: 'Kroger grocery purchase: 15 items totaling $30.38. Saved $9.49 (24%) via Mega Event & B2G1 promotions.',
      keyFindings: [
        '15 items sold ($30.38 total, $0.42 tax)',
        'Saved $9.49 (24%) with Kroger Plus & Mega Event promotions',
        '30 fuel points earned (September monthly total: 877)',
        'Paid via US DEBIT ending in *1874 (REF# 050704)',
        'Community donation directed to Eisenhower Elementary',
      ],
      suggestedFilename: `${today}_Kroger_Receipt_Groceries.pdf`,
      targetFolder: `Receipt/${currentYear}/${currentMonth}`,
      tags: ['Kroger', 'Groceries', 'Food', 'Fuel Points', 'Dixie Hwy'],
      receiptDetails: {
        store: {
          name: 'Kroger',
          address: '4915 Dixie Highway',
          phone: '(502)448-8215',
          registerNumber: 'CHEC 502',
        },
        transaction: {
          time: '16:06',
          paymentMethod: 'US DEBIT *1874',
          cardLast4: '1874',
          authCode: '050704',
          aid: 'A0000000980840',
          tc: 'CB67D5284B2408A1',
          itemsSold: 15,
        },
        financials: {
          subtotal: 29.96,
          tax: 0.42,
          total: 30.38,
          totalSavings: 9.49,
          savingsPercentage: '24%',
          coupons: 9.49,
          cashback: 0.0,
          annualSavingsYTD: 1408.85,
        },
        rewards: {
          loyaltyCardLast4: '3756',
          fuelPointsEarned: 30,
          fuelPointsMonthTotal: 877,
          fuelPointsPriorRemaining: 287,
          communityPartner: 'Eisenhower Elementary',
          surveyEntryId: '024-802-98-785-502-600',
          feedbackUrl: 'www.kroger.com/feedback',
        },
        lineItems: [
          { name: 'Kroger Pizza Sauce', rawText: 'KRO PIZZA SAUCE 1.39 F', price: 1.39, quantity: 1, totalPrice: 1.39, taxFlag: 'F', category: 'Pantry' },
          { name: 'Kroger Pizza Sauce', rawText: 'KRO PIZZA SAUCE 1.39 F', price: 1.39, quantity: 1, totalPrice: 1.39, taxFlag: 'F', category: 'Pantry' },
          { name: 'Kroger Spicy Red Pepper', rawText: 'KRO SPICY RED PEP 1.04 F', price: 1.04, quantity: 1, totalPrice: 1.04, taxFlag: 'F', category: 'Pantry' },
          { name: 'Kroger Pizza Sauce', rawText: 'KRO PIZZA SAUCE 1.39 F', price: 1.39, quantity: 1, totalPrice: 1.39, taxFlag: 'F', category: 'Pantry' },
          { name: 'Kroger Spicy Red Pepper', rawText: 'KRO SPICY RED PEP 1.04 F', price: 1.04, quantity: 1, totalPrice: 1.04, taxFlag: 'F', category: 'Pantry' },
          { name: 'Monster Energy Drink', rawText: 'MONSTER ENERGY 3.49 B', price: 3.49, quantity: 1, totalPrice: 3.49, taxFlag: 'B', category: 'Beverages' },
          { name: 'Monster Juice Energy', rawText: 'MONSTER JUICE ENRG 3.49 B', price: 3.49, quantity: 1, totalPrice: 3.49, taxFlag: 'B', category: 'Beverages' },
          { name: 'Monster Juice Energy (B2G1 Free)', rawText: 'MONSTER JUICE ENRG 0.00 B', price: 3.49, quantity: 1, totalPrice: 0.0, discount: 3.49, discountDescription: 'B2G1 Beverages', taxFlag: 'B', category: 'Beverages' },
          { name: 'Pepperidge Farm Goldfish', rawText: 'PFRM GOLDFISH 1.99 F', price: 1.99, quantity: 1, totalPrice: 0.99, discount: 1.0, discountDescription: 'Mega Event Savings', taxFlag: 'F', category: 'Snacks' },
          { name: 'Pepperidge Farm Goldfish', rawText: 'PFRM GOLDFISH 1.99 F', price: 1.99, quantity: 1, totalPrice: 0.99, discount: 1.0, discountDescription: 'Mega Event Savings', taxFlag: 'F', category: 'Snacks' },
          { name: 'Goldfish Ranch Crackers', rawText: 'GLDFSH RANCH 1.99 F', price: 1.99, quantity: 1, totalPrice: 0.99, discount: 1.0, discountDescription: 'Mega Event Savings', taxFlag: 'F', category: 'Snacks' },
          { name: 'Pepperidge Farm Goldfish', rawText: 'PFRM GOLDFISH 1.99 F', price: 1.99, quantity: 1, totalPrice: 0.99, discount: 1.0, discountDescription: 'Mega Event Savings', taxFlag: 'F', category: 'Snacks' },
          { name: 'Pepperidge Farm Goldfish', rawText: 'PFRM GOLDFISH 1.99 F', price: 1.99, quantity: 1, totalPrice: 0.99, discount: 1.0, discountDescription: 'Mega Event Savings', taxFlag: 'F', category: 'Snacks' },
          { name: 'Pepperidge Farm Goldfish', rawText: 'PFRM GOLDFISH 1.99 F', price: 1.99, quantity: 1, totalPrice: 0.99, discount: 1.0, discountDescription: 'Mega Event Savings', taxFlag: 'F', category: 'Snacks' },
          { name: 'Romaine Hearts Lettuce', rawText: 'ROMAINE HEARTS 4.79 F', price: 4.79, quantity: 1, totalPrice: 4.79, taxFlag: 'F', category: 'Produce' },
        ],
      },
    },
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

/**
 * Uses Gemini multimodal vision to detect the printed page number or logical sequence
 * of multi-page documents (e.g. "Page 1 of 8", "1/8", or natural document flow).
 * Returns an array of 0-based indices representing the sorted order.
 */
export async function detectDocumentPageOrder(
  pages: string[],
  apiKey: string,
  model: string = 'gemini-3.5-flash-lite'
): Promise<number[]> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required to detect page order.');
  }

  if (pages.length <= 1) {
    return pages.map((_, i) => i);
  }

  const promptText = `You are a document sequencing assistant.
You are provided with ${pages.length} images of document pages. They may be out of order.
For EACH image provided (indices 0 to ${pages.length - 1}):
1. Inspect the image closely for printed page numbers (e.g. "Page 1 of 8", "1 of 8", "Page 2", "p. 1", header/footer page numbers).
2. If explicit page numbers are printed, use them to order the pages starting from Page 1 to the final page.
3. If page numbers are not printed, infer the natural reading order (e.g. cover/title notice first, followed by claim summaries, followed by detailed line items and instructions).

Return ONLY a JSON array of the 0-based indices in their correct sorted order.
For example, if you have 4 images and:
- image 3 is Page 1
- image 1 is Page 2
- image 0 is Page 3
- image 2 is Page 4
You must return:
[3, 1, 0, 2]

Output ONLY the raw JSON array of integers, with no explanation or markdown code block fences.`;

  const parts: any[] = [{ text: promptText }];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const mimeMatch = page.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = page.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  const userModel = (!model || model === 'gemini-2.5-flash' || model === 'gemini-3.1-flash-lite')
    ? 'gemini-3.5-flash-lite'
    : model;

  const candidateModels = Array.from(new Set([
    userModel,
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
  ]));

  for (const currentModel of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleaned = rawText
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();

      const match = cleaned.match(/\[[\d\s,]+\]/);
      if (!match) continue;

      const parsed: number[] = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length === pages.length) {
        const indexSet = new Set(parsed);
        const allPresent = pages.every((_, i) => indexSet.has(i));
        if (allPresent) {
          return parsed;
        }
      }
    } catch {
      // Try next candidate model
    }
  }

  throw new Error('Unable to determine page order automatically. Please use the arrow buttons to arrange pages.');
}

