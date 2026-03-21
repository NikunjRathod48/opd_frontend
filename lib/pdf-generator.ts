import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient, OPDVisit, Appointment } from '@/context/data-context';

export const generatePatientPDF = (patient: Patient, visits: OPDVisit[], appointments: Appointment[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("MedCore", 20, 20); // Logo/Name

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Medical Record Report", 20, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 20, 20, { align: 'right' });

    // --- Patient Details ---
    const startY = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Information", 20, startY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200, 200, 200);
    doc.line(20, startY + 2, pageWidth - 20, startY + 2); // Divider

    // Grid Layout for Info
    doc.text(`Name: ${patient.patientname}`, 20, startY + 10);
    doc.text(`Patient ID: ${patient.patient_no}`, 120, startY + 10);

    doc.text(`Age/Gender: ${patient.age} / ${patient.gender}`, 20, startY + 18);
    doc.text(`Blood Group: ${patient.bloodgroupName || 'N/A'}`, 120, startY + 18);

    doc.text(`Contact: ${patient.contact || 'N/A'}`, 20, startY + 26);
    doc.text(`Registered: ${patient.registrationdate}`, 120, startY + 26);

    // --- Section 1: Diagnosis History (OPD) ---
    let currentY = startY + 40;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Diagnosis History", 20, currentY);

    // prepare table data
    const visitRows = visits.map(v => [
        new Date(v.visitdatetime).toLocaleDateString(),
        v.diagnosis || "Regular Checkup",
        v.doctorName,
        v.status,
        v.notes || "-"
    ]);

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Diagnosis', 'Doctor', 'Status', 'Notes']],
        body: visitRows as any,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            4: { cellWidth: 60 } // Notes column wider
        }
    });

    // --- Section 2: Appointments ---
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 20; // Get Y after previous table

    // Check if new page needed
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Appointment History", 20, currentY);

    const appointmentRows = appointments.map(a => [
        new Date(a.appointmentdatetime).toLocaleString(),
        a.doctorName,
        a.type || "General",
        a.status
    ]);

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Date & Time', 'Doctor', 'Type', 'Status']],
        body: appointmentRows as any,
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99], textColor: 255 }, // Gray header
        styles: { fontSize: 9, cellPadding: 3 }
    });

    // Save
    doc.save(`${patient.patientname.replace(/\s+/g, '_')}_MedicalRecord.pdf`);
};
