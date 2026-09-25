import fs from 'fs';
import path from 'path';
import { AmcServiceReportPdfService, ServiceReportPdfData } from '../modules/amc-contracts/services/amc-service-report-pdf.service.js';

async function testReportPdfMulti() {
  const sampleData: ServiceReportPdfData = {
    reportNumber: 'SRPT/2026-27/0002',
    serviceType: 'PREVENTIVE',
    status: 'COMPLETED',
    inspectionDate: '2026-09-25T06:36:23.000Z',
    contractNumber: 'AMC/2026-27/0006',
    visitNumber: 2,
    customerName: 'Test Solar Client',
    companyName: 'Solar Grid Ltd',
    endUser: 'Solar Grid Ltd',
    amcPlan: 'Ultra Care (UC)',
    technicianName: 'Rahul Patel',
    technicianEmail: 'rahul@tanejapower.com',
    serviceSummary: 'Preventive servicing completed with routine spare replacement.',
    observations: 'All stabilizer voltage and current parameters found within standard operating thresholds.',
    recommendations: 'Regular preventive maintenance schedule to be maintained.',
    customerRemarks: 'Satisfactory preventive servicing completed.',
    equipment: [
      {
        equipmentName: 'STABILIZER AMC (Main)',
        configuration: '50 KVA 3-Phase',
        rating: '50 KVA',
        conditionStatus: 'OPERATIONAL',
        observations: 'Normal operating condition',
      },
      {
        equipmentName: 'STABILIZER AMC (Auxiliary)',
        configuration: '30 KVA 3-Phase',
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
    materials: [
      {
        productNameSnapshot: 'Carbon Brush Set 10A',
        skuSnapshot: 'CB-10A',
        quantity: '2',
        unitSnapshot: 'SET',
        materialType: 'SPARE_PART',
        coverageType: 'AMC_INCLUDED',
        remarks: 'Replaced worn brushes',
      },
      {
        productNameSnapshot: 'Micro Switch 5A 250V',
        skuSnapshot: 'MS-5A',
        quantity: '1',
        unitSnapshot: 'PCS',
        materialType: 'SPARE_PART',
        coverageType: 'AMC_INCLUDED',
        remarks: 'Limit switch replacement',
      }
    ]
  };

  const buffer = await AmcServiceReportPdfService.generatePdf(sampleData);
  const outPath = path.resolve(process.cwd(), 'test_service_report_with_materials.pdf');
  fs.writeFileSync(outPath, buffer);
  console.log('PDF generated at:', outPath, 'Size:', buffer.length);
}

testReportPdfMulti().catch(console.error);
