"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { ChevronLeft } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

export default function RegisterPage() {
    const { register, isLoading } = useAuth();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        gender: "Male",
        dob: "",
        blood_group_id: "",
        address: "",
        pincode: "",
        state_id: "",
        city_id: "",
        emergency_contact_name: "",
        emergency_contact_number: ""
    });
    const [error, setError] = useState("");

    // States for Master Data
    const [states, setStates] = useState<{ label: string, value: string }[]>([]);
    const [cities, setCities] = useState<{ label: string, value: string }[]>([]);
    const [bloodGroups, setBloodGroups] = useState<{ label: string, value: string }[]>([]);

    // Fetch States and Blood Groups on Mount
    useEffect(() => {
        api.get<any[]>("/master/states")
            .then(data => {
                setStates(data.map((s: any) => ({ label: s.state_name, value: s.state_id.toString() })));
            })
            .catch(err => console.error("Failed to fetch states", err));

        api.get<any[]>("/master/blood-groups")
            .then(data => {
                setBloodGroups(data.map((bg: any) => ({ label: bg.blood_group_name, value: bg.blood_group_id.toString() })));
            })
            .catch(err => console.error("Failed to fetch blood groups", err));
    }, []);

    // Fetch Cities when State changes
    useEffect(() => {
        if (formData.state_id) {
            api.get<any[]>(`/master/cities/${formData.state_id}`)
                .then(data => {
                    setCities(data.map((c: any) => ({ label: c.city_name, value: c.city_id.toString() })));
                })
                .catch(err => console.error("Failed to fetch cities", err));
        } else {
            setCities([]);
        }
    }, [formData.state_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleValueChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setError("");
        // Reset city if state changes
        if (name === "state_id") {
            setFormData(prev => ({ ...prev, state_id: value, city_id: "" }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { fullName, email, phoneNumber, password, confirmPassword,
            gender, dob, blood_group_id, address, pincode, state_id, city_id,
            emergency_contact_name, emergency_contact_number } = formData;

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (phoneNumber.length !== 10) {
            setError("Phone number must be 10 digits");
            return;
        }

        if (!state_id || !city_id) {
            setError("Please select State and City");
            return;
        }

        const payload = {
            full_name: fullName,
            email,
            phone_number: phoneNumber,
            password,
            gender,
            dob,
            blood_group_id,
            address,
            pincode,
            state_id: Number(state_id),
            city_id: Number(city_id),
            emergency_contact_name,
            emergency_contact_number
        };

        register(payload);
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2 overflow-hidden">
            {/* Left Column: Branding/Image */}
            <div className="relative hidden h-full flex-col justify-between p-10 text-white lg:flex">
                <div className="absolute inset-0 bg-blue-900">
                    <Image
                        src="/auth_bg_premium.png"
                        alt="Medical Background"
                        fill
                        className="object-cover opacity-80 mix-blend-overlay"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-blue-900/40" />
                </div>
                <div className="relative z-20 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-2xl font-bold text-white shadow-lg border border-white/20">
                        M
                    </div>
                    <span className="text-2xl font-bold tracking-tight">MedCore</span>
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg font-medium leading-relaxed">
                            &ldquo;Join thousands of patients who trust MedCore for secure, accessible, and modern healthcare management.&rdquo;
                        </p>
                    </blockquote>
                </div>
            </div>

            {/* Right Column: Form */}
            <div className="flex h-screen flex-col bg-muted/20">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">M</div>
                        <span className="font-bold">MedCore</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
                    <div className="mx-auto w-full max-w-[600px] space-y-6">

                        <div className="flex flex-col space-y-2">
                            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit mb-2">
                                <ChevronLeft className="h-4 w-4" />
                                Back to Home
                            </Link>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Patient Account</h1>
                            <p className="text-muted-foreground text-sm md:text-base">
                                Enter your details below to create your account
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                                    {error}
                                </div>
                            )}

                            {/* Section: Account Info */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Full Name</label>
                                        <Input name="fullName" placeholder="John Doe" required value={formData.fullName} onChange={handleChange} className="h-9" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <Input name="email" type="email" placeholder="john@example.com" required value={formData.email} onChange={handleChange} className="h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Phone</label>
                                        <Input name="phoneNumber" type="tel" maxLength={10} placeholder="9876543210" required value={formData.phoneNumber} onChange={handleChange} className="h-9" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Password</label>
                                        <Input name="password" type="password" placeholder="Min 8 chars" required value={formData.password} onChange={handleChange} className="h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Confirm Password</label>
                                        <Input name="confirmPassword" type="password" placeholder="Confirm password" required value={formData.confirmPassword} onChange={handleChange} className="h-9" />
                                    </div>
                                </div>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-muted/20 px-2 text-muted-foreground font-semibold bg-gray-50/50">Demographics</span>
                                </div>
                            </div>

                            {/* Section: Demographics */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Gender</label>
                                        <Select onValueChange={(val) => handleValueChange("gender", val)} defaultValue={formData.gender}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Date of Birth</label>
                                        <DatePicker
                                            value={formData.dob}
                                            onChange={(date) => handleValueChange("dob", date)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Blood Group</label>
                                        <SearchableSelect
                                            options={bloodGroups}
                                            value={formData.blood_group_id}
                                            onChange={(val) => handleValueChange("blood_group_id", val)}
                                            placeholder="Select Blood Group"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Address</label>
                                    <Textarea
                                        name="address"
                                        required
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Full residential address"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">State</label>
                                        <SearchableSelect
                                            options={states}
                                            value={formData.state_id}
                                            onChange={(val) => handleValueChange("state_id", val)}
                                            placeholder="Select State"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">City</label>
                                        <SearchableSelect
                                            options={cities}
                                            value={formData.city_id}
                                            onChange={(val) => handleValueChange("city_id", val)}
                                            placeholder="Select City"
                                            disabled={!formData.state_id}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Pincode</label>
                                        <Input name="pincode" placeholder="123456" required value={formData.pincode} onChange={handleChange} className="h-10" maxLength={6} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Emergency Contact Name</label>
                                        <Input name="emergency_contact_name" placeholder="Name" required value={formData.emergency_contact_name} onChange={handleChange} className="h-9" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Emergency Phone</label>
                                        <Input name="emergency_contact_number" type="tel" maxLength={10} placeholder="Number" required value={formData.emergency_contact_number} onChange={handleChange} className="h-9" />
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full h-11 text-base mt-4 font-semibold shadow-md text-white" type="submit" disabled={isLoading}>
                                {isLoading ? "Creating Account..." : "Create Account"}
                            </Button>
                        </form>

                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">Already have an account? </span>
                            <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary font-medium text-primary">
                                Log in
                            </Link>
                        </div>

                        <p className="text-xs text-center text-muted-foreground px-4">
                            By creating an account, you agree to our <Link href="#" className="underline">Terms</Link> and <Link href="#" className="underline">Privacy Policy</Link>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
