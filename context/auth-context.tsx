"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export type UserRole = "SuperAdmin" | "GroupAdmin" | "HospitalAdmin" | "Doctor" | "Receptionist" | "Patient";

export interface User {
    id: string; // Added ID for linking to Data entities
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    hospitalgroupid?: string | null;
    hospitalid?: string | null;
    access_token?: string; // JWT Token
    profile_image_url?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (role: UserRole, name?: string, hospitalgroupid?: string, hospitalid?: string) => void;
    loginWithCredentials: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
    updateUser: (userData: Partial<User>) => void;
    register: (data: any) => void;
    logout: () => void;
    checkPermission: (permission: string) => boolean; // Future proofing
    getRoleBasePath: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Load user from local storage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem("medcore_user");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                const originalRole = parsedUser.role;

                // Sanitize role (handle legacy roles with spaces)
                if (parsedUser.role) {
                    parsedUser.role = parsedUser.role.replace(/\s+/g, '');
                }

                if (parsedUser.role !== originalRole) {
                    // Update storage and cookie if sanitization occurred
                    localStorage.setItem("medcore_user", JSON.stringify(parsedUser));
                    const expires = new Date();
                    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
                    document.cookie = `medcore_user=${JSON.stringify(parsedUser)};expires=${expires.toUTCString()};path=/`;
                }

                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse user data", e);
                localStorage.removeItem("medcore_user");
            }
        }
        setIsLoading(false);
    }, []);

    const getRoleBasePath = (role?: UserRole) => {
        const r = role || user?.role;
        if (!r) return "/";

        // Map multiple admin roles to the single /admin directory structure
        if (r === "SuperAdmin" || r === "GroupAdmin" || r === "HospitalAdmin") return "/admin";

        // Others map 1:1 to their directory (lowercase)
        if (r === "Doctor") return "/doctor";
        if (r === "Receptionist") return "/receptionist";
        if (r === "Patient") return "/patient";

        return "/";
    };

    // Helper to set cookie
    const setCookie = (name: string, value: string, days: number) => {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    };

    // Helper to remove cookie
    const removeCookie = (name: string) => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    };

    const login = (role: UserRole, name?: string, hospitalgroupid?: string, hospitalid?: string) => {
        setIsLoading(true);

        // Map roles to stable Mock IDs from DataContext for testing
        let mockId = "admin-1";
        let mockName = name || "Admin User";

        if (role === 'Doctor') {
            mockId = "d1"; // Maps to Dr. Smith
            mockName = "Dr. Smith";
        } else if (role === 'Patient') {
            mockId = "p1"; // Maps to John Doe
            mockName = "John Doe";
        } else if (role === 'Receptionist') {
            mockId = "r1";
            mockName = "Receptionist";
        } else if (role === 'GroupAdmin') {
            mockId = "ga1";
            mockName = "Apollo Group Admin";
            // Default to first group if not specified
            if (!hospitalgroupid) hospitalgroupid = "g1";
        } else if (role === 'HospitalAdmin') {
            mockId = "ha1";
            mockName = "Greams Admin";
            // Default to first hospital/group if not specified
            if (!hospitalgroupid) hospitalgroupid = "g1";
            if (!hospitalid) hospitalid = "h1";
        } else {
            // SuperAdmin
            mockId = "admin-1";
            mockName = name || `${role} User`;
        }

        const mockHospitalId = hospitalid || "1";
        const mockHospitalGroupId = hospitalgroupid || "1";

        // Simulate API delay
        const mockUser: User = {
            id: mockId,
            name: mockName,
            email: `${role.toLowerCase()}@medcore.com`,
            role: role,
            avatar: "",
            hospitalgroupid: mockHospitalGroupId,
            hospitalid: mockHospitalId
        };

        localStorage.setItem("medcore_user", JSON.stringify(mockUser));
        setCookie("medcore_user", JSON.stringify(mockUser), 7); // Set cookie for 7 days
        setUser(mockUser);
        setIsLoading(false);

        // Redirect based on role
        router.push(getRoleBasePath(role));
    };

    const loginWithCredentials = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const data = await api.post<any>("/auth/login", { identifier, password });

            // Map backend role name to frontend UserRole
            // Backend roles: "Super Admin", "Group Admin", "Hospital Admin", "Doctor", "Receptionist", "Patient"
            // Frontend roles: "SuperAdmin", "GroupAdmin", "HospitalAdmin", "Doctor", "Receptionist", "Patient"
            let userRole: UserRole = "Patient"; // Default fallback
            const backendRole = data.user.roles?.role_name || "";

            if (backendRole === "Super Admin") userRole = "SuperAdmin";
            else if (backendRole === "Group Admin") userRole = "GroupAdmin";
            else if (backendRole === "Hospital Admin") userRole = "HospitalAdmin";
            else if (backendRole === "Doctor") userRole = "Doctor";
            else if (backendRole === "Receptionist") userRole = "Receptionist";
            else if (backendRole === "Patient") userRole = "Patient";

            // Extract IDs from relations based on Schema
            // Users table lacks these IDs, so we must fetch them from linked tables (employees, doctors, patients)
            let hospitalGroupId = null;
            let hospitalId = null;

            // 1. Check Employees (GroupAdmin, HospitalAdmin, Receptionist)
            // Schema: employees(employee_id, user_id, hospital_group_id, hospital_id, ...)
            if (data.user.employees && data.user.employees.length > 0) {
                hospitalGroupId = data.user.employees[0].hospital_group_id;
                hospitalId = data.user.employees[0].hospital_id;
            }
            // 2. Check Doctors (Doctor)
            // Schema: doctors(doctor_id, user_id, hospital_id, ...) - No direct hospital_group_id
            else if (data.user.doctors && data.user.doctors.length > 0) {
                hospitalId = data.user.doctors[0].hospital_id;
            }
            // 3. Check Patients (Patient)
            // Schema: patients(patient_id, user_id, hospital_group_id, ...)
            else if (data.user.patients && data.user.patients.length > 0) {
                hospitalGroupId = data.user.patients[0].hospital_group_id;
            }

            // Fallback: Check if flattened properties exist on the user object itself
            if (!hospitalGroupId && data.user.hospital_group_id) hospitalGroupId = data.user.hospital_group_id;
            if (!hospitalId && data.user.hospital_id) hospitalId = data.user.hospital_id;

            const user: User = {
                id: data.user.user_id.toString(),
                name: data.user.full_name,
                email: data.user.email,
                role: userRole,
                hospitalgroupid: hospitalGroupId,
                hospitalid: hospitalId,
                avatar: data.user.profile_image_url || "", // Map profile image
                access_token: data.access_token
            };

            localStorage.setItem("medcore_user", JSON.stringify(user));
            setCookie("medcore_user", JSON.stringify(user), 7);
            setUser(user);
            setIsLoading(false);

            router.push(getRoleBasePath(userRole));
            return { success: true };
        } catch (error: any) {
            setIsLoading(false);
            return { success: false, error: error.message || "An unexpected error occurred" };
        }
    };

    const updateUser = (userData: Partial<User>) => {
        if (!user) return;

        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        localStorage.setItem("medcore_user", JSON.stringify(updatedUser));
        setCookie("medcore_user", JSON.stringify(updatedUser), 7);
    };

    const register = async (data: any) => {
        setIsLoading(true);
        try {
            const responseData = await api.post<any>("/auth/register", data);

            // Auto-login after registration
            const newUser: User = {
                id: responseData.user.user_id.toString(),
                name: responseData.user.full_name,
                email: responseData.user.email,
                role: "Patient",
                access_token: responseData.access_token
            };

            localStorage.setItem("medcore_user", JSON.stringify(newUser));
            setCookie("medcore_user", JSON.stringify(newUser), 7);
            setUser(newUser);
            setIsLoading(false);
            router.push("/patient");
        } catch (error: any) {
            console.error("Registration error:", error);
            setIsLoading(false);
            alert(error.message || "An unexpected error occurred");
        }
    };

    const logout = () => {
        localStorage.removeItem("medcore_user");
        removeCookie("medcore_user");
        setUser(null);
        router.push("/");
    };

    const checkPermission = (permission: string) => {
        // Placeholder for fine-grained permissions if needed
        return true;
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, loginWithCredentials, logout, register, updateUser, checkPermission, getRoleBasePath }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
