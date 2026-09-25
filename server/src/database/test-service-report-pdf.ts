import fs from 'fs';
import path from 'path';
import { AmcServiceReportPdfService, ServiceReportPdfData } from '../modules/amc-contracts/services/amc-service-report-pdf.service.js';

async function testReportPdf() {
  const sampleData: ServiceReportPdfData = {
    reportNumber: 'SRPT/2026-27/0001',
    serviceType: 'PREVENTIVE',
    status: 'DRAFT',
    inspectionDate: '2026-09-25T06:36:23.000Z',
    contractNumber: 'AMC/2026-27/0006',
    visitNumber: 1,
    customerName: 'Test Solar Client',
    companyName: 'Solar Grid Ltd',
    endUser: 'Solar Grid Ltd',
    amcPlan: 'Ultra Care (UC)',
    technicianName: 'Rahul Patel',
    technicianEmail: 'rahul@tanejapower.com',
    serviceSummary: 'All stabilizer voltage and current parameters found within standard operating thresholds.',
    observations: 'All stabilizer voltage and current parameters found within standard operating thresholds.',
    recommendations: 'Regular preventive maintenance schedule to be maintained.',
    customerRemarks: 'Satisfactory preventive servicing completed.',
    equipment: [
      {
        equipmentName: 'STABILIZER AMC',
        configuration: '50 KVA',
        rating: '30 KVA',
        conditionStatus: 'OPERATIONAL',
        observations: 'Normal operating condition',
      }
    ],
    checklist: [
      { scopeDescription: 'Servicing of Stabilizer', status: 'COMPLETED', remarks: 'Checked and found satisfactory' },
      { scopeDescription: 'Check Input & Output Voltage Variation', status: 'COMPLETED', remarks: 'Checked and found satisfactory' },
      { scopeDescription: 'Check Input Current & Output Current', status: 'COMPLETED', remarks: 'Checked and found satisfactory' },
      { scopeDescription: 'Auto & Manual Facility Check', status: 'COMPLETED', remarks: 'Checked and found satisfactory' },
      { scopeDescription: 'Check Motor Condition', status: 'COMPLETED', remarks: 'Checked and found satisfactory' },
      { scopeDescription: 'Check Cut Off Switch & Display', status: 'COMPLETED', remarks: 'Checked and found satisfactory' },
    ],
  };

  const buffer = await AmcServiceReportPdfService.generatePdf(sampleData);
  const outPath = path.resolve(process.cwd(), 'test_service_report.pdf');
  fs.writeFileSync(outPath, buffer);
  console.log('PDF generated at:', outPath, 'Size:', buffer.length);
}

testReportPdf().catch(console.error);
