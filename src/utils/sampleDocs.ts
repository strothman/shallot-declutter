/**
 * Generates high-resolution realistic sample document images using Canvas
 * for immediate testing of the scanning and Gemini parsing pipeline.
 */

export function generateSampleDocumentDataUrl(
  type: 'eob' | 'bill' | 'tax'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1240; // A4 standard high-res ratio
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Paper texture
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  if (type === 'eob') {
    // Header Banner
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(80, 80, canvas.width - 160, 120);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('AETNA HEALTHCARE', 110, 135);
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText('EXPLANATION OF BENEFITS (THIS IS NOT A BILL)', 110, 175);

    // Metadata grid
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('Member Name: Jane Doe', 90, 260);
    ctx.fillText('Member ID: W849204812', 90, 300);
    ctx.fillText('Group Number: 084921', 90, 340);

    ctx.fillText('Claim Number: CLM-2026-94819', 700, 260);
    ctx.fillText('Date Processed: 03/14/2026', 700, 300);
    ctx.fillText('Provider: Northside Medical Clinic', 700, 340);

    // Table Header
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(80, 400, canvas.width - 160, 50);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('Date of Service', 100, 432);
    ctx.fillText('Service Description', 300, 432);
    ctx.fillText('Billed', 680, 432);
    ctx.fillText('Plan Discount', 820, 432);
    ctx.fillText('You Pay', 1000, 432);

    // Table Rows
    ctx.font = '19px Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('03/02/2026', 100, 490);
    ctx.fillText('99395 - Preventive Annual Exam', 300, 490);
    ctx.fillText('$285.00', 680, 490);
    ctx.fillText('-$165.00', 820, 490);
    ctx.fillText('$0.00', 1000, 490);

    ctx.fillText('03/02/2026', 100, 540);
    ctx.fillText('80061 - Routine Lipid Profile', 300, 540);
    ctx.fillText('$110.00', 680, 540);
    ctx.fillText('-$75.00', 820, 540);
    ctx.fillText('$0.00', 1000, 540);

    // Total Box
    ctx.fillStyle = '#EFF6FF';
    ctx.fillRect(650, 620, canvas.width - 730, 110);
    ctx.strokeStyle = '#93C5FD';
    ctx.strokeRect(650, 620, canvas.width - 730, 110);

    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('TOTAL PATIENT RESPONSIBILITY: $0.00', 680, 685);

    // Explanatory remarks
    ctx.fillStyle = '#64748B';
    ctx.font = '17px Arial, sans-serif';
    ctx.fillText('Remarks: Services were processed under in-network preventive care benefit coverage (100%).', 90, 800);
    ctx.fillText('Questions regarding this claim? Call Member Services at 1-800-555-0199.', 90, 830);

  } else if (type === 'bill') {
    // Quest Diagnostics Bill
    ctx.fillStyle = '#15803D';
    ctx.fillRect(80, 80, canvas.width - 160, 110);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText('QUEST DIAGNOSTICS', 110, 140);
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('PATIENT BILLING STATEMENT', 110, 170);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('Account Number: QD-9401829', 90, 260);
    ctx.fillText('Billing Date: March 10, 2026', 90, 300);
    ctx.fillText('Payment Due Upon Receipt', 90, 340);

    ctx.fillStyle = '#FEF2F2';
    ctx.fillRect(720, 230, 420, 120);
    ctx.strokeStyle = '#FCA5A5';
    ctx.strokeRect(720, 230, 420, 120);

    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('AMOUNT DUE NOW:', 740, 270);
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.fillText('$38.50', 740, 325);

    // Detail
    ctx.fillStyle = '#334155';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Service Date: 02/20/2026', 90, 440);
    ctx.fillText('Referring Physician: Dr. Sarah Jenkins, MD', 90, 480);
    ctx.fillText('Diagnostic Panel 80053: Comprehensive Metabolic Panel', 90, 520);
    ctx.fillText('Insurance adjustment applied: -$82.00', 90, 560);
    ctx.fillText('Patient coinsurance copay: $38.50', 90, 600);

  } else {
    // IRS 1099-INT Form
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText('OMB No. 1545-0112', 90, 120);
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.fillText('FORM 1099-INT  |  Interest Income 2026', 90, 175);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(90, 220, 500, 160);
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText("PAYER'S name and address:", 100, 250);
    ctx.font = '19px Arial, sans-serif';
    ctx.fillText('Chase Bank, N.A.', 100, 285);
    ctx.fillText('270 Park Avenue, New York, NY', 100, 315);

    ctx.strokeRect(630, 220, 500, 160);
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('1  Interest income:', 650, 250);
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText('$412.80', 650, 305);

    ctx.strokeRect(90, 410, 500, 140);
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText("RECIPIENT'S identification number:", 100, 440);
    ctx.fillText('XXX-XX-8491', 100, 480);

    ctx.strokeRect(630, 410, 500, 140);
    ctx.fillText('4  Federal income tax withheld:', 650, 440);
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText('$0.00', 650, 480);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}
