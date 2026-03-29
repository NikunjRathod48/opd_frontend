"use client";

import { useAuth, UserRole } from "@/context/auth-context";
import { useData, Receipt, ReceiptItem } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Search,
  CreditCard,
  Plus,
  FileText,
  CheckCircle2,
  X,
  Trash2,
  IndianRupee,
  Edit,
  Filter,
  Printer,
  Download,
  Receipt as ReceiptIcon,
  TrendingUp,
  Clock,
  AlertCircle,
  User,
  Hash,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Wallet,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSocket } from "@/context/socket-context";

interface BillingViewProps {
  allowedRoles?: UserRole[];
  readOnly?: boolean;
  hospitalId?: string;
}

interface NewReceiptState {
  patientName: string;
  paymentModeName: string;
  status: string;
  items: ReceiptItem[];
  taxRate: number;
  paidAmount: number;
  discountAmount?: number;
}

const PAYMENT_MODES = [
  { label: "Cash", value: "1", requiresReference: false },
  { label: "UPI", value: "2", requiresReference: true },
  { label: "Card", value: "3", requiresReference: false },
  { label: "Net Banking", value: "4", requiresReference: true },
  { label: "Cheque", value: "5", requiresReference: true },
  { label: "Insurance Claim", value: "6", requiresReference: true },
];

export function BillingView({
  allowedRoles = ["SuperAdmin", "GroupAdmin", "HospitalAdmin", "Receptionist", "Doctor", "Patient"],
  readOnly = false,
  hospitalId,
}: BillingViewProps) {
  const { user } = useAuth();
  const {
    receipts,
    patients,
    opdVisits,
    subTreatments,
    medicines,
    tests,
    saveBill,
    updateBill,
    payBill,
    fetchReceipts,
    getOpdDetails,
  } = useData();
  const { addToast } = useToast();
  const { socket } = useSocket();

  const effectiveHospitalId =
    hospitalId ||
    (["HospitalAdmin", "Receptionist"].includes(user?.role || "")
      ? user?.hospitalid
      : undefined);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("1");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState<NewReceiptState>({
    patientName: "",
    paymentModeName: "Cash",
    status: "Pending",
    items: [],
    taxRate: 0,
    paidAmount: 0,
    discountAmount: 0,
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isFetchingItems, setIsFetchingItems] = useState(false);

  // Fetch bill records on mount / when hospital context changes
  useEffect(() => {
    setIsLoadingReceipts(true);
    fetchReceipts().finally(() => setIsLoadingReceipts(false));
  }, [effectiveHospitalId]);

  // Auto-refresh when a bill is created (e.g. auto-generated on discharge)
  useEffect(() => {
    if (!socket) return;
    const handleBillCreated = () => {
      fetchReceipts();
      addToast("New bill generated from discharge", "info");
    };
    socket.on("bill:created", handleBillCreated);
    return () => { socket.off("bill:created", handleBillCreated); };
  }, [socket, fetchReceipts, addToast]);

  const canEdit = !readOnly &&
    ["SuperAdmin", "GroupAdmin", "HospitalAdmin", "Receptionist"].includes(user?.role || "");

  // Derived stats — backend already scopes by hospital; no frontend filter needed
  const stats = useMemo(() => {
    const total = receipts.reduce((s, r) => s + (Number(r.totalamount) || 0), 0);
    const paid = receipts.filter((r) => r.status === "Paid").reduce((s, r) => s + (Number(r.totalamount) || 0), 0);
    const pending = receipts.filter((r) => r.status === "Pending").length;
    const partial = receipts.filter((r) => r.status === "Partially Paid").length;
    return { total, paid, pending, partial, count: receipts.length };
  }, [receipts]);

  // Filtered receipts — backend already scopes by hospital; only apply search + status here
  const filteredReceipts = useMemo(() => {
    let list = [...receipts];
    if (statusFilter !== "All") list = list.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.patientName?.toLowerCase().includes(q) ||
          r.receiptnumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [receipts, effectiveHospitalId, statusFilter, searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / itemsPerPage));
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helpers
  const calcTotal = (items: ReceiptItem[]) =>
    items.reduce((s, i) => s + (i.amount || 0), 0);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Paid": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> };
      case "Pending": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> };
      case "Partially Paid": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: <AlertCircle className="h-3 w-3" /> };
      case "Cancelled": return { color: "bg-rose-100 text-rose-700 border-rose-200", icon: <X className="h-3 w-3" /> };
      default: return { color: "bg-slate-100 text-slate-600 border-slate-200", icon: null };
    }
  };

  const mapItemsToPayload = (items: ReceiptItem[]) =>
    items.map((item) => {
      const pid = item.subtreatmenttypeid || "";
      const isCustom = pid.startsWith("CUSTOM");
      return {
        item_type: isCustom ? "Other"
          : pid.startsWith("TRT") ? "Procedure"
            : pid.startsWith("TST") ? "Test"
              : pid.startsWith("MED") ? "Medicine"
                : "Other",
        reference_id: isCustom ? null : Number(pid.replace(/\D/g, "")) || null,
        item_description: item.description,
        quantity: item.qty || 1,
        unit_price: item.rate || 0,
        total_price: item.amount || 0,
      };
    });

  // Open create form
  const handleOpenCreate = () => {
    setEditingId(null);
    setSelectedPatientId("");
    setFormData({ patientName: "", paymentModeName: "Cash", status: "Pending", items: [], taxRate: 0, paidAmount: 0, discountAmount: 0 });
    setIsFormOpen(true);
  };

  // Open edit form
  const handleOpenEdit = (r: Receipt) => {
    setEditingId(r.receiptid);
    setSelectedPatientId(r.patientid || "");
    setFormData({
      patientName: r.patientName || "",
      paymentModeName: r.paymentModeName || "Cash",
      status: r.status,
      items: r.items || [],
      taxRate: 0,
      paidAmount: r.paidamount || 0,
      discountAmount: r.discountamount || 0,
    });
    setIsFormOpen(true);
  };

  // Auto-fetch prescribed items when patient is selected
  const handlePatientSelect = async (patientId: string) => {
    const patientObj = patients.find((p) => p.patientid === patientId);
    if (!patientObj) return;
    setSelectedPatientId(patientId);
    setFormData((p) => ({ ...p, patientName: patientObj.patientname, items: [] }));

    // Find their latest active OPD visit
    const visit = opdVisits
      .filter((v) => v.patientid === patientId && v.status === "Active")
      .sort((a, b) => new Date(b.visitdatetime).getTime() - new Date(a.visitdatetime).getTime())[0];

    if (!visit) return;

    setIsFetchingItems(true);
    try {
      const detail = await getOpdDetails(visit.opdid);
      if (!detail) return;

      const autoItems: ReceiptItem[] = [];

      // Prescribed procedures
      (detail.opd_procedures || []).forEach((op: any) => {
        const proc = op.procedures;
        if (proc) {
          autoItems.push({
            subtreatmenttypeid: `TRT-${proc.procedure_id}`,
            description: proc.procedure_name,
            qty: 1,
            rate: Number(proc.price) || 0,
            amount: Number(proc.price) || 0,
          });
        }
      });

      // Prescribed tests
      (detail.opd_tests || []).forEach((ot: any) => {
        const tst = ot.tests;
        if (tst) {
          autoItems.push({
            subtreatmenttypeid: `TST-${tst.test_id}`,
            description: tst.test_name,
            qty: 1,
            rate: Number(tst.price) || 0,
            amount: Number(tst.price) || 0,
          });
        }
      });

      // Prescribed medicines
      (detail.prescriptions || []).forEach((rx: any) => {
        (rx.prescription_items || []).forEach((item: any) => {
          const med = item.medicines;
          if (med) {
            autoItems.push({
              subtreatmenttypeid: `MED-${med.medicine_id}`,
              description: `${med.medicine_name} ${med.strength || ""} — ${item.dosage || ""}`.trim(),
              qty: item.quantity || 1,
              rate: 0, // Price set in hospital_medicines; 0 fallback
              amount: 0,
            });
          }
        });
      });

      if (autoItems.length > 0) {
        setFormData((p) => ({ ...p, items: autoItems }));
      }
    } catch (e) {
      console.error("Failed to load prescribed items", e);
    } finally {
      setIsFetchingItems(false);
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!formData.patientName) { addToast("Patient name is required", "error"); return; }
    if (!formData.items.length) { addToast("Add at least one item", "error"); return; }

    const subtotal = calcTotal(formData.items);
    const taxAmount = (subtotal * (formData.taxRate || 0)) / 100;

    setIsSaving(true);
    try {
      if (editingId) {
        await updateBill(editingId, {
          subtotal_amount: subtotal,
          tax_amount: taxAmount,
          discount_amount: formData.discountAmount || 0,
          items: mapItemsToPayload(formData.items),
        });
        addToast("Invoice updated", "success");
      } else {
        const visit = opdVisits
          .filter((v) => v.patientid === selectedPatientId && v.status === "Active")
          .sort((a, b) => new Date(b.visitdatetime).getTime() - new Date(a.visitdatetime).getTime())[0];
        const visitId = visit?.opdid;
        if (!visitId) { addToast("No active OPD visit for this patient", "error"); setIsSaving(false); return; }

        await saveBill({
          hospital_id: Number(effectiveHospitalId || 1),
          visit_id: Number(visitId),
          subtotal_amount: subtotal,
          tax_amount: taxAmount,
          discount_amount: formData.discountAmount || 0,
          items: mapItemsToPayload(formData.items),
        });
        addToast("Invoice created", "success");
      }
      setIsFormOpen(false);
    } catch { addToast("Failed to save invoice", "error"); }
    finally { setIsSaving(false); }
  };

  // Pay handler
  const handlePay = async (r: Receipt) => {
    setViewingReceipt(r);
    setPaymentAmount(String((r.totalamount || 0) - (r.paidamount || 0)));
    setPaymentMode("1");
    setReferenceNumber("");
    setIsPayOpen(true);
  };

  const selectedPaymentModeObj = PAYMENT_MODES.find((m) => m.value === paymentMode);

  const handleConfirmPayment = async () => {
    if (!viewingReceipt) return;

    // Validation
    if (selectedPaymentModeObj?.requiresReference && !referenceNumber.trim()) {
      addToast(`Reference ID/Transaction No is required for ${selectedPaymentModeObj.label}`, "error");
      return;
    }

    setIsSaving(true);
    try {
      await payBill(viewingReceipt.receiptid, {
        payment_mode_id: Number(paymentMode),
        amount_paid: Number(paymentAmount),
        reference_number: referenceNumber ? referenceNumber.trim() : undefined,
        // Optional override: if insurance, maybe tag the receipt differently on backend
        // For now, it records the payment type. The DB was modified to allow 'Insurance Pending'.
      });
      addToast("Payment recorded successfully", "success");
      setIsPayOpen(false);
      setViewingReceipt(null);
    } catch { addToast("Payment failed", "error"); }
    finally { setIsSaving(false); }
  };

  // PDF export
  const handleDownloadPDF = (r: Receipt) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Invoice", 14, 22);
    doc.setFontSize(11);
    doc.text(`Bill No: ${r.receiptnumber}`, 14, 32);
    doc.text(`Patient: ${r.patientName || ""}`, 14, 38);
    doc.text(`Date: ${new Date(r.receiptdate).toLocaleDateString()}`, 14, 44);
    autoTable(doc, {
      startY: 52,
      head: [["Description", "Qty", "Rate (₹)", "Amount (₹)"]],
      body: (r.items || []).map((i) => [i.description, i.qty, i.rate.toFixed(2), i.amount.toFixed(2)]),
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Subtotal: ₹${r.subtotalamount?.toFixed(2)}`, 14, finalY);
    doc.text(`Tax: ₹${r.taxamount?.toFixed(2)}`, 14, finalY + 6);
    if ((r.discountamount || 0) > 0) {
      doc.text(`Discount: -₹${r.discountamount?.toFixed(2)}`, 14, finalY + 12);
      doc.text(`Total Due: ₹${r.totalamount?.toFixed(2)}`, 14, finalY + 18);
      doc.text(`Paid Amount: ₹${(r.paidamount || 0).toFixed(2)}`, 14, finalY + 24);
      doc.text(`Status: ${r.status}`, 14, finalY + 30);
      if (r.referenceNumber) doc.text(`Ref/Transaction: ${r.referenceNumber}`, 14, finalY + 36);
    } else {
      doc.text(`Total Due: ₹${r.totalamount?.toFixed(2)}`, 14, finalY + 12);
      doc.text(`Paid Amount: ₹${(r.paidamount || 0).toFixed(2)}`, 14, finalY + 18);
      doc.text(`Status: ${r.status}`, 14, finalY + 24);
      if (r.referenceNumber) doc.text(`Ref/Transaction: ${r.referenceNumber}`, 14, finalY + 30);
    }
    doc.save(`invoice-${r.receiptnumber}.pdf`);
  };

  // Item helpers
  const addItem = () => {
    setFormData((p) => ({
      ...p,
      items: [...p.items, { subtreatmenttypeid: "", description: "", qty: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (idx: number) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, field: keyof ReceiptItem, value: any) => {
    setFormData((p) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "qty" || field === "rate") {
        items[idx].amount = (items[idx].qty || 0) * (items[idx].rate || 0);
      }
      return { ...p, items };
    });
  };

  const selectCatalogItem = (idx: number, id: string) => {
    let desc = "", rate = 0;
    if (id.startsWith("TRT-")) {
      const proc = subTreatments.find((s) => s.subtreatmenttypeid === id.replace("TRT-", ""));
      if (proc) { desc = proc.subtreatmentname; rate = proc.rate; }
    } else if (id.startsWith("MED-")) {
      const med = medicines.find((m) => m.medicine_id === id.replace("MED-", ""));
      if (med) { desc = `${med.medicine_name} ${med.strength}`; rate = 0; }
    } else if (id.startsWith("TST-")) {
      const tst = tests.find((t) => t.test_id === id.replace("TST-", ""));
      if (tst) { desc = tst.test_name; rate = tst.price; }
    }
    setFormData((p) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], subtreatmenttypeid: id, description: desc, rate, amount: rate * (items[idx].qty || 1) };
      return { ...p, items };
    });
  };

  const catalogOptions = [
    ...subTreatments.filter((s) => s.is_linked !== false).map((s) => ({
      label: `[Procedure] ${s.subtreatmentname}`, value: `TRT-${s.subtreatmenttypeid}`,
    })),
    ...tests.filter((t) => t.is_linked !== false).map((t) => ({
      label: `[Test] ${t.test_name}`, value: `TST-${t.test_id}`,
    })),
    ...medicines.filter((m) => m.is_linked !== false).map((m) => ({
      label: `[Medicine] ${m.medicine_name} ${m.strength}`, value: `MED-${m.medicine_id}`,
    })),
    { label: "[Custom] Custom Item", value: `CUSTOM-${Date.now()}` },
  ];

  // Use patientid as value to avoid duplicate key error
  const patientOptions = patients.map((p) => ({
    label: `${p.patientname}${p.patient_no ? ` (${p.patient_no})` : ""}`,
    value: p.patientid,
  }));

  const subtotal = calcTotal(formData.items);
  const taxAmt = (subtotal * (formData.taxRate || 0)) / 100;
  const discAmt = Number(formData.discountAmount) || 0;
  const grandTotal = subtotal + taxAmt - discAmt;

  const statusOptions = [
    { label: "All Statuses", value: "All" },
    { label: "Paid", value: "Paid" },
    { label: "Pending", value: "Pending" },
    { label: "Partially Paid", value: "Partially Paid" },
    { label: "Insurance Pending", value: "Insurance Pending" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent pb-1">
              Billing & Payments
            </h2>
            <p className="text-muted-foreground/80 font-medium text-lg mt-1">
              Generate invoices, record payments and track revenue.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(true)}
              className={cn(
                "gap-2 rounded-xl h-11 px-5 border-slate-200 dark:border-slate-800 font-semibold transition-all duration-300",
                isFilterOpen
                  ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              )}
            >
              <Filter className="h-4 w-4" /> Filters
            </Button>
            {canEdit && (
              <Button
                onClick={handleOpenCreate}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl px-6 h-11 text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="mr-2 h-5 w-5" /> New Invoice
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `₹${stats.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: <IndianRupee className="h-5 w-5" />, color: "from-violet-500 to-indigo-500", bg: "bg-violet-50 dark:bg-violet-900/20 text-violet-600" },
            { label: "Amount Collected", value: `₹${stats.paid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: <TrendingUp className="h-5 w-5" />, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
            { label: "Pending Bills", value: stats.pending, icon: <Clock className="h-5 w-5" />, color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-600" },
            { label: "Total Invoices", value: stats.count, icon: <FileText className="h-5 w-5" />, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className={cn("inline-flex items-center justify-center h-10 w-10 rounded-xl mb-3", stat.bg)}>
                  {stat.icon}
                </div>
                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{stat.value}</div>
                <div className="text-xs font-semibold text-muted-foreground mt-0.5">{stat.label}</div>
                <div className={cn("absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-10", stat.color)} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or bill number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-base"
          />
        </div>

        {/* ── Status Filter Chips ── */}
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200",
                statusFilter === opt.value
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md shadow-violet-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Invoices Table / Cards ── */}
        {isLoadingReceipts ? (
          /* Loading skeleton */
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-3">Patient</div>
              <div className="col-span-2">Bill No</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 items-center animate-pulse">
                <div className="col-span-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 w-3/4" />
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 w-1/2" />
                  </div>
                </div>
                <div className="col-span-2"><div className="h-6 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
                <div className="col-span-2"><div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 w-20" /></div>
                <div className="col-span-1 flex justify-end"><div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 w-12" /></div>
                <div className="col-span-2 flex justify-center"><div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" /></div>
                <div className="col-span-2 flex justify-end gap-1">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filteredReceipts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-black/20"
          >
            <div className="h-20 w-20 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
              <ReceiptIcon className="h-9 w-9 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No invoices found</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {searchQuery || statusFilter !== "All" ? "Try adjusting your filters." : "Create your first invoice to get started."}
            </p>
            {canEdit && !searchQuery && statusFilter === "All" && (
              <Button onClick={handleOpenCreate} className="mt-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl px-6 h-10">
                <Plus className="h-4 w-4 mr-2" /> New Invoice
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-3">Patient</div>
              <div className="col-span-2">Bill No</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <AnimatePresence>
              {paginatedReceipts.map((r, i) => {
                const sc = getStatusConfig(r.status);
                return (
                  <motion.div
                    key={r.receiptid}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-12 gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group items-center"
                  >
                    {/* Patient */}
                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-extrabold text-sm shrink-0">
                        {(r.patientName || "?")?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{r.patientName || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.paymentModeName || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Bill No */}
                    <div className="col-span-2">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg">
                        {r.receiptnumber}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(r.receiptdate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>

                    {/* Amount */}
                    <div className="col-span-1 text-right">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        ₹{(r.totalamount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                      {r.paidamount != null && r.paidamount > 0 && r.paidamount < (r.totalamount || 0) && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          ₹{r.paidamount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} paid
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex justify-center">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border", sc.color)}>
                        {sc.icon}
                        {r.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && r.status !== "Paid" && (
                        <button
                          onClick={() => handlePay(r)}
                          title="Record Payment"
                          className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 flex items-center justify-center transition-colors"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canEdit && r.status !== "Paid" && (
                        <button
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Invoice"
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewingReceipt(r)}
                        title="View Invoice"
                        className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-600 flex items-center justify-center transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(r)}
                        title="Download PDF"
                        className="h-8 w-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 flex items-center justify-center transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Table Footer: Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 text-sm">
                <span className="text-xs font-medium text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredReceipts.length)} of {filteredReceipts.length} invoices
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 shadow-sm rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <div className="text-xs font-bold px-2 text-slate-600 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 shadow-sm rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Filter Side Sheet ── */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l-0 shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl flex flex-col p-0">
            <SheetHeader className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
              <SheetTitle className="flex items-center gap-2 text-xl font-extrabold">
                <Filter className="h-5 w-5 text-violet-600" /> Filters
              </SheetTitle>
              <SheetDescription>Filter invoices by status or search term.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment Status</Label>
                <CustomDropdown
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="All Statuses"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <SheetFooter className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky bottom-0">
              <Button variant="outline" onClick={() => { setStatusFilter("All"); setSearchQuery(""); setIsFilterOpen(false); }} className="rounded-xl h-11 px-6">
                Reset
              </Button>
              <Button onClick={() => setIsFilterOpen(false)} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl h-11 px-8">
                Apply
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* ── Create / Edit Invoice Dialog ── */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-white dark:bg-slate-900">
            {/* Dialog Header */}
            <div className="px-8 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900">
              <div className="flex gap-4 items-center">
                <div className="h-11 w-11 rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                  {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                    {editingId ? "Edit Invoice" : "New Invoice"}
                  </DialogTitle>
                  <DialogDescription className="text-sm font-medium text-slate-500 mt-0.5">
                    {editingId ? "Update line items and amounts." : "Bill number is auto-generated on save."}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-[65vh]">
              <div className="p-8 space-y-7">
                {/* Patient */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <User className="h-3 w-3" /> Patient <span className="text-rose-500">*</span>
                    </Label>
                    {editingId ? (
                      <Input value={formData.patientName} disabled className="h-11 rounded-xl bg-slate-50" />
                    ) : (
                      <div className="relative">
                        <SearchableSelect
                          options={patientOptions}
                          value={selectedPatientId}
                          onChange={(v) => v && handlePatientSelect(v)}
                          placeholder="Search patient..."
                          className="w-full"
                        />
                        {isFetchingItems && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.taxRate}
                      onChange={(e) => setFormData((p) => ({ ...p, taxRate: Number(e.target.value) }))}
                      className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Line Items
                      {isFetchingItems && <span className="text-violet-500 normal-case font-medium text-xs tracking-normal ml-2">Loading prescribed items...</span>}
                      {!isFetchingItems && formData.items.length > 0 && !editingId && selectedPatientId && (
                        <span className="text-emerald-600 normal-case font-medium text-xs tracking-normal ml-2">
                          {formData.items.length} prescribed item(s) loaded
                        </span>
                      )}
                    </Label>
                    <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-8 rounded-lg text-xs gap-1 border-violet-200 text-violet-700 hover:bg-violet-50">
                      <Plus className="h-3 w-3" /> Add Item
                    </Button>
                  </div>

                  {formData.items.length === 0 && !isFetchingItems && (
                    <div className="flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                      <ReceiptIcon className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm font-medium">
                        {selectedPatientId ? "No prescribed items found — add manually" : "Select a patient to auto-load prescribed items"}
                      </p>
                    </div>
                  )}

                  {formData.items.length === 0 && isFetchingItems && (
                    <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                      <p className="text-sm font-medium">Loading prescribed items from OPD visit...</p>
                    </div>
                  )}

                  {/* Table header */}
                  {formData.items.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <div className="col-span-5">Item / Catalog</div>
                      <div className="col-span-2">Description</div>
                      <div className="col-span-1 text-center">Qty</div>
                      <div className="col-span-2 text-right">Rate (₹)</div>
                      <div className="col-span-1 text-right">Amt</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {formData.items.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2"
                      >
                        <div className="col-span-5">
                          <SearchableSelect
                            options={catalogOptions}
                            value={item.subtreatmenttypeid || ""}
                            onChange={(v) => v && selectCatalogItem(idx, v)}
                            placeholder="Select from catalog..."
                            className="w-full"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            placeholder="Description"
                            className="h-9 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                            className="h-9 rounded-lg text-center text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.rate}
                            onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                            className="h-9 rounded-lg text-right text-xs"
                          />
                        </div>
                        <div className="col-span-1 text-right text-xs font-bold text-slate-700 dark:text-slate-300 pr-1">
                          ₹{(item.amount || 0).toFixed(0)}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                {formData.items.length > 0 && (
                  <div className="ml-auto w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Tax ({formData.taxRate || 0}%)</span>
                      <span className="font-semibold">₹{taxAmt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Discount</span>
                      <Input
                        type="number"
                        min={0}
                        value={formData.discountAmount || 0}
                        onChange={(e) => setFormData((p) => ({ ...p, discountAmount: Number(e.target.value) }))}
                        className="h-8 w-28 text-right rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex justify-between font-extrabold text-base text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <span>Total</span>
                      <span className="text-violet-600">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl h-11 px-6">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl h-11 px-8 shadow-lg shadow-violet-500/20"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Update Invoice" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Payment Dialog ── */}
        <Dialog open={isPayOpen} onOpenChange={(o) => { setIsPayOpen(o); if (!o) setViewingReceipt(null); }}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-white dark:bg-slate-900">
            <div className="px-8 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <div className="flex gap-4 items-center">
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Record Payment</DialogTitle>
                  <DialogDescription className="text-sm font-medium text-slate-500 mt-0.5">
                    {viewingReceipt?.receiptnumber} · {viewingReceipt?.patientName}
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-5">
              {viewingReceipt && (
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                  <span className="text-sm font-medium text-slate-500">Outstanding</span>
                  <span className="text-2xl font-extrabold text-emerald-600">
                    ₹{((viewingReceipt.totalamount || 0) - (viewingReceipt.paidamount || 0)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-12 rounded-xl text-lg font-bold bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMode(m.value)}
                      className={cn(
                        "h-10 rounded-xl border text-sm font-bold transition-all",
                        paymentMode === m.value
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Number Input - Conditional */}
              <AnimatePresence>
                {selectedPaymentModeObj?.requiresReference && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {paymentMode === "6" ? "Insurance Policy / Claim Ref No." : "Transaction ID / Reference No."} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. UPI12345678"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="h-11 rounded-lg bg-slate-50 dark:bg-slate-800"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsPayOpen(false); setViewingReceipt(null); }} className="rounded-xl h-11 px-6">Cancel</Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={isSaving || !paymentAmount}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl h-11 px-8 shadow-lg shadow-emerald-500/20"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── View Invoice Dialog ── */}
        <Dialog open={!!viewingReceipt && !isPayOpen} onOpenChange={(o) => !o && setViewingReceipt(null)}>
          {viewingReceipt && !isPayOpen && (
            <DialogContent className="max-w-xl p-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-white dark:bg-slate-900">
              <div className="px-8 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Invoice</DialogTitle>
                    <p className="font-mono text-sm text-violet-600 dark:text-violet-400 mt-1 font-bold">{viewingReceipt.receiptnumber}</p>
                  </div>
                  <div className={cn("px-3 py-1.5 rounded-full text-xs font-bold border inline-flex items-center gap-1", getStatusConfig(viewingReceipt.status).color)}>
                    {getStatusConfig(viewingReceipt.status).icon}
                    {viewingReceipt.status}
                  </div>
                </div>
                <div className="mt-4 flex gap-6 text-sm text-slate-600 dark:text-slate-400">
                  <div><span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Patient</span>{viewingReceipt.patientName}</div>
                  <div><span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Date</span>{new Date(viewingReceipt.receiptdate).toLocaleDateString("en-IN")}</div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Mode</span>
                    {viewingReceipt.paymentModeName || "—"}
                    {viewingReceipt.referenceNumber && (
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5 max-w-[120px] truncate" title={viewingReceipt.referenceNumber}>
                        Ref: {viewingReceipt.referenceNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-72">
                <div className="p-8 space-y-4">
                  {/* Items table */}
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <div className="col-span-6">Description</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-2 text-right">Rate</div>
                      <div className="col-span-2 text-right">Amt</div>
                    </div>
                    {(viewingReceipt.items || []).map((item, i) => (
                      <div key={i} className="grid grid-cols-12 px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                        <div className="col-span-6 font-medium text-slate-700 dark:text-slate-300">{item.description}</div>
                        <div className="col-span-2 text-center text-slate-500">{item.qty}</div>
                        <div className="col-span-2 text-right text-slate-500">₹{item.rate.toFixed(2)}</div>
                        <div className="col-span-2 text-right font-bold text-slate-800 dark:text-slate-200">₹{item.amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="space-y-1.5 text-sm ml-auto w-56">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{(viewingReceipt.subtotalamount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Tax</span><span>₹{(viewingReceipt.taxamount || 0).toFixed(2)}</span></div>
                    {(viewingReceipt.discountamount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{(viewingReceipt.discountamount || 0).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-extrabold text-base text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <span>Total</span><span className="text-violet-600">₹{(viewingReceipt.totalamount || 0).toFixed(2)}</span>
                    </div>
                    {(viewingReceipt.paidamount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Paid</span><span>₹{(viewingReceipt.paidamount || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-3">
                {canEdit && viewingReceipt.status !== "Paid" && (
                  <Button
                    onClick={() => { setIsPayOpen(true); setPaymentAmount(String((viewingReceipt.totalamount || 0) - (viewingReceipt.paidamount || 0))); setPaymentMode("1"); }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl h-10 px-5 text-sm"
                  >
                    <CreditCard className="h-4 w-4 mr-2" /> Pay Now
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleDownloadPDF(viewingReceipt)} className="rounded-xl h-10 px-5 text-sm gap-2">
                  <Download className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" onClick={() => setViewingReceipt(null)} className="rounded-xl h-10 px-5 text-sm">Close</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </RoleGuard>
  );
}
