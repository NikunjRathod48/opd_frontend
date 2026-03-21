"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth, UserRole } from "@/context/auth-context";
import { RoleGuard } from "@/components/auth/role-guard";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { User, Lock, Mail, Phone, Shield, Camera, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";


interface ProfileViewProps {
    allowedRoles?: UserRole[];
}

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
});

const passwordChangeSchema = z.object({
    current: z.string().min(1, "Current password is required"),
    new: z.string()
        .min(6, "Password must be at least 6 characters")
        .max(12, "Password must be at most 12 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/\d/, "Password must contain at least one number")
        .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
    confirm: z.string()
}).refine((data) => data.new === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordChangeSchema>;

export function ProfileView({ allowedRoles = ['SuperAdmin', 'GroupAdmin', 'HospitalAdmin', 'Doctor', 'Receptionist', 'Patient'] }: ProfileViewProps) {
    const { user, updateUser } = useAuth();
    const { addToast } = useToast();
    const searchParams = useSearchParams();
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Profile Form
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || "",
        },
        mode: "onChange"
    });

    // Password Form
    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordChangeSchema),
        defaultValues: {
            current: "",
            new: "",
            confirm: ""
        },
        mode: "onChange"
    });

    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [profileImageDisplay, setProfileImageDisplay] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // Sync user data
    useEffect(() => {
        if (user) {
            profileForm.reset({ name: user.name || "" });
            setProfileImageDisplay(user.avatar || user.profile_image_url || "");
        }
    }, [user, profileForm]);

    const handleProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
        setIsLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('full_name', data.name);
            if (selectedFile) {
                formDataToSend.append('file', selectedFile);
            }

            // Call API to update profile
            const updatedUser = await api.patch<any>('/users/profile', formDataToSend);

            // Update local context
            updateUser({
                name: updatedUser.full_name,
                avatar: updatedUser.profile_image_url
            });

            addToast("Profile details updated successfully", "success");
            setIsEditing(false);
            setSelectedFile(null);
        } catch (error: any) {
            console.error("Profile update error:", error);
            addToast(error.message || "Failed to update profile", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
        setIsLoading(true);
        try {
            await api.patch('/users/change-password', {
                currentPassword: data.current,
                newPassword: data.new,
                confirmNewPassword: data.confirm
            });

            addToast("Password changed successfully", "success");
            passwordForm.reset();
        } catch (error: any) {
            console.error("Password change error:", error);
            addToast(error.message || "Failed to change password", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImageDisplay(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <RoleGuard allowedRoles={allowedRoles}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Profile & Settings</h2>
                        <p className="text-muted-foreground">Manage your personal information and account security</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                        <TabsTrigger value="general" className="flex items-center gap-2"><User className="h-4 w-4" /> General</TabsTrigger>
                        <TabsTrigger value="security" className="flex items-center gap-2"><Lock className="h-4 w-4" /> Security</TabsTrigger>
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value="general" className="mt-6 space-y-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar Section */}
                            <Card className="flex-shrink-0 w-full md:w-[300px]">
                                <CardContent className="pt-6 flex flex-col items-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    <div
                                        className={`relative group mb-4 ${isEditing ? 'cursor-pointer' : ''}`}
                                        onClick={triggerFileInput}
                                    >
                                        <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary border-4 border-background shadow-xl overflow-hidden">
                                            {profileImageDisplay ? (
                                                <img src={profileImageDisplay} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                user?.name?.charAt(0) || "U"
                                            )}
                                        </div>
                                        {isEditing && (
                                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="h-8 w-8 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold">{user?.name}</h3>
                                    <p className="text-sm text-muted-foreground capitalize flex items-center gap-1 mt-1">
                                        <Shield className="h-3 w-3" /> {user?.role}
                                    </p>
                                    <Button variant="outline" className="mt-6 w-full" onClick={() => setIsEditing(!isEditing)}>
                                        {isEditing ? "Cancel Editing" : "Edit Details"}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Details Form */}
                            <Card className="flex-1">
                                <CardHeader>
                                    <CardTitle>Personal Information</CardTitle>
                                    <CardDescription>Update your photo and personal details.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" /> Full Name
                                                </label>
                                                <Input
                                                    {...profileForm.register("name")}
                                                    disabled={!isEditing}
                                                    className={!isEditing ? "bg-muted" : ""}
                                                />
                                                {profileForm.formState.errors.name && <p className="text-xs text-red-500">{profileForm.formState.errors.name.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-muted-foreground" /> Role
                                                </label>
                                                <Input
                                                    value={user?.role?.toUpperCase() || ""}
                                                    disabled={true}
                                                    className="bg-muted"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" /> Email Address
                                                </label>
                                                <Input
                                                    type="email"
                                                    value={user?.email || ""}
                                                    disabled={true}
                                                    className="bg-muted"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" /> Phone Number
                                                </label>
                                                <Input
                                                    type="tel"
                                                    value="987-654-3210"
                                                    disabled={true}
                                                    className="bg-muted"
                                                />
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className="flex justify-start pt-4 border-t mt-4">
                                                <Button type="submit" className="text-white" disabled={isLoading}>
                                                    {isLoading ? "Saving..." : "Save Changes"}
                                                </Button>
                                            </div>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>Update your password to keep your account secure.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="max-w-md space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Current Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showPassword.current ? "text" : "password"}
                                                className="pl-9 pr-10"
                                                {...passwordForm.register("current")}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                                            >
                                                {showPassword.current ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                        {passwordForm.formState.errors.current && <p className="text-xs text-red-500">{passwordForm.formState.errors.current.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showPassword.new ? "text" : "password"}
                                                className="pl-9 pr-10"
                                                {...passwordForm.register("new")}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                                            >
                                                {showPassword.new ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                        {passwordForm.formState.errors.new && <p className="text-xs text-red-500">{passwordForm.formState.errors.new.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showPassword.confirm ? "text" : "password"}
                                                className="pl-9 pr-10"
                                                {...passwordForm.register("confirm")}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                                            >
                                                {showPassword.confirm ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                        {passwordForm.formState.errors.confirm && <p className="text-xs text-red-500">{passwordForm.formState.errors.confirm.message}</p>}
                                    </div>
                                    <div className="pt-2">
                                        <Button type="submit" className="text-white" disabled={isLoading}>
                                            {isLoading ? "Updating..." : "Update Password"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </RoleGuard>
    );
}
