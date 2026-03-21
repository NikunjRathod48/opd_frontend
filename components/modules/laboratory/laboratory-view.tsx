"use client";

import { useAuth, UserRole } from "@/context/auth-context";
import { useData, LaboratoryTest } from "@/context/data-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
  User,
  Loader2,
  Microscope,
  TestTube2,
  Activity,
  CalendarClock
} from "lucide-react";
import { useState, useEffect } from "react";

export function LaboratoryView() {
  const { user } = useAuth();
  const { fetchPendingLabTests, updateLabTestResult } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedTest, setSelectedTest] = useState<LaboratoryTest | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadTests = async () => {
    if (!user?.hospitalid) return;
    try {
      setIsLoading(true);
      const data = await fetchPendingLabTests(user.hospitalid.toString());
      setTests(data || []);
    } catch (e) {
      addToast("Failed to load laboratory tests", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.hospitalid && activeTab === "pending") {
      loadTests();
    }
  }, [user?.hospitalid, activeTab]);

  const handleCompleteTest = async () => {
    if (!selectedTest) return;
    try {
      setIsProcessing(true);
      await updateLabTestResult(
        selectedTest.opd_test_id.toString(), 
        "Completed", 
        resultSummary
      );
      addToast("Test marked as completed", "success");
      
      // Close modal and refresh
      setSelectedTest(null);
      setResultSummary("");
      loadTests();
    } catch (e: any) {
      addToast(e.message || "Failed to submit test results", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Currently we only have a "Pending" endpoint wired in Phase 4. 
  // We can filter `tests` for 'Ordered'/'In Progress' natively on frontend,
  // or just rely on backend which currently filters by NOT 'Completed'.
  const pendingTests = tests.filter((t) => t.test_status !== "Completed");

  const filteredTests = pendingTests.filter((t) => {
    const term = searchQuery.toLowerCase();
    const pName = t.opd_visits?.patients?.users_patients_user_idTousers?.full_name?.toLowerCase() || "";
    const testName = t.tests?.test_name.toLowerCase() || "";
    const opdNo = t.opd_visits?.opd_no.toLowerCase() || "";
    return pName.includes(term) || testName.includes(term) || opdNo.includes(term);
  });

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950 p-6 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-500 mb-2">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl">
                  <Microscope className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Laboratory
                </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
                Process diagnostics, record findings, and manage test queue.
              </p>
            </div>
            
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab("pending")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
                  activeTab === "pending"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Activity className="h-4 w-4" />
                Pending Orders
              </button>
              {/* Note: Completed tab acts as placeholder for a future /completed endpoint */}
              <button
                onClick={() => {
                  setActiveTab("completed");
                  addToast("Historical test view coming soon", "info");
                  setActiveTab("pending");
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
                  activeTab === "completed"
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </button>
            </div>
          </div>

          {/* Main List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-indigo-500" />
                  Tests Queue
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search patient, test, or OPD no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-transparent focus:border-indigo-500 rounded-xl"
                  />
                </div>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                  <p>Loading pending laboratory tests...</p>
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <CheckCircle2 className="h-12 w-12 text-indigo-100 dark:text-indigo-900/50 mb-4" />
                  <p className="text-lg font-bold text-slate-600">Queue is Clear!</p>
                  <p className="text-sm">No pending tests require processing at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTests.map((test) => (
                    <div
                      key={test.opd_test_id}
                      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      <div className="p-5 flex-1 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                              {test.tests?.test_name}
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
                              CODE: {test.tests?.test_code || "N/A"}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                            {test.test_status}
                          </Badge>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" /> 
                            <span className="text-slate-900 dark:text-slate-100 font-bold">
                              {test.opd_visits?.patients?.users_patients_user_idTousers?.full_name || "Unknown Patient"}
                            </span>
                          </p>
                           <p className="font-medium flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-slate-400" /> 
                            <span className="text-slate-500">
                              Ordered {new Date(test.ordered_at).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                        
                        <div className="text-xs text-slate-500 font-medium">
                          Ref: Dr. {test.opd_visits?.doctors?.users_doctors_user_idTousers?.full_name} (OPD: {test.opd_visits?.opd_no})
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 mt-auto">
                        <Button
                          onClick={() => setSelectedTest(test)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 font-bold"
                        >
                          <TestTube2 className="h-4 w-4 mr-2" />
                          Process Results
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Result Entry Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={(open) => {
        if (!open) {
          setSelectedTest(null);
          setResultSummary("");
        }
      }}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Microscope className="h-5 w-5 text-indigo-600" />
              Enter Test Results
            </DialogTitle>
            <DialogDescription>
              Record the findings for this diagnostic test. Generating reports is handled independently.
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Test</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedTest.tests?.test_name}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Patient</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedTest.opd_visits?.patients?.users_patients_user_idTousers?.full_name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="result_summary" className="font-bold">Clinical Findings / Summary</Label>
                <Textarea
                  id="result_summary"
                  placeholder="e.g. Hemoglobin: 14.2 g/dL, WBC: 8.5 x 10^9/L. All parameters within normal ranges."
                  rows={5}
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  className="rounded-xl border-slate-200 resize-none font-medium leading-relaxed"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedTest(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteTest} 
              disabled={!resultSummary.trim() || isProcessing} 
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Complete & Sign Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
