import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Patient, OPDVisit, Appointment, Receipt } from '@/context/data-context';


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

// ─── Type Definition ──────────────────────────────────────────────────────────
interface ReceiptItem {
    description?: string;
    qty?: number;
    rate?: number;
    amount?: number;
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export const downloadInvoicePDF = async (r: Receipt): Promise<void> => {

    // ── Document Setup ──────────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = doc.internal.pageSize.getWidth();   // 210
    const PH = doc.internal.pageSize.getHeight();  // 297
    const M = 14; // margin

    // ── Palette (all inside function) ───────────────────────────────────────────
    const C = {
        navy: [10, 32, 72] as [number, number, number],
        navyMid: [22, 58, 110] as [number, number, number],
        navyLight: [44, 86, 151] as [number, number, number],
        gold: [190, 148, 60] as [number, number, number],
        goldLight: [220, 185, 105] as [number, number, number],
        teal: [12, 131, 130] as [number, number, number],
        tealLight: [180, 230, 228] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        offWhite: [252, 253, 255] as [number, number, number],
        panelBg: [244, 247, 253] as [number, number, number],
        border: [205, 215, 232] as [number, number, number],
        textDark: [30, 42, 62] as [number, number, number],
        textMid: [85, 100, 125] as [number, number, number],
        textLight: [150, 165, 190] as [number, number, number],
        altRow: [240, 245, 253] as [number, number, number],
        green: [34, 120, 80] as [number, number, number],
        greenLight: [220, 245, 233] as [number, number, number],
        red: [185, 38, 38] as [number, number, number],
        redLight: [253, 230, 230] as [number, number, number],
        amber: [160, 110, 20] as [number, number, number],
        amberLight: [255, 243, 215] as [number, number, number],
    };

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const setFill = (...c: number[]) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (...c: number[]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setColor = (...c: number[]) => doc.setTextColor(c[0], c[1], c[2]);
    const rect = (x: number, y: number, w: number, h: number, s = "F") => doc.rect(x, y, w, h, s);
    const rRect = (x: number, y: number, w: number, h: number, r: number, s = "F") => doc.roundedRect(x, y, w, h, r, r, s);
    const line = (x1: number, y1: number, x2: number, y2: number) => doc.line(x1, y1, x2, y2);
    const bold = (size: number) => { doc.setFont("helvetica", "bold"); doc.setFontSize(size); };
    const normal = (size: number) => { doc.setFont("helvetica", "normal"); doc.setFontSize(size); };
    const italic = (size: number) => { doc.setFont("helvetica", "italic"); doc.setFontSize(size); };

    const txt = (
        text: string, x: number, y: number,
        opts?: { align?: "left" | "center" | "right"; maxWidth?: number; angle?: number }
    ) => {
        (doc as any).text(text, x, y, opts);
    };

    const inr = (n: number, decimals = 2) =>
        `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

    const fmtDate = (d?: string | Date) => {
        if (!d) return "-";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
        });
    };

    // ── Data Extraction ─────────────────────────────────────────────────────────
    const subtotal = Number(r.subtotalamount) || 0;
    const tax = Number(r.taxamount) || 0;
    const discount = Number(r.discountamount) || 0;
    const total = Number(r.totalamount) || 0;
    const paid = Number(r.paidamount) || 0;
    const balance = Math.max(0, total - paid);
    const taxRate = subtotal > 0 ? +((tax / subtotal) * 100).toFixed(1) : 0;

    const statusStr = r.status || (balance > 0 ? "Pending" : "Paid");

    let badgeColor = C.green;
    let badgeBg = C.greenLight;
    let statusDisplay = statusStr.toUpperCase();
    if (statusStr === "Paid") {
        badgeColor = C.green; badgeBg = C.greenLight;
    } else if (statusStr === "Insurance Pending") {
        badgeColor = C.amber; badgeBg = C.amberLight;
    } else if (balance > 0) {
        badgeColor = C.red; badgeBg = C.redLight;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 1. DECORATIVE WATERMARK
    // ════════════════════════════════════════════════════════════════════════════
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.03 }));
    bold(68);
    setColor(...C.navy);
    txt(
        (r.hospitalName || "HOSPITAL").toUpperCase().slice(0, 14),
        PW / 2, PH / 2 + 10,
        { align: "center", angle: 38 }
    );
    doc.restoreGraphicsState();

    // ════════════════════════════════════════════════════════════════════════════
    // 2. HEADER — multi-layer premium band
    // ════════════════════════════════════════════════════════════════════════════
    const HDR = 46;

    // Deep navy base
    setFill(...C.navy);
    rect(0, 0, PW, HDR);

    // Diagonal accent stripe (pure geometry)
    setFill(...C.navyMid);
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.5 }));
    // Slanted stripe via two triangles forming a trapezoid
    doc.triangle(PW * 0.55, 0, PW, 0, PW, HDR, "F");
    doc.triangle(PW * 0.55, 0, PW, HDR, PW * 0.72, HDR, "F");
    doc.restoreGraphicsState();

    // Top gold hairline
    setFill(...C.gold);
    rect(0, 0, PW, 2.2);

    // Bottom gold hairline
    setFill(...C.gold);
    rect(0, HDR - 2, PW, 2);

    // Subtle dot cluster (decorative) top-right
    setFill(...C.goldLight);
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.18 }));
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
            doc.circle(PW - 8 - i * 5, 6 + j * 5, 0.9, "F");
        }
    }
    doc.restoreGraphicsState();

    // ── Cross / Plus medical icon (decorative, top-left area) ──────────────────
    const iconX = M + 2, iconY = 9, iconS = 5;
    setFill(...C.gold);
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.7 }));
    rect(iconX - iconS * 0.2, iconY, iconS * 0.4, iconS);          // vertical
    rect(iconX, iconY + iconS * 0.3, iconS, iconS * 0.4);          // horizontal
    doc.restoreGraphicsState();

    // Hospital Name
    setColor(...C.white);
    bold(19);
    txt(r.hospitalName || "CITY GENERAL HOSPITAL", M + 10, 15);

    // Tagline
    setColor(185, 205, 240);
    italic(7.8);
    txt("Committed to Excellence in Patient Care", M + 10, 21.5);

    // Separator micro-line
    setFill(...C.goldLight);
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.4 }));
    rect(M + 10, 23.5, 52, 0.5);
    doc.restoreGraphicsState();

    // Address / Contact
    normal(7.2);
    setColor(175, 198, 235);
    txt(r.hospitalAddress || "123 Health Avenue, Medical District, City — 380001", M + 10, 29);
    txt(
        [
            r.hospitalContact ? `✆ ${r.hospitalContact}` : null,
            r.hospitalEmail ? `✉ ${r.hospitalEmail}` : null,
        ].filter(Boolean).join("   |   "),
        M + 10, 35
    );

    // GSTIN / Reg badge (right side)
    const badgeRX = PW - M;
    bold(6.5);
    setColor(195, 215, 245);
    txt("REG. NO.", badgeRX, 27, { align: "right" });
    bold(8);
    setColor(...C.goldLight);
    txt("MH-2024-00123", badgeRX, 33, { align: "right" });
    normal(6);
    setColor(175, 198, 235);
    txt("GSTIN: 27AABCH1234A1Z5", badgeRX, 38.5, { align: "right" });

    // ── Document Type Banner ────────────────────────────────────────────────────
    const BANNER_Y = HDR;
    const BANNER_H = 10;
    setFill(...C.teal);
    rect(0, BANNER_Y, PW, BANNER_H);

    // Left accent block
    setFill(...C.gold);
    rect(0, BANNER_Y, 4, BANNER_H);

    // Right accent block
    setFill(...C.gold);
    rect(PW - 4, BANNER_Y, 4, BANNER_H);

    bold(9.5);
    setColor(...C.white);
    txt("TAX INVOICE  /  RECEIPT", PW / 2, BANNER_Y + 6.8, { align: "center" });

    // Letter-spacing dots
    normal(7);
    setColor(180, 230, 225);
    txt("-", PW / 2 - 40, BANNER_Y + 6.5, { align: "center" });
    txt("-", PW / 2 + 40, BANNER_Y + 6.5, { align: "center" });

    // ════════════════════════════════════════════════════════════════════════════
    // 3. INFO PANELS — Patient | Bill | Doctor
    // ════════════════════════════════════════════════════════════════════════════
    const PANEL_Y = BANNER_Y + BANNER_H + 7;
    const PANEL_H = 36;
    const COL_W = (PW - M * 2 - 8) / 3;   // three equal columns
    const COL_GAP = 4;

    const drawInfoPanel = (
        label: string,
        fields: { key: string; val: string }[],
        x: number,
        accentColor: [number, number, number]
    ) => {
        // Shadow layer
        setFill(200, 210, 230);
        doc.saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.3 }));
        rRect(x + 0.8, PANEL_Y + 0.8, COL_W, PANEL_H, 2.5);
        doc.restoreGraphicsState();

        // Panel body
        setFill(...C.panelBg);
        setDraw(...C.border);
        doc.setLineWidth(0.25);
        rRect(x, PANEL_Y, COL_W, PANEL_H, 2.5, "FD");

        // Accent left stripe
        setFill(...accentColor);
        rect(x, PANEL_Y + 3, 3, PANEL_H - 6);
        // round the ends manually
        doc.circle(x + 1.5, PANEL_Y + 3.2, 1.5, "F");
        doc.circle(x + 1.5, PANEL_Y + PANEL_H - 3.2, 1.5, "F");

        // Header label
        bold(7);
        setColor(...accentColor);
        txt(label.toUpperCase(), x + 6, PANEL_Y + 6.5);

        // Hairline under header
        setDraw(...C.border);
        doc.setLineWidth(0.3);
        line(x + 6, PANEL_Y + 8.5, x + COL_W - 4, PANEL_Y + 8.5);

        // Fields
        let fy = PANEL_Y + 14;
        const KEY_W = 20;
        for (const { key, val } of fields) {
            bold(6.8);
            setColor(...C.textMid);
            txt(key, x + 6, fy);
            normal(7.2);
            setColor(...C.textDark);
            const truncated = doc.splitTextToSize(val, COL_W - KEY_W - 6)[0] || val;
            txt(truncated, x + 6 + KEY_W, fy);
            fy += 6.8;
        }
    };

    // Patient Details
    drawInfoPanel(
        "Patient Details",
        [
            { key: "Name :", val: r.patientName || "Walk-in Patient" },
            { key: "ID :", val: r.patientid || "N/A" },
            { key: "Age :", val: r.patientAge ? r.patientAge.toString() : "N/A" },
            { key: "Gender :", val: r.patientGender || "N/A" },
        ],
        M,
        C.teal
    );

    // Bill Details
    drawInfoPanel(
        "Bill Details",
        [
            { key: "Bill No :", val: r.receiptnumber || "-" },
            { key: "Date :", val: fmtDate(r.receiptdate) },
            { key: "OPD Ref :", val: r.opdid?.toString() || "-" },
            { key: "Status :", val: statusStr },
        ],
        M + COL_W + COL_GAP,
        C.navyLight
    );

    // Clinical Details
    drawInfoPanel(
        "Clinical Details",
        [
            { key: "Doctor :", val: r.doctorName || "Consulting Physician" },
            { key: "Ref No :", val: r.opdid?.toString() || "-" },
            { key: "Type :", val: "Outpatient" },
        ],
        M + (COL_W + COL_GAP) * 2,
        C.gold
    );

    // ════════════════════════════════════════════════════════════════════════════
    // 4. ITEMS TABLE
    // ════════════════════════════════════════════════════════════════════════════
    const TABLE_Y = PANEL_Y + PANEL_H + 9;

    // Section label
    bold(7.5);
    setColor(...C.navy);
    txt("SERVICES  &  CHARGES", M, TABLE_Y - 2);
    setFill(...C.gold);
    rect(M, TABLE_Y, 28, 0.7);

    autoTable(doc, {
        startY: TABLE_Y + 4,
        margin: { left: M, right: M },
        head: [["#", "Description of Service / Item", "Qty", "Unit Rate (Rs.)", "Amount (Rs.)"]],
        body: (r.items || []).map((item, idx) => [
            idx + 1,
            item.description || "-",
            item.qty ?? 1,
            {
                content: (item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
                styles: { halign: "right" as const },
            },
            {
                content: (item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
                styles: { halign: "right" as const },
            },
        ]),
        theme: "grid",
        headStyles: {
            fillColor: C.navy,
            textColor: C.white,
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: { top: 4.5, bottom: 4.5, left: 4, right: 4 },
            lineColor: C.navy,
            lineWidth: 0,
            halign: "left",
        },
        alternateRowStyles: { fillColor: C.altRow },
        styles: {
            font: "helvetica",
            fontSize: 8.5,
            textColor: C.textDark,
            lineColor: C.border,
            lineWidth: 0.25,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 14, halign: "center" },
            3: { cellWidth: 34, halign: "right" },
            4: { cellWidth: 36, halign: "right", fontStyle: "bold" },
        },
        // Custom row rendering — gold accent on last row
        didParseCell: (data) => {
            if (data.section === "head" && data.column.index === 4) {
                data.cell.styles.halign = "right";
            }
        },
    });

    // ════════════════════════════════════════════════════════════════════════════
    // 5. SUMMARY BOX + QR
    // ════════════════════════════════════════════════════════════════════════════
    const FINAL_Y = (doc as any).lastAutoTable.finalY;
    const SEC_Y = FINAL_Y + 10;

    // — Summary dimensions —
    const SUM_W = 86;
    const SUM_X = PW - M - SUM_W;
    const LX = SUM_X + 5;
    const VX = SUM_X + SUM_W - 5;

    // Pre-calculate rows so box height is deterministic
    const ROW = 7.5;
    const HDR_SH = 8;  // header stripe
    const GT_SH = 11; // grand total stripe
    const BADGE_SH = 10; // status badge height
    const PAD_TOP = 6;
    const PAD_BOT = 6;

    const rows: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[] = [
        { label: "Subtotal", value: inr(subtotal) },
        { label: taxRate > 0 ? `GST / Tax (${taxRate}%)` : "Tax", value: inr(tax) },
    ];
    if (discount > 0) {
        rows.push({ label: "Discount", value: `- ${inr(discount)}`, color: C.green });
    }
    rows.push({ label: "Amount Paid", value: inr(paid) });
    rows.push({
        label: "Balance Due",
        value: inr(balance),
        bold: true,
        color: balance > 0 ? C.red : C.green,
    });

    // Height: header + rows + separator + grand total stripe + badge + padding
    const SUM_H =
        HDR_SH + PAD_TOP +
        rows.length * ROW + 5 +    // rows + separator
        GT_SH + 4 +                // grand total
        BADGE_SH + PAD_BOT;

    // Shadow
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.25 }));
    setFill(190, 205, 230);
    rRect(SUM_X + 1.2, SEC_Y + 1.2, SUM_W, SUM_H, 3);
    doc.restoreGraphicsState();

    // Box bg
    setFill(...C.offWhite);
    setDraw(...C.border);
    doc.setLineWidth(0.3);
    rRect(SUM_X, SEC_Y, SUM_W, SUM_H, 3, "FD");

    // Left accent stripe
    setFill(...C.navy);
    rect(SUM_X, SEC_Y + 4, 3, SUM_H - 8);
    doc.circle(SUM_X + 1.5, SEC_Y + 4.2, 1.5, "F");
    doc.circle(SUM_X + 1.5, SEC_Y + SUM_H - 4.2, 1.5, "F");

    // Header stripe
    setFill(...C.navy);
    rRect(SUM_X, SEC_Y, SUM_W, HDR_SH, 3);
    rect(SUM_X, SEC_Y + 3, SUM_W, HDR_SH - 3); // flatten bottom corners
    bold(8);
    setColor(...C.white);
    txt("PAYMENT  SUMMARY", SUM_X + SUM_W / 2, SEC_Y + 5.8, { align: "center" });

    // Rows
    let RY = SEC_Y + HDR_SH + PAD_TOP + ROW * 0.5;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Grand total stripe sits before Amount Paid
        if (i === rows.length - 2) {
            // Separator line first
            setDraw(...C.border);
            doc.setLineWidth(0.35);
            line(SUM_X + 4, RY - 2.5, SUM_X + SUM_W - 4, RY - 2.5);
            RY += 1;

            // Grand Total stripe
            setFill(...C.navy);
            rect(SUM_X, RY - 3.5, SUM_W, GT_SH);
            bold(9.5);
            setColor(...C.white);
            txt("Grand Total", LX, RY + 3);
            txt(inr(total), VX, RY + 3, { align: "right" });

            // Gold underline on grand total
            setFill(...C.gold);
            rect(SUM_X, RY - 3.5 + GT_SH - 1.2, SUM_W, 1.2);

            RY += GT_SH + 4;
        }

        if (row.bold) {
            bold(8.8);
        } else {
            normal(8);
        }

        setColor(...(row.color ?? C.textMid));
        txt(row.label, LX, RY);

        if (row.bold) {
            bold(8.8);
        } else {
            normal(8);
        }
        setColor(...(row.color ?? C.textDark));
        txt(row.value, VX, RY, { align: "right" });

        RY += ROW;
    }

    // Status Badge
    const BADGE_Y = SEC_Y + SUM_H - BADGE_SH - PAD_BOT + 1;
    setFill(...badgeColor);
    rRect(SUM_X + 12, BADGE_Y, SUM_W - 24, BADGE_SH, 2);

    // Shine overlay on badge
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.2 }));
    setFill(...C.white);
    rRect(SUM_X + 12, BADGE_Y, SUM_W - 24, BADGE_SH / 2, 2);
    doc.restoreGraphicsState();

    bold(8);
    setColor(...C.white);
    txt(statusDisplay, SUM_X + SUM_W / 2, BADGE_Y + 6.2, { align: "center" });

    // ════════════════════════════════════════════════════════════════════════════
    // 6. QR CODE PANEL (left of summary)
    // ════════════════════════════════════════════════════════════════════════════
    const showQR = balance > 0 && statusStr !== "Paid" && statusStr !== "Insurance Pending";

    if (showQR) {
        const QR_W = 52;
        const QR_H = SUM_H;
        const QR_X = M;
        const QR_Y = SEC_Y;

        try {
            const upiId = (process.env.NEXT_PUBLIC_UPI_ID || "hospital@upi");
            const hospitalEnc = encodeURIComponent(r.hospitalName || "Hospital");
            const upiUri = `upi://pay?pa=${upiId}&pn=${hospitalEnc}&am=${balance.toFixed(2)}&cu=INR&tn=Bill%20${r.receiptnumber || ""}`;
            const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 120, margin: 1, color: { dark: "#0A2048", light: "#FFFFFF" } });

            // Shadow
            doc.saveGraphicsState();
            (doc as any).setGState(new (doc as any).GState({ opacity: 0.2 }));
            setFill(190, 205, 230);
            rRect(QR_X + 1.2, QR_Y + 1.2, QR_W, QR_H, 3);
            doc.restoreGraphicsState();

            // Panel
            setFill(...C.offWhite);
            setDraw(...C.border);
            doc.setLineWidth(0.3);
            rRect(QR_X, QR_Y, QR_W, QR_H, 3, "FD");

            // Header
            setFill(...C.teal);
            rRect(QR_X, QR_Y, QR_W, 8, 3);
            rect(QR_X, QR_Y + 3, QR_W, 5);
            bold(7.5);
            setColor(...C.white);
            txt("SCAN & PAY", QR_X + QR_W / 2, QR_Y + 5.8, { align: "center" });

            // Gold stripe
            setFill(...C.gold);
            rect(QR_X, QR_Y + 8, QR_W, 1);

            // UPI label
            normal(6.5);
            setColor(...C.textMid);
            txt("Pay via UPI / PhonePe / GPay", QR_X + QR_W / 2, QR_Y + 14, { align: "center" });

            // QR image centred
            const QR_SIZE = 36;
            doc.addImage(
                qrDataUrl, "PNG",
                QR_X + (QR_W - QR_SIZE) / 2,
                QR_Y + 17,
                QR_SIZE, QR_SIZE
            );

            // Amount label
            bold(7.5);
            setColor(...C.red);
            txt(`Balance: ${inr(balance)}`, QR_X + QR_W / 2, QR_Y + 17 + QR_SIZE + 5, { align: "center" });

            // UPI ID
            normal(6.2);
            setColor(...C.textLight);
            txt(upiId, QR_X + QR_W / 2, QR_Y + 17 + QR_SIZE + 10, { align: "center" });

        } catch (err) {
            console.error("QR generation failed", err);
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 7. TERMS & NOTES
    // ════════════════════════════════════════════════════════════════════════════
    const NOTES_Y = SEC_Y + SUM_H + 10;

    if (NOTES_Y < PH - 38) {
        // Section heading
        bold(7.5);
        setColor(...C.navy);
        txt("TERMS  &  CONDITIONS", M, NOTES_Y);

        setFill(...C.gold);
        rect(M, NOTES_Y + 1.5, 22, 0.6);

        // Terms box
        setFill(...C.panelBg);
        setDraw(...C.border);
        doc.setLineWidth(0.25);
        const termsW = (showQR ? SUM_X - M - 4 : PW - M * 2);
        rRect(M, NOTES_Y + 4, termsW, 22, 2, "FD");

        // Left colored stripe
        setFill(...C.teal);
        rect(M, NOTES_Y + 6.5, 2.5, 18);
        doc.circle(M + 1.25, NOTES_Y + 6.7, 1.25, "F");
        doc.circle(M + 1.25, NOTES_Y + 23.5, 1.25, "F");

        normal(7);
        setColor(...C.textMid);
        const termsText = [
            "• Payment is due within 7 days from the date of billing.",
            "• All charges are final. Refunds are subject to hospital policy and applicable terms.",
            "• For billing queries, contact the Billing Department with your Bill Number.",
            "• This is a computer-generated document and is valid without a physical signature.",
        ];
        doc.text(termsText, M + 6, NOTES_Y + 10.5, { lineHeightFactor: 1.6 });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 8. FOOTER
    // ════════════════════════════════════════════════════════════════════════════
    const FTR_H = 16;
    const FTR_Y = PH - FTR_H;

    // Gold separator
    setFill(...C.gold);
    rect(0, FTR_Y - 1.5, PW, 1.5);

    // Footer band
    setFill(...C.navy);
    rect(0, FTR_Y, PW, FTR_H);

    // Footer accent dots (left)
    setFill(...C.gold);
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.3 }));
    for (let i = 0; i < 4; i++) doc.circle(M + i * 4, FTR_Y + FTR_H / 2, 0.8, "F");
    doc.restoreGraphicsState();

    // Hospital name
    bold(7.5);
    setColor(...C.white);
    txt(r.hospitalName || "City General Hospital", PW / 2, FTR_Y + 5.5, { align: "center" });

    // Footer disclaimer
    normal(6.2);
    setColor(170, 190, 225);
    txt(
        "Computer-generated document. No signature required.  |  Generated: " +
        new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }),
        PW / 2, FTR_Y + 11, { align: "center" }
    );

    // Page number
    normal(6.5);
    setColor(150, 170, 210);
    txt(`Page 1 of 1`, PW - M, FTR_Y + 11, { align: "right" });

    // ─── Save ─────────────────────────────────────────────────────────────────
    doc.save(`Invoice_${r.receiptnumber || "BILL"}.pdf`);
};

// ─── Lab Report Export ────────────────────────────────────────────────────────
export const downloadLabReportPDF = async (test: any): Promise<void> => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 14;

    const C = {
        navy: [10, 32, 72] as [number, number, number],
        navyMid: [22, 58, 110] as [number, number, number],
        gold: [190, 148, 60] as [number, number, number],
        goldLight: [220, 185, 105] as [number, number, number],
        teal: [12, 131, 130] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        panelBg: [244, 247, 253] as [number, number, number],
        border: [205, 215, 232] as [number, number, number],
        textDark: [30, 42, 62] as [number, number, number],
        textMid: [85, 100, 125] as [number, number, number],
        altRow: [240, 245, 253] as [number, number, number],
    };

    const setFill = (...c: number[]) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (...c: number[]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setColor = (...c: number[]) => doc.setTextColor(c[0], c[1], c[2]);
    const rect = (x: number, y: number, w: number, h: number, s = "F") => doc.rect(x, y, w, h, s);
    const rRect = (x: number, y: number, w: number, h: number, r: number, s = "F") => doc.roundedRect(x, y, w, h, r, r, s);
    const bold = (size: number) => { doc.setFont("helvetica", "bold"); doc.setFontSize(size); };
    const normal = (size: number) => { doc.setFont("helvetica", "normal"); doc.setFontSize(size); };

    const txt = (text: string, x: number, y: number, opts?: any) => { (doc as any).text(text, x, y, opts); };
    
    const fmtDate = (d?: string | Date) => {
        if (!d) return "-";
        return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const hospInfo = test.opd_visits?.hospitals || {};
    const patientDetails = test.opd_visits?.patients || {};
    const patientUser = patientDetails.users_patients_user_idTousers || {};
    const doctorInfo = test.opd_visits?.doctors?.users_doctors_user_idTousers || {};

    const HDR = 46;

    // Header Stripe
    setFill(...C.navy);
    rect(0, 0, PW, HDR);

    setFill(...C.navyMid);
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.5 }));
    doc.triangle(PW * 0.55, 0, PW, 0, PW, HDR, "F");
    doc.triangle(PW * 0.55, 0, PW, HDR, PW * 0.72, HDR, "F");
    doc.restoreGraphicsState();

    setFill(...C.gold); rect(0, 0, PW, 2.2); rect(0, HDR - 2, PW, 2);

    // Header Text
    setColor(...C.white);
    bold(22); txt(hospInfo.hospital_name || "Care Unit", M, 24);
    normal(8.5); setColor(180, 200, 230);
    const addrLines = (hospInfo.address || "").match(/.{1,60}/g) || ["Central Medical Facility"];
    txt(addrLines[0], M, 31);
    
    setColor(...C.goldLight); bold(28); txt("LAB REPORT", PW - M, 26, { align: "right" });
    normal(9); setColor(...C.white); txt(`Test Code: ${test.tests?.test_code || "N/A"}`, PW - M, 33, { align: "right" });

    // Details Grid Layout
    const INFO_Y = HDR + 12;
    setFill(...C.panelBg); setDraw(...C.border); doc.setLineWidth(0.3);
    rRect(M, INFO_Y, PW - M * 2, 38, 2, "FD");

    const MID_X = PW / 2;
    const padding = 6;
    const labelX1 = M + padding; const valX1 = labelX1 + 22;
    const labelX2 = MID_X + 4;   const valX2 = labelX2 + 22;

    const row = (i: number) => INFO_Y + 8 + i * 8.5;

    normal(7.5); setColor(...C.textMid);
    txt("Patient", labelX1, row(0)); txt("Gender", labelX1, row(1)); txt("Contact", labelX1, row(2));
    txt("Doctor", labelX2, row(0)); txt("Ordered", labelX2, row(1)); txt("Completed", labelX2, row(2));

    bold(8.5); setColor(...C.textDark);
    txt(patientUser.full_name || "Unknown", valX1, row(0));
    txt(patientDetails.gender || "Unspecified", valX1, row(1));
    txt(patientUser.phone_number || "N/A", valX1, row(2));

    txt(`Dr. ${doctorInfo.full_name || "Unknown"}`, valX2, row(0));
    txt(fmtDate(test.ordered_at), valX2, row(1));
    txt(fmtDate(test.completed_at), valX2, row(2));

    // Test Content Title
    const CONTENT_Y = INFO_Y + 50;
    bold(14); setColor(...C.navy);
    txt(test.tests?.test_name || "Laboratory Result", M, CONTENT_Y);
    
    setFill(...C.gold); rect(M, CONTENT_Y + 3, PW - M*2, 0.7);

    // Result Body Parse
    let isStructured = false;
    let parameters: any[] = [];
    let remarks = test.result_summary || "No findings recorded.";

    try {
        if (test.result_summary && test.result_summary.trim().startsWith('{')) {
            const parsed = JSON.parse(test.result_summary);
            if (parsed.type === "structured") {
                isStructured = true;
                parameters = parsed.parameters || [];
                remarks = parsed.remarks || "";
            }
        }
    } catch (e) {
        // plain text fallback
    }

    let currentY = CONTENT_Y + 12;

    if (isStructured && parameters.length > 0) {
        autoTable(doc, {
            startY: currentY,
            margin: { left: M, right: M },
            head: [['Parameter', 'Result Value', 'Unit', 'Reference Range']],
            body: parameters.map(p => [p.name || "-", p.value || "-", p.unit || "-", p.range || "-"]),
            styles: { fontSize: 8.5, cellPadding: 3.5, font: "helvetica" },
            headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: "bold" },
            alternateRowStyles: { fillColor: C.altRow },
            theme: 'grid',
            tableLineColor: C.border,
            tableLineWidth: 0.1
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    if (remarks) {
        if (isStructured && parameters.length > 0) {
            bold(10); setColor(...C.navyMid);
            txt("Clinical Remarks", M, currentY);
            currentY += 6;
        }
        normal(10); setColor(...C.textDark);
        const splitLines = doc.splitTextToSize(remarks, PW - M*2);
        txt(splitLines, M, currentY, { lineHeightFactor: 1.6 });
    }

    // Footer
    const FTR_H = 22;
    const FTR_Y = PH - FTR_H;
    setFill(...C.gold); rect(0, FTR_Y - 1.5, PW, 1.5);
    setFill(...C.navy); rect(0, FTR_Y, PW, FTR_H);

    bold(7.5); setColor(...C.white);
    txt(hospInfo.hospital_name || "City General Hospital", PW / 2, FTR_Y + 6, { align: "center" });

    normal(6.2); setColor(170, 190, 225);
    // DISCRIMINATING DISCLAIMER (Added per user request)
    txt("DISCLAIMER: This is a computer-generated laboratory report. It does not require a physical signature.", PW / 2, FTR_Y + 11, { align: "center" });
    txt("The results should be correlated with clinical findings for a definitive diagnosis.", PW / 2, FTR_Y + 14.5, { align: "center" });
    txt(`Generated: ${fmtDate(new Date())}`, PW / 2, FTR_Y + 18, { align: "center" });

    doc.save(`LabReport_${test.opd_visits?.opd_no}_${test.tests?.test_code}.pdf`);
};