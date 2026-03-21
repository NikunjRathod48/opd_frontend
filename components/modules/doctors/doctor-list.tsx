import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData, Doctor } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Shield,
  Building,
  Eye,
  Pencil,
  Mail,
  Phone,
  MapPin,
  User as UserIcon,
  X,
  Activity,
  Stethoscope,
  GraduationCap,
  Banknote,
  Calendar,
  Clock,
  Filter,
  EyeOff,
  Lock,
  FileText,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "@/components/ui/loader";
import { DoctorScheduleModal } from "./doctor-schedule";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } },
};

// --- Schemas ---

const doctorSchema = z.object({
  // Personal
  full_name: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z
    .string()
    .length(10, "Phone number must be 10 digits")
    .regex(/^\d+$/, "Numeric only"),
  password: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^\S*$/.test(val);
    }, "Password must not contain spaces")
    .refine((val) => {
      if (!val) return true;
      return val.length >= 6;
    }, "Password must be at least 6 characters"),
  gender: z.enum(["Male", "Female", "Other"]),

  // Professional
  hospital_id: z.string().min(1, "Hospital is required"),
  department_id: z.string().min(1, "Department is required"),
  specialization_id: z.string().min(1, "Specialization is required"),
  qualification: z.string().min(1, "Qualification is required"),
  medical_license_no: z.string().min(1, "License number is required"),
  experience_years: z.coerce.number().min(0, "Experience must be positive"),
  consultation_fees: z.coerce.number().min(0, "Fees must be positive"),
  description: z.string().optional(),

  // Status
  is_available: z.boolean().default(true),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

export function DoctorList({ allowedRoles, hospitalId }: { allowedRoles?: string[], hospitalId?: string }) {
  const {
    doctors,
    hospitals,
    specializations,
    refreshDoctors,
    hospitalGroups,
  } = useData();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [fetchedDoctors, setFetchedDoctors] = useState<Doctor[]>(doctors);
  const [isLoading, setIsLoading] = useState(doctors.length === 0);

  // UI States
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pending Filters (Controlled by Inputs)
  const [tempFilters, setTempFilters] = useState({
    generalSearch: "",
    status: "all",
    spec: "all",
    hospital: "all",
    gender: "all",
    dept: "all",
    qual: "all",
    expMin: "",
    expMax: "",
    feesMin: "",
    feesMax: "",
  });

  // Applied Filters (Used for Filtering List)
  const [appliedFilters, setAppliedFilters] = useState({
    generalSearch: "",
    status: "all",
    spec: "all",
    hospital: "all",
    gender: "all",
    dept: "all",
    qual: "all",
    expMin: "",
    expMax: "",
    feesMin: "",
    feesMax: "",
  });

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [viewSchedule, setViewSchedule] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Fetch Schedule for View Mode
  useEffect(() => {
    if (isModalOpen && modalMode === "view" && selectedDoctor) {
      const fetchViewSchedule = async () => {
        setIsLoadingSchedule(true);
        try {
          const token = JSON.parse(
            localStorage.getItem("medcore_user") || "{}",
          ).access_token;
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com"}/doctors/${selectedDoctor.doctorid}/availability`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            const data = await res.json();
            // Fill missing days
            const fullSchedule = Array.from({ length: 7 }, (_, i) => {
              const existing = data.find((d: any) => d.day_of_week === i);
              return existing || { day_of_week: i, is_available: false };
            });
            setViewSchedule(fullSchedule);
          }
        } catch (e) {
          console.error("Failed to load schedule", e);
        } finally {
          setIsLoadingSchedule(false);
        }
      };
      fetchViewSchedule();
    } else {
      setViewSchedule([]);
    }
  }, [isModalOpen, modalMode, selectedDoctor]);

  // Form & Upload
  const [profileImage, setProfileImage] = useState<File | string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hospitalDepartments, setHospitalDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema) as any,
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      password: "",
      gender: "Male",
      hospital_id: "",
      department_id: "",
      specialization_id: "",
      qualification: "",
      medical_license_no: "",
      experience_years: 0,
      consultation_fees: 0,
      description: "",
      is_available: true,
    },
  });

  // Effect to sync context data and handle loading
  useEffect(() => {
    if (doctors.length > 0) {
      setFetchedDoctors(doctors);
      setIsLoading(false);
    } else {
      // Only set loading if we genuinely have no data and are expecting it
      // Since context initializes empty, we might want a timeout to stop spinner if DB is truly empty
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [doctors]);

  // Fetch Departments when Hospital Changes
  const selectedHospitalId = form.watch("hospital_id");
  useEffect(() => {
    if (selectedHospitalId) {
      // In a real app, fetch departments for this hospital from API
      // For now, mock or empty. I'll add a fetch call later or assume fetched
      // Let's use a quick fetch
      const fetchDepts = async () => {
        try {
          const token = JSON.parse(
            localStorage.getItem("medcore_user") || "{}",
          ).access_token;
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com"}/doctors/departments/${selectedHospitalId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setHospitalDepartments(
              data.map((d: any) => ({
                id: String(d.department_id),
                name: d.departments_master.department_name,
              })),
            );
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchDepts();
    } else {
      setHospitalDepartments([]);
    }
  }, [selectedHospitalId]);

  // Handlers
  const handleHospitalChange = (val: string) => {
    form.setValue("hospital_id", val);
    form.setValue("department_id", ""); // Reset department when hospital changes
  };

  // Update pending state helper
  const updateFilter = (key: keyof typeof tempFilters, value: string) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Apply Filters Handler
  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setIsFilterOpen(false);
  };

  // Reset Filters Handler
  const resetFilters = () => {
    const defaultFilters = {
      generalSearch: "",
      status: "all",
      spec: "all",
      hospital: "all",
      gender: "all",
      dept: "all",
      qual: "all",
      expMin: "",
      expMax: "",
      feesMin: "",
      feesMax: "",
    };
    setTempFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  // Sync General Search outside of panel (if we want realtime search for the top bar INPUT)
  // NOTE: The user requested "Apply on Click".
  // Usually "General Search" on top bar is Realtime, and "Advanced Filters" are Apply on Click.
  // However, the previous code had 'generalSearch' inside the Filter Panel too (as "Name, Email...").
  // Let's keep the pending/apply logic consistent for the panel.
  // BUT, if there is a top-bar search, we should probably keep it realtime?
  // Looking at the UI code, "generalSearch" is in the panel.
  // So distinct Apply action is fine.

  const filteredDoctors = fetchedDoctors.filter((doc) => {
    const effectiveHospitalId = hospitalId || (['HospitalAdmin', 'Receptionist'].includes(user?.role || '') ? user?.hospitalid : undefined);
    if (effectiveHospitalId && String(doc.hospitalid) !== String(effectiveHospitalId)) return false;

    const {
      generalSearch,
      status,
      spec,
      hospital,
      gender,
      dept,
      qual,
      expMin,
      expMax,
      feesMin,
      feesMax,
    } = appliedFilters;

    const matchesGeneral =
      doc.doctorname?.toLowerCase().includes(generalSearch.toLowerCase()) ||
      (doc.email &&
        doc.email.toLowerCase().includes(generalSearch.toLowerCase())) ||
      (doc.contact && doc.contact.includes(generalSearch));

    const matchesStatus =
      status === "all" || (status === "active" ? doc.isactive : !doc.isactive);
    const matchesSpec = spec === "all" || doc.specializationid === spec;
    const matchesHospital = hospital === "all" || doc.hospitalid === hospital;
    const matchesGender = gender === "all" || doc.gender === gender;
    const matchesDept = dept === "all" || doc.departmentid === dept;
    const matchesQual =
      qual === "all" || (doc.qualification && doc.qualification.includes(qual));

    const exp = doc.experience || 0;
    const fees = doc.consultation_fees || doc.fees || 0;

    const matchesExp =
      (!expMin || exp >= Number(expMin)) && (!expMax || exp <= Number(expMax));
    const matchesFees =
      (!feesMin || fees >= Number(feesMin)) &&
      (!feesMax || fees <= Number(feesMax));

    return (
      matchesGeneral &&
      matchesStatus &&
      matchesSpec &&
      matchesHospital &&
      matchesGender &&
      matchesDept &&
      matchesQual &&
      matchesExp &&
      matchesFees
    );
  });

  // Sub-components Data
  const uniqueSpecs = specializations.map((s) => ({
    label: s.specializationname || "",
    value: s.specializationid || "",
  }));
  const uniqueHospitals = hospitals.map((h) => ({
    label: h.hospitalname || "",
    value: h.hospitalid || "",
  }));

  // Extract Unique Departments and Qualifications from fetched doctors
  const uniqueDepts = Array.from(
    new Set(
      fetchedDoctors.map((d) =>
        JSON.stringify({
          id: d.departmentid,
          name: d.departmentName || "General",
        }),
      ),
    ),
  )
    .map((s) => JSON.parse(s) as { id: string; name: string })
    .filter((d) => d.id && d.name);

  const uniqueQuals = Array.from(
    new Set(
      fetchedDoctors
        .map((d) => d.qualification)
        .filter((q): q is string => !!q),
    ),
  );

  // Handlers
  const handleOpenAdd = () => {
    form.reset({
      full_name: "",
      email: "",
      phone_number: "",
      password: "",
      gender: "Male",
      hospital_id: "",
      department_id: "",
      specialization_id: "",
      qualification: "",
      medical_license_no: "",
      experience_years: 0,
      consultation_fees: 0,
      description: "",
      is_available: true,
    });
    setProfileImage(null);
    setModalMode("add");
    setActiveTab("personal");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setSelectedDoctor(doc);
    form.reset({
      full_name: doc.doctorname,
      email: doc.email || "",
      phone_number: doc.contact || "",
      password: "",
      gender: (doc.gender as any) || "Male",
      hospital_id: doc.hospitalid,
      department_id: doc.departmentid,
      specialization_id: doc.specializationid,
      qualification: doc.qualification || "",
      medical_license_no: doc.medical_license_no || "", // Correctly map from fetched data
      experience_years: doc.experience || 0,
      consultation_fees: doc.fees || 0,
      description: "", // If description exists in extended type
      is_available: doc.isactive, // Mapping active to available for simple edit
    });
    setProfileImage(doc.profile_image_url || null);
    setModalMode("edit");
    setActiveTab("personal");
    setIsModalOpen(true);
  };

  const handleOpenView = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setProfileImage(doc.profile_image_url || null);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleOpenSchedule = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setIsScheduleOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode("add");
      setSelectedDoctor(null);
    }, 300);
  };

  const onSubmit = async (data: DoctorFormValues) => {
    if (modalMode === "add" && !data.password) {
      form.setError("password", { message: "Password is required" });
      return;
    }

    try {
      const token = JSON.parse(
        localStorage.getItem("medcore_user") || "{}",
      ).access_token;
      const formData = new FormData();

      // Personal
      formData.append("full_name", data.full_name);
      formData.append("email", data.email);
      formData.append("phone_number", data.phone_number);
      if (data.password) formData.append("password", data.password);
      formData.append("gender", data.gender);

      // Professional
      formData.append("hospital_id", data.hospital_id);
      formData.append("department_id", data.department_id);
      formData.append("specialization_id", data.specialization_id);
      formData.append("qualification", data.qualification);
      formData.append("medical_license_no", data.medical_license_no);
      formData.append("experience_years", data.experience_years.toString());
      formData.append("consultation_fees", data.consultation_fees.toString());
      formData.append("description", data.description || "");
      formData.append("is_available", String(data.is_available));

      if (profileImage && profileImage instanceof File) {
        formData.append("file", profileImage);
      }

      const url =
        modalMode === "add"
          ? `${process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com"}/doctors`
          : `${process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com"}/doctors/${selectedDoctor?.doctorid}`;

      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save doctor");
      }

      addToast(
        `Doctor ${modalMode === "add" ? "registered" : "updated"} successfully`,
        "success",
      );

      await refreshDoctors(); // Ensure this completes
      handleCancel();
    } catch (error: any) {
      addToast(error.message, "error");
    }
  };

  const onError = (errors: any) => {
    console.log("Form Errors:", errors);
    const personalFields = [
      "full_name",
      "email",
      "phone_number",
      "password",
      "gender",
    ];
    const professionalFields = [
      "hospital_id",
      "department_id",
      "specialization_id",
      "qualification",
      "medical_license_no",
      "experience_years",
      "consultation_fees",
    ];

    const hasPersonalError = personalFields.some((field) => errors[field]);
    const hasProfessionalError = professionalFields.some(
      (field) => errors[field],
    );

    if (hasPersonalError) {
      setActiveTab("personal");
      addToast("Please check Personal Details for errors", "error");
    } else if (hasProfessionalError) {
      setActiveTab("professional");
      addToast("Please check Professional Info for errors", "error");
    } else {
      // Fallback or other tabs
      setActiveTab("availability");
      addToast("Please check form for errors", "error");
    }
  };

  if (isLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader size="lg" text="Loading Doctors..." /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-1">
            Doctor Management
          </h2>
          <p className="text-muted-foreground/80 font-medium text-lg mt-1">
            Manage medical staff, qualifications, and assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={isFilterOpen ? "secondary" : "outline"}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "gap-2 rounded-xl h-11 px-5",
              isFilterOpen && "bg-white/20",
            )}
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Tooltip content="Register New Doctor">
            <Button
              onClick={handleOpenAdd}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-6 h-11 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Doctor
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Floating Glassmorphism Filter Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="mb-8 z-10 relative"
          >
            <div className="bg-white/60 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-border dark:border-border/50 shadow-neo-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600" /> Advanced Filters
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setIsFilterOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* General Search */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    General Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, Email, Phone..."
                      value={tempFilters.generalSearch}
                      onChange={(e) =>
                        updateFilter("generalSearch", e.target.value)
                      }
                      className="h-10 pl-9 bg-background/50 border-white/20 focus:bg-background transition-all rounded-xl"
                    />
                  </div>
                </div>

                {/* Specialization */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Specialization
                  </Label>
                  <SearchableSelect
                    options={uniqueSpecs}
                    value={tempFilters.spec === "all" ? "" : tempFilters.spec}
                    onChange={(val) => updateFilter("spec", val || "all")}
                    placeholder="All Specializations"
                    className="w-full"
                  />
                </div>

                {/* Hospital */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Hospital
                  </Label>
                  <SearchableSelect
                    options={uniqueHospitals}
                    value={
                      tempFilters.hospital === "all" ? "" : tempFilters.hospital
                    }
                    onChange={(val) => updateFilter("hospital", val || "all")}
                    placeholder="All Hospitals"
                    className="w-full"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Status
                  </Label>
                  <Select
                    value={tempFilters.status}
                    onValueChange={(val) => updateFilter("status", val)}
                  >
                    <SelectTrigger className="h-10 bg-white/50 dark:bg-slate-950/50 border-input hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl w-full shadow-sm">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Gender
                  </Label>
                  <Select
                    value={tempFilters.gender}
                    onValueChange={(val) => updateFilter("gender", val)}
                  >
                    <SelectTrigger className="h-10 bg-white/50 dark:bg-slate-950/50 border-input hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl w-full shadow-sm">
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Department
                  </Label>
                  <SearchableSelect
                    options={uniqueDepts.map((d) => ({
                      label: d.name,
                      value: d.id,
                    }))}
                    value={tempFilters.dept === "all" ? "" : tempFilters.dept}
                    onChange={(val) => updateFilter("dept", val || "all")}
                    placeholder="All Departments"
                    className="w-full"
                  />
                </div>

                {/* Qualification */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Qualification
                  </Label>
                  <SearchableSelect
                    options={uniqueQuals.map((q) => ({ label: q, value: q }))}
                    value={tempFilters.qual === "all" ? "" : tempFilters.qual}
                    onChange={(val) => updateFilter("qual", val || "all")}
                    placeholder="All Qualifications"
                    className="w-full"
                  />
                </div>

                {/* Experience Range */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Experience (Years)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={tempFilters.expMin}
                      onChange={(e) => updateFilter("expMin", e.target.value)}
                      className="h-10 bg-white/50 dark:bg-slate-950/50 rounded-xl"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={tempFilters.expMax}
                      onChange={(e) => updateFilter("expMax", e.target.value)}
                      className="h-10 bg-white/50 dark:bg-slate-950/50 rounded-xl"
                    />
                  </div>
                </div>

                {/* Fees Range */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-1">
                    Fees (₹)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={tempFilters.feesMin}
                      onChange={(e) => updateFilter("feesMin", e.target.value)}
                      className="h-10 bg-white/50 dark:bg-slate-950/50 rounded-xl"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={tempFilters.feesMax}
                      onChange={(e) => updateFilter("feesMax", e.target.value)}
                      className="h-10 bg-white/50 dark:bg-slate-950/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border/40">
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="text-muted-foreground hover:text-foreground h-11 px-6 rounded-xl"
                >
                  Clear All
                </Button>
                <Button
                  onClick={applyFilters}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 h-11 px-8 font-semibold"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredDoctors.map((doctor) => (
          <Card
            key={doctor.doctorid}
            className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 rounded-[2rem]"
          >
            {/* Action Buttons - Always visible */}
            <div className="absolute top-4 right-4 flex gap-2 z-10 translate-x-0 opacity-100">
              <Tooltip content="View Details">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-sm bg-white/80 hover:bg-blue-50 text-blue-600 border border-transparent hover:border-blue-200 transition-all"
                  onClick={() => handleOpenView(doctor)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Edit Doctor">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-sm bg-white/80 hover:bg-indigo-50 text-indigo-600 border border-transparent hover:border-indigo-200 transition-all"
                  onClick={() => handleOpenEdit(doctor)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Manage Schedule">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-sm bg-white/80 hover:bg-emerald-50 text-emerald-600 border border-transparent hover:border-emerald-200 transition-all"
                  onClick={() => handleOpenSchedule(doctor)}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            <CardHeader className="flex flex-col items-center pt-8 pb-2">
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full p-1 bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-700">
                  <div className="h-full w-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {doctor.profile_image_url ? (
                      <img
                        src={doctor.profile_image_url}
                        alt={doctor.doctorname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-blue-600">
                        {doctor.doctorname?.charAt(0) || "D"}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center",
                    doctor.isactive ? "bg-emerald-500" : "bg-rose-500",
                  )}
                >
                  {doctor.isactive ? (
                    <Activity className="h-3 w-3 text-white" />
                  ) : (
                    <X className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
              <CardTitle className="text-lg font-bold text-center mb-1">
                {doctor.doctorname}
              </CardTitle>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                <Stethoscope className="h-3 w-3" />
                {doctor.specializationName}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-8 gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground w-full justify-center">
                <Mail className="h-3 w-3" />
                <span
                  className="truncate max-w-[180px] text-center"
                  title={doctor.email}
                >
                  {doctor.email || "No Email"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground w-full justify-center">
                <Phone className="h-3 w-3" />
                <span>{doctor.contact || "No Contact"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredDoctors.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="col-span-full flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-200 dark:border-slate-800 text-center shadow-sm"
        >
          <div className="h-20 w-20 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Stethoscope className="h-10 w-10 text-blue-500/50" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            No doctors found
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Try adjusting your search or filters to find what you're looking
            for.
          </p>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="mt-6 rounded-full px-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800 shadow-sm hover:shadow-md transition-all"
          >
            Clear Filters
          </Button>
        </motion.div>
      )}
      {/* Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <DialogContent
          className={cn(
            "border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden [&>button]:hidden flex flex-col",
            modalMode === "view"
              ? "w-[95vw] md:w-full max-w-4xl h-[85vh] rounded-2xl md:rounded-[2.5rem]"
              : "w-[95vw] md:w-full max-w-2xl max-h-[90vh] rounded-2xl md:rounded-[2.5rem]",
          )}
        >
          {/* Header - Conditional Rendering based on Mode */}
          {modalMode !== "view" && (
            <div className="relative h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 w-full shrink-0 flex items-center px-6 md:px-8">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
              <div className="flex items-center gap-4 relative z-10 text-white w-full">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30 flex items-center justify-center shrink-0">
                  {modalMode === "edit" ? (
                    <Pencil className="h-5 w-5 text-white" />
                  ) : (
                    <Plus className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-white drop-shadow-sm">
                    {modalMode === "edit"
                      ? "Update Doctor Profile"
                      : "Register New Doctor"}
                  </DialogTitle>
                  <DialogDescription className="text-white/80 font-medium text-xs hidden md:block">
                    {modalMode === "edit"
                      ? "Modify professional details."
                      : "Onboard medical staff."}
                  </DialogDescription>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-auto h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                  onClick={handleCancel}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {modalMode === "view" && selectedDoctor ? (
            <div className="flex flex-col h-full w-full bg-muted/5 relative">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {/* Header Background */}
                <div className="h-32 md:h-40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative shrink-0">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                  <div className="absolute top-4 right-4 z-10">
                    <Tooltip content="Close">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
                        onClick={handleCancel}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                {/* Content Container - Negative Margin for Overlap */}
                <div className="px-4 md:px-8 pb-8 -mt-16 md:-mt-20 relative z-10">
                  {/* Profile Row */}
                  <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-32 w-32 md:h-40 md:w-40 rounded-[2rem] bg-background p-1.5 shadow-2xl relative shrink-0"
                    >
                      <div className="h-full w-full rounded-[1.7rem] overflow-hidden bg-white flex items-center justify-center">
                        {selectedDoctor.profile_image_url ? (
                          <img
                            src={selectedDoctor.profile_image_url}
                            alt={selectedDoctor.doctorname}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl md:text-6xl font-bold text-blue-600">
                            {selectedDoctor.doctorname?.charAt(0) || "D"}
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "absolute bottom-3 right-3 h-6 w-6 md:h-7 md:w-7 rounded-full border-[4px] border-background flex items-center justify-center shadow-sm",
                          selectedDoctor.isactive
                            ? "bg-emerald-500"
                            : "bg-rose-500",
                        )}
                      />
                    </motion.div>

                    <div className="flex-1 space-y-2 mb-2 text-center md:text-left w-full">
                      <div>
                        <DialogTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                          {selectedDoctor.doctorname}
                        </DialogTitle>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                          <div className="px-3 py-1 rounded-full text-blue-700 bg-blue-50 border border-blue-100 flex items-center gap-1.5 text-xs md:text-sm font-semibold shrink-0">
                            <Stethoscope className="h-3.5 w-3.5" />
                            {selectedDoctor.specializationName}
                          </div>
                          <div className="px-3 py-1 rounded-full text-indigo-700 bg-indigo-50 border border-indigo-100 flex items-center gap-1.5 text-xs md:text-sm font-semibold shrink-0">
                            <Building className="h-3.5 w-3.5" />
                            {selectedDoctor.hospitalName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System IDs Row */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-muted-foreground border border-slate-200 dark:border-slate-700">
                      <span className="uppercase font-bold tracking-wider text-slate-500">
                        Doctor ID:
                      </span>
                      <span className="font-semibold text-foreground">
                        {selectedDoctor.doctorid}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-muted-foreground border border-slate-200 dark:border-slate-700">
                      <span className="uppercase font-bold tracking-wider text-slate-500">
                        User ID:
                      </span>
                      <span className="font-semibold text-foreground">
                        {selectedDoctor.userid}
                      </span>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Details */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="h-full border border-border/50 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                            <UserIcon className="h-4 w-4" /> Personal Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 md:space-y-4">
                          <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col overflow-hidden min-w-0">
                              <span className="text-xs text-muted-foreground font-medium">
                                Email Address
                              </span>
                              <span
                                className="text-sm font-semibold truncate"
                                title={selectedDoctor.email}
                              >
                                {selectedDoctor.email || "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                              <Phone className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground font-medium">
                                Contact Number
                              </span>
                              <span className="text-sm font-semibold">
                                {selectedDoctor.contact || "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                              <UserIcon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground font-medium">
                                Gender
                              </span>
                              <span className="text-sm font-semibold">
                                {selectedDoctor.gender || "N/A"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Professional Info */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="h-full border border-border/50 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                            <Building className="h-4 w-4" /> Professional Info
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 md:space-y-4">
                          <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                              <Building className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col overflow-hidden min-w-0">
                              <span className="text-xs text-muted-foreground font-medium">
                                Hospital
                              </span>
                              <span className="text-sm font-semibold truncate">
                                {selectedDoctor.hospitalName || "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                                <Activity className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Department
                                </span>
                                <span className="text-sm font-semibold truncate">
                                  {selectedDoctor.departmentName || "General"}
                                </span>
                              </div>
                            </div>
                            <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                                <Clock className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Experience
                                </span>
                                <span className="text-sm font-semibold">
                                  {selectedDoctor.experience} Years
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                              <GraduationCap className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col overflow-hidden min-w-0">
                              <span className="text-xs text-muted-foreground font-medium">
                                Qualification
                              </span>
                              <span
                                className="text-sm font-semibold truncate"
                                title={selectedDoctor.qualification}
                              >
                                {selectedDoctor.qualification || "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="group flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground font-medium">
                                Medical License
                              </span>
                              <span className="text-sm font-semibold font-mono">
                                {selectedDoctor.medical_license_no || "N/A"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Availability & Bio - Span 2 cols */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="col-span-1 md:col-span-2"
                    >
                      <Card className="border border-border/50 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Availability & Bio
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-white/20">
                            <div className="group flex flex-col gap-1 items-center text-center p-2 rounded-lg hover:bg-white/40 transition-colors">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                                <Banknote className="h-4 w-4" />
                              </div>
                              <span className="text-xs text-muted-foreground font-medium uppercase">
                                Consultation
                              </span>
                              <span className="text-lg font-bold text-emerald-700">
                                ₹
                                {selectedDoctor.consultation_fees ||
                                  selectedDoctor.fees ||
                                  0}
                              </span>
                            </div>

                            <div className="group flex flex-col gap-1 items-center text-center p-2 rounded-lg hover:bg-white/40 transition-colors">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                                <Activity className="h-4 w-4" />
                              </div>
                              <span className="text-xs text-muted-foreground font-medium uppercase">
                                Status
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-bold px-2 py-0.5 rounded-full",
                                  selectedDoctor.isactive
                                    ? "bg-emerald-200 text-emerald-800"
                                    : "bg-rose-200 text-rose-800",
                                )}
                              >
                                {selectedDoctor.isactive
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </div>

                            {/* Schedule Grid */}
                            <div className="col-span-2 md:col-span-4 mt-2">
                              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wide block mb-3 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Weekly
                                Schedule
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {isLoadingSchedule ? (
                                  <div className="col-span-full py-4 flex justify-center text-muted-foreground text-sm">
                                    Loading schedule...
                                  </div>
                                ) : viewSchedule.length > 0 ? (
                                  viewSchedule.map((day: any) => (
                                    <div
                                      key={day.day_of_week}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg border text-sm transition-colors",
                                        day.is_available
                                          ? "bg-white/50 dark:bg-slate-800/50 border-emerald-100 dark:border-emerald-900/30"
                                          : "bg-slate-50 dark:bg-slate-900/30 border-transparent opacity-60",
                                      )}
                                    >
                                      <span className="font-semibold text-muted-foreground w-20">
                                        {
                                          [
                                            "Sun",
                                            "Mon",
                                            "Tue",
                                            "Wed",
                                            "Thu",
                                            "Fri",
                                            "Sat",
                                          ][day.day_of_week]
                                        }
                                      </span>
                                      {day.is_available ? (
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400 text-xs">
                                          {day.start_time} - {day.end_time}
                                        </span>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="h-5 text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500"
                                        >
                                          Closed
                                        </Badge>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-full py-2 text-center text-sm text-muted-foreground italic">
                                    No schedule set.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wide block mb-2 flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5" /> Biography
                            </span>
                            <p className="text-sm text-muted-foreground leading-relaxed bg-white/40 dark:bg-black/10 p-4 rounded-xl border border-white/10">
                              {(() => {
                                const bio = (selectedDoctor as any).description;
                                if (bio) return bio;
                                return `${selectedDoctor.doctorname} is a highly skilled ${selectedDoctor.specializationName} with over ${selectedDoctor.experience} years of experience in the field. Currently practicing at ${selectedDoctor.hospitalName}, they are dedicated to providing top-quality patient care.`;
                              })()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 md:p-6 border-t border-border/40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl grid grid-cols-2 md:flex md:justify-end gap-3 shrink-0 relative z-20">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCancel}
                  className="col-span-2 md:col-auto order-3 md:order-1 rounded-xl px-6 md:px-8 border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white text-sm md:text-base h-10 md:h-11 font-medium"
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsScheduleOpen(true)}
                  className="col-span-1 md:col-auto order-1 md:order-2 rounded-xl px-4 md:px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20 text-xs md:text-base h-10 md:h-11 font-semibold truncate"
                >
                  <Calendar className="mr-2 h-4 w-4 shrink-0" />{" "}
                  <span className="truncate">Schedule</span>
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleOpenEdit(selectedDoctor)}
                  className="col-span-1 md:col-auto order-2 md:order-3 rounded-xl px-4 md:px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 text-xs md:text-base h-10 md:h-11 font-semibold truncate"
                >
                  <Pencil className="mr-2 h-4 w-4 shrink-0" />{" "}
                  <span className="truncate">Edit</span>
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit, onError)}
              className="flex flex-col flex-1 min-h-0 bg-muted/5"
            >
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin">
                {/* Profile Upload - Centered */}
                <div className="flex flex-col items-center gap-3">
                  <ImageUpload
                    value={profileImage}
                    onChange={setProfileImage}
                    variant="avatar"
                    showActions={true}
                    label=""
                  />
                  <div className="text-center">
                    <Label className="text-sm font-semibold text-foreground">
                      Doctor's Photo
                    </Label>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">
                      Professional Headshot
                    </p>
                  </div>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="personal" className="rounded-xl">
                      Personal
                    </TabsTrigger>
                    <TabsTrigger value="professional" className="rounded-xl">
                      Professional
                    </TabsTrigger>
                    <TabsTrigger value="availability" className="rounded-xl">
                      Availability
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="personal"
                    className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
                  >
                    <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          {...form.register("full_name")}
                          placeholder="Dr. John Doe"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.full_name && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.full_name.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Gender</Label>
                        <Select
                          value={form.watch("gender")}
                          onValueChange={(val) =>
                            form.setValue(
                              "gender",
                              val as "Male" | "Female" | "Other",
                            )
                          }
                        >
                          <SelectTrigger className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Email</Label>
                        <Input
                          {...form.register("email")}
                          placeholder="doctor@hospital.com"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.email && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.email.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          {...form.register("phone_number")}
                          placeholder="9876543210"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.phone_number && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.phone_number.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>
                          Password{" "}
                          {modalMode === "edit" &&
                            "(Leave empty to keep current)"}
                        </Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...form.register("password")}
                            className="rounded-xl pr-10 bg-white/50 dark:bg-slate-950/50 border-input"
                            onKeyDown={(e) =>
                              e.key === " " && e.preventDefault()
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full w-10 text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {form.formState.errors.password && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.password.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="professional"
                    className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
                  >
                    <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Hospital</Label>
                        <SearchableSelect
                          options={uniqueHospitals}
                          value={form.watch("hospital_id")}
                          onChange={handleHospitalChange}
                          placeholder="Select Hospital"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.hospital_id && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.hospital_id.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Department</Label>
                        <SearchableSelect
                          options={hospitalDepartments.map((d) => ({
                            label: d.name,
                            value: d.id,
                          }))}
                          value={form.watch("department_id")}
                          onChange={(val) =>
                            form.setValue("department_id", val)
                          }
                          placeholder={
                            hospitalDepartments.length
                              ? "Select Department"
                              : "Select Hospital First"
                          }
                          disabled={!form.watch("hospital_id")}
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.department_id && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.department_id.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Specialization</Label>
                        <SearchableSelect
                          options={uniqueSpecs}
                          value={form.watch("specialization_id")}
                          onChange={(val) =>
                            form.setValue("specialization_id", val)
                          }
                          placeholder="Select Specialization"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.specialization_id && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.specialization_id.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Medical License No.</Label>
                        <Input
                          {...form.register("medical_license_no")}
                          placeholder="REG-XXXX"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                        {form.formState.errors.medical_license_no && (
                          <span className="text-xs text-red-500">
                            {form.formState.errors.medical_license_no.message}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Qualification</Label>
                        <Input
                          {...form.register("qualification")}
                          placeholder="e.g. MBBS, MD (Cardiology)"
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Experience (Years)</Label>
                        <Input
                          type="number"
                          {...form.register("experience_years")}
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <Label>Consultation Fees (₹)</Label>
                        <Input
                          type="number"
                          {...form.register("consultation_fees")}
                          className="rounded-xl bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="availability"
                    className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-xl bg-white/40 dark:bg-slate-900/40">
                        <div className="space-y-1">
                          <Label className="text-lg">Doctor Availability</Label>
                          <p className="text-sm text-muted-foreground">
                            Toggle general availability for appointments.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-bold uppercase",
                              form.watch("is_available")
                                ? "text-emerald-600"
                                : "text-rose-600",
                            )}
                          >
                            {form.watch("is_available")
                              ? "Available"
                              : "Unavailable"}
                          </span>
                          <Button
                            type="button"
                            variant={
                              form.watch("is_available")
                                ? "default"
                                : "secondary"
                            }
                            className={cn(
                              "w-12 h-6 rounded-full p-0 transition-all",
                              form.watch("is_available")
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-slate-200",
                            )}
                            onClick={() =>
                              form.setValue(
                                "is_available",
                                !form.watch("is_available"),
                              )
                            }
                          >
                            <motion.div
                              className="h-4 w-4 bg-white rounded-full shadow-sm"
                              animate={{
                                x: form.watch("is_available") ? 14 : -14,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description / Bio</Label>
                        <Textarea
                          {...form.register("description")}
                          placeholder="Brief professional biography..."
                          className="rounded-xl min-h-[120px] bg-white/50 dark:bg-slate-950/50 border-input"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticked Footer with Dynamic Buttons */}
              <div className="p-4 md:p-6 border-t border-border/40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shrink-0 z-20">
                <div className="flex justify-between items-center w-full">
                  {activeTab !== "personal" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setActiveTab(
                          activeTab === "availability"
                            ? "professional"
                            : "personal",
                        )
                      }
                      className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}{" "}
                  {/* Spacer for alignment */}
                  {activeTab === "availability" ? (
                    <Button
                      type="submit"
                      disabled={
                        form.formState.isSubmitting || !form.formState.isDirty
                      }
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 px-8"
                    >
                      {form.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {modalMode === "add"
                        ? "Register Doctor"
                        : "Update Profile"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          activeTab === "personal"
                            ? "professional"
                            : "availability",
                        )
                      }
                      className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-md"
                    >
                      Next:{" "}
                      {activeTab === "personal"
                        ? "Professional"
                        : "Availability"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Schedule Modal */}
      <DoctorScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        doctor={selectedDoctor}
      />
    </div>
  );
}
