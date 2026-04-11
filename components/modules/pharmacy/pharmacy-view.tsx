"use client";

import { useAuth, UserRole } from "@/context/auth-context";
import { useData, PharmacyPrescription, Medicine } from "@/context/data-context";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  FileText,
  CheckCircle2,
  User,
  Pill,
  Loader2,
  Package,
  Activity,
  AlertCircle,
  Plus
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PharmacyView() {
  const { user } = useAuth();
  const {
    fetchPendingPrescriptions,
    dispensePrescription,
    medicines,
    fetchMedicines,
    updateMedicine,
    getReceipt,
  } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"dispense" | "inventory">("dispense");
  const [prescriptions, setPrescriptions] = useState<PharmacyPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dispensingId, setDispensingId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, number[]>>({});
  const [searchRx, setSearchRx] = useState("");
  const [searchMed, setSearchMed] = useState("");

  const [restockMed, setRestockMed] = useState<Medicine | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [isRestocking, setIsRestocking] = useState(false);

  const loadPrescriptions = async () => {
    if (!user?.hospitalid) return;
    try {
      setIsLoading(true);
      const data = await fetchPendingPrescriptions(user.hospitalid.toString());
      setPrescriptions(data || []);
      
      // Auto-select all pending items for convenience
      if (data) {
        const initialSelections: Record<number, number[]> = {};
        data.forEach(rx => {
           initialSelections[rx.prescription_id] = rx.prescription_items
            .filter((item: any) => item.status === 'Pending')
            .map((item: any) => item.prescription_item_id);
        });
        setSelectedItems(initialSelections);
      }
    } catch (e) {
      addToast("Failed to load pending prescriptions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.hospitalid) {
      fetchMedicines(); // Always fetch inventory on mount or tab change to have stock numbers
      if (activeTab === "dispense") {
        loadPrescriptions();
      }
    }
  }, [user?.hospitalid, activeTab]);

  const toggleItemSelection = (rxId: number, itemId: number) => {
    setSelectedItems(prev => {
      const current = prev[rxId] || [];
      if (current.includes(itemId)) {
        return { ...prev, [rxId]: current.filter(id => id !== itemId) };
      }
      return { ...prev, [rxId]: [...current, itemId] };
    });
  };

  const handleDispense = async (rxId: number) => {
    try {
      const rx = prescriptions.find(r => r.prescription_id === rxId);
      let itemIds = selectedItems[rxId] || [];
      
      // Defensively filter out items that are out of stock just in case they were checked initially
      itemIds = itemIds.filter(id => {
         const pItem = rx?.prescription_items.find((i:any) => i.prescription_item_id === id);
         const medInv = medicines.find(m => String(m.medicine_id) === String(pItem?.medicine_id));
         const stock = medInv?.stock_quantity || 0;
         return stock >= (pItem?.quantity || 1);
      });

      if (!itemIds || itemIds.length === 0) {
        addToast("Please select at least one available medicine to dispense.", "error");
        return;
      }
      
      setDispensingId(rxId);
      const res = await dispensePrescription(rxId.toString(), itemIds);
      addToast("Prescription dispensed partially. Stock has been deducted.", "success");
      
      if (res && res.new_bill_id) {
        const receipt = await getReceipt(res.new_bill_id.toString());
        if (receipt) {
           await downloadInvoicePDF(receipt);
           addToast("Pharmacy Bill generated and exported.", "info");
        }
      }

      loadPrescriptions();
      fetchMedicines(); // Refresh stock in background
    } catch (e: any) {
      addToast(e.message || "Failed to dispense", "error");
    } finally {
      setDispensingId(null);
    }
  };

  const handleRestock = async () => {
    if (!restockMed || !restockAmount) return;
    try {
      setIsRestocking(true);
      const addQty = parseInt(restockAmount, 10);
      if (isNaN(addQty) || addQty <= 0) throw new Error("Invalid quantity");

      const newTotal = (restockMed.stock_quantity || 0) + addQty;
      // Also ensure is_linked is sent properly if required, or partial updates handles it
      await updateMedicine(restockMed.medicine_id!.toString(), { stock_quantity: newTotal });
      addToast(`Added ${addQty} units to ${restockMed.medicine_name}`, "success");
      setRestockMed(null);
      setRestockAmount("");
    } catch (e: any) {
      addToast(e.message || "Failed to update stock", "error");
    } finally {
      setIsRestocking(false);
    }
  };

  const filteredRx = prescriptions.filter((rx) => {
    const term = searchRx.toLowerCase();
    const pName =
      rx.opd_visits?.patients?.users_patients_user_idTousers?.full_name?.toLowerCase() ||
      "";
    const dName =
      rx.doctors?.users_doctors_user_idTousers?.full_name?.toLowerCase() || "";
    return pName.includes(term) || dName.includes(term);
  });

  const filteredMeds = medicines.filter((m) =>
    m.is_linked !== false && m.medicine_name.toLowerCase().includes(searchMed.toLowerCase())
  );

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950 p-6 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-500 mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                  <Pill className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Pharmacy
                </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium ml-1">
                Manage prescriptions and track active medicine inventory.
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setActiveTab("dispense")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
                  activeTab === "dispense"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                    : "text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <FileText className="h-4 w-4" />
                Dispense Prescriptions
              </button>
              <button
                onClick={() => setActiveTab("inventory")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
                  activeTab === "inventory"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                    : "text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Package className="h-4 w-4" />
                Manage Inventory
              </button>
            </div>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {activeTab === "dispense" ? (
              <motion.div
                key="dispense"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-emerald-500" />
                      Pending Queue
                    </h2>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search patient or doctor..."
                        value={searchRx}
                        onChange={(e) => setSearchRx(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:border-emerald-500 rounded-xl"
                      />
                    </div>
                  </div>

                  <ScrollArea className="h-[600px] pr-4">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-emerald-500" />
                        <p>Loading pending prescriptions...</p>
                      </div>
                    ) : filteredRx.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <CheckCircle2 className="h-12 w-12 text-emerald-100 dark:text-emerald-900/50 mb-4" />
                        <p className="text-lg font-bold text-slate-600">All Caught Up!</p>
                        <p className="text-sm">No pending prescriptions in the queue.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRx.map((rx) => (
                          <div
                            key={rx.prescription_id}
                            className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                          >
                            <div className="p-5 flex-1 relative z-10">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <User className="h-4 w-4 text-emerald-500" />
                                    {rx.opd_visits?.patients?.users_patients_user_idTousers?.full_name || "Unknown Patient"}
                                  </h3>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
                                    OPD: {rx.opd_visits?.opd_no || "-"}
                                  </p>
                                </div>
                                <Badge variant="outline" className={cn(rx.status === 'Partially Dispensed' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-orange-50 text-orange-600 border-orange-200")}>
                                  {rx.status || 'Pending'}
                                </Badge>
                              </div>

                              <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-1">
                                <p className="font-medium"><span className="text-slate-400">Doctor:</span> Dr. {rx.doctors?.users_doctors_user_idTousers?.full_name}</p>
                                <p className="font-medium"><span className="text-slate-400">Date:</span> {new Date(rx.prescribed_date).toLocaleDateString()}</p>
                              </div>

                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicines ({rx.prescription_items?.length || 0})</h4>
                                <div className="space-y-2">
                                  {rx.prescription_items?.map((item: any) => {
                                    const medInv = medicines.find(m => String(m.medicine_id) === String(item.medicine_id));
                                    const stockQty = medInv?.stock_quantity || 0;

                                    const isOutOfStock = stockQty === 0;
                                    const isInsufficientStock = stockQty > 0 && stockQty < item.quantity;
                                    const canDispense = stockQty >= item.quantity;
                                    
                                    const isDispensed = item.status === 'Dispensed';
                                    const isSelected = selectedItems[rx.prescription_id]?.includes(item.prescription_item_id) ?? false;
                                    return (
                                      <div key={item.prescription_item_id} className={cn("p-2.5 rounded-lg text-xs flex justify-between items-center group/item transition-colors", isDispensed ? "bg-slate-100 dark:bg-slate-800/80 opacity-60" : "bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10")}>
                                        <div className="flex items-center gap-3">
                                          {!isDispensed ? (
                                            <input 
                                              type="checkbox" 
                                              checked={isSelected && canDispense}
                                              disabled={!canDispense}
                                              onChange={() => toggleItemSelection(rx.prescription_id, item.prescription_item_id)}
                                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                                            />
                                          ) : (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                          )}
                                          <div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300">
                                              {item.medicines?.medicine_name} 
                                              {isDispensed && <span className="text-emerald-500 font-normal ml-1">(Dispensed)</span>}
                                              {!isDispensed && isOutOfStock && <span className="text-red-500 font-normal ml-2 px-1.5 py-0.5 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-[10px] uppercase tracking-wider">Out of stock</span>}
                                              {!isDispensed && isInsufficientStock && <span className="text-red-500 font-normal ml-2 px-1.5 py-0.5 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-[10px] uppercase tracking-wider">Insufficient: {stockQty} left</span>}
                                              {!isDispensed && canDispense && stockQty <= 10 && <span className="text-orange-500 font-normal ml-2 px-1.5 py-0.5 rounded-sm bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 text-[10px] uppercase tracking-wider">Low stock: {stockQty}</span>}
                                            </p>
                                            <p className="text-slate-500">{item.dosage} · {item.duration_days} days</p>
                                          </div>
                                        </div>
                                        <div className="font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-100">
                                          x{item.quantity}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 mt-auto">
                              <Button
                                onClick={() => handleDispense(rx.prescription_id)}
                                disabled={dispensingId === rx.prescription_id || !selectedItems[rx.prescription_id]?.length}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50"
                              >
                                {dispensingId === rx.prescription_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                Dispense Selected
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Package className="h-5 w-5 text-emerald-500" />
                      Medicine Inventory
                    </h2>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search medicines..."
                        value={searchMed}
                        onChange={(e) => setSearchMed(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:border-emerald-500 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                          <tr>
                            <th className="px-6 py-4">Medicine Name</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Strength</th>
                            <th className="px-6 py-4 text-right">Current Stock</th>
                            <th className="px-6 py-4 text-right">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredMeds.map((med) => {
                            const isLowStock = med.stock_quantity! <= 10;
                            const isOutOfStock = med.stock_quantity! === 0;
                            return (
                              <tr key={med.medicine_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                                  {med.medicine_name}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{med.medicine_type}</td>
                                <td className="px-6 py-4 text-slate-500">{med.strength}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">
                                  <span className={isOutOfStock ? "text-rose-500" : isLowStock ? "text-orange-500" : "text-slate-900 dark:text-slate-100"}>
                                    {med.stock_quantity}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {isOutOfStock ? (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Out of Stock</Badge>
                                  ) : isLowStock ? (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 inline-flex w-fit items-center gap-1">
                                      <AlertCircle className="h-3 w-3" /> Low Stock
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">In Stock</Badge>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRestockMed(med)}
                                    className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-100"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Restock
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredMeds.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                No medicines found matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Restock Dialog */}
      <Dialog open={!!restockMed} onOpenChange={(open) => !open && setRestockMed(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              Restock Medicine
            </DialogTitle>
            <DialogDescription>
              Add new stock units for <span className="font-bold text-slate-800 dark:text-slate-200">{restockMed?.medicine_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4 text-sm font-medium">
              <span className="text-slate-500">Current Stock</span>
              <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                {restockMed?.stock_quantity || 0}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Add</Label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
                className="rounded-xl border-slate-200"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockMed(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleRestock} disabled={!restockAmount || isRestocking} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {isRestocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
