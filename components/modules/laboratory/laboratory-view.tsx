"use client";

import { useAuth } from "@/context/auth-context";
import { useData, LaboratoryTest } from "@/context/data-context";
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
  CalendarClock,
  Plus,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";

export function LaboratoryView() {
  const { user } = useAuth();
  const { fetchPendingLabTests, fetchCompletedLabTests, updateLabTestResult } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTest, setSelectedTest] = useState<LaboratoryTest | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [parameters, setParameters] = useState([{ name: "", value: "", unit: "", range: "" }]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadTests = async () => {
    if (!user?.hospitalid) return;
    setTests([]);
    try {
      setIsLoading(true);
      if (activeTab === "pending") {
        const data = await fetchPendingLabTests(user.hospitalid.toString());
        setTests(data || []);
      } else {
        const data = await fetchCompletedLabTests(user.hospitalid.toString());
        setTests(data || []);
      }
    } catch (e) {
      addToast("Failed to load laboratory tests", "error");
      setTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.hospitalid) {
      loadTests();
    }
  }, [user?.hospitalid, activeTab]);

  const handleStartProcessing = async (testToStart: LaboratoryTest) => {
    try {
      await updateLabTestResult(testToStart.opd_test_id.toString(), "Sample Collected");
      addToast("Sample collected and marked as processing", "success");
      loadTests();
    } catch (e: any) {
      addToast(e.message || "Failed to start processing", "error");
    }
  };

  const handleOpenResults = (test: LaboratoryTest) => {
    setSelectedTest(test);

    // Direct feed from database Test Parameters
    const dbParams = (test.tests as any)?.test_parameters;

    if (dbParams && dbParams.length > 0) {
      const mappedParams = dbParams.map((p: any) => ({
        name: p.parameter_name || "",
        value: "",
        unit: p.unit || "",
        range: p.normal_range || ""
      }));
      setParameters(mappedParams);
    } else {
      setParameters([{ name: "", value: "", unit: "", range: "" }]);
    }
  };

  const handleCompleteTest = async () => {
    if (!selectedTest) return;
    try {
      setIsProcessing(true);

      const payload = {
        type: "structured",
        parameters: parameters.filter(p => p.name.trim() !== ""),
        remarks: resultSummary
      };

      await updateLabTestResult(
        selectedTest.opd_test_id.toString(),
        "Completed",
        JSON.stringify(payload)
      );
      addToast("Test marked as completed", "success");

      // Close modal and refresh
      setSelectedTest(null);
      setResultSummary("");
      setParameters([{ name: "", value: "", unit: "", range: "" }]);
      loadTests();
    } catch (e: any) {
      addToast(e.message || "Failed to submit test results", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePDF = async (test: LaboratoryTest) => {
    try {
      const { downloadLabReportPDF } = await import("@/lib/pdf-generator");
      await downloadLabReportPDF(test);
      addToast("Laboratory Report exported successfully", "info");
    } catch (e: any) {
      addToast(e.message || "Failed to generate report", "error");
    }
  };

  const filteredTests = tests.filter((t) => {
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
              <button
                onClick={() => setActiveTab("completed")}
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
                {activeTab === "pending" ? "Tests Queue" : "Completed Reports"}
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

                        {activeTab === "completed" && test.completed_at && (
                          <div className="text-xs text-indigo-500 font-semibold mb-2 flex items-center gap-1.5 ml-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed {new Date(test.completed_at).toLocaleDateString()}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 font-medium">
                          Ref: Dr. {test.opd_visits?.doctors?.users_doctors_user_idTousers?.full_name} (OPD: {test.opd_visits?.opd_no})
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 mt-auto">
                        {activeTab === "pending" ? (
                          test.test_status === "Ordered" ? (
                            <Button
                              onClick={() => handleStartProcessing(test)}
                              className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl shadow-md font-bold"
                            >
                              <Microscope className="h-4 w-4 mr-2" />
                              Start Processing
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleOpenResults(test)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 font-bold"
                            >
                              <TestTube2 className="h-4 w-4 mr-2" />
                              Enter Results
                            </Button>
                          )
                        ) : (
                          <Button
                            onClick={() => handleGeneratePDF(test)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 font-bold"
                          >
                            <TestTube2 className="h-4 w-4 mr-2" />
                            Generate Report PDF
                          </Button>
                        )}
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
          setParameters([{ name: "", value: "", unit: "", range: "" }]);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Microscope className="h-5 w-5 text-indigo-600" />
              Enter Test Results
            </DialogTitle>
            <DialogDescription>
              Record the findings for this diagnostic test. Provide parameters for tabular data.
            </DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="flex-1 overflow-y-auto scrollbar-thin -mx-6 px-6">
              <div className="space-y-6 py-4">
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

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-slate-700 dark:text-slate-200">Test Parameters</Label>
                    <Button
                      onClick={() => setParameters([...parameters, { name: "", value: "", unit: "", range: "" }])}
                      variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                    </Button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider p-3 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <div className="col-span-4">Parameter Name</div>
                      <div className="col-span-3">Result Value</div>
                      <div className="col-span-2">Unit</div>
                      <div className="col-span-2">Normal Range</div>
                      <div className="col-span-1 text-center">Act</div>
                    </div>

                    <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                      {parameters.map((param, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-4 h-8 text-sm" placeholder="e.g. Hemoglobin"
                            value={param.name} onChange={(e) => {
                              const newParams = [...parameters];
                              newParams[index].name = e.target.value;
                              setParameters(newParams);
                            }}
                          />
                          <Input
                            className="col-span-3 h-8 text-sm font-medium" placeholder="Value"
                            value={param.value} onChange={(e) => {
                              const newParams = [...parameters];
                              newParams[index].value = e.target.value;
                              setParameters(newParams);
                            }}
                          />
                          <Input
                            className="col-span-2 h-8 text-sm" placeholder="e.g. g/dL"
                            value={param.unit} onChange={(e) => {
                              const newParams = [...parameters];
                              newParams[index].unit = e.target.value;
                              setParameters(newParams);
                            }}
                          />
                          <Input
                            className="col-span-2 h-8 text-sm" placeholder="e.g. 13-17"
                            value={param.range} onChange={(e) => {
                              const newParams = [...parameters];
                              newParams[index].range = e.target.value;
                              setParameters(newParams);
                            }}
                          />
                          <Button
                            variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 mx-auto"
                            onClick={() => {
                              if (parameters.length > 1) {
                                const newParams = [...parameters];
                                newParams.splice(index, 1);
                                setParameters(newParams);
                              }
                            }}
                            disabled={parameters.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="result_summary" className="font-bold text-slate-700 dark:text-slate-200">Clinical Remarks / General Summary</Label>
                  <Textarea
                    id="result_summary"
                    placeholder="Enter any general findings or doctor's remarks here..."
                    rows={3}
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                    className="rounded-xl border-slate-200 resize-none font-medium leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-4">
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
