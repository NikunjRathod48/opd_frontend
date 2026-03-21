"use client";

import * as React from "react";
import { Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

interface ImageUploadProps {
    value?: File | string | null;
    onChange: (file: File | null) => void;
    className?: string;
    label?: string;
    variant?: "default" | "avatar";
    showActions?: boolean;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, className, label = "Upload Image", variant = "default", showActions = false, disabled = false }: ImageUploadProps) {
    const [preview, setPreview] = React.useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!value) {
            setPreview(null);
            return;
        }

        if (typeof value === "string") {
            setPreview(value);
        } else if (value instanceof File) {
            const objectUrl = URL.createObjectURL(value);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [value]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onChange(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            onChange(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const isAvatar = variant === "avatar";

    return (
        <div className={cn("space-y-3 flex flex-col items-center", className)}>
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={disabled}
            />
            <div
                onClick={(e) => {
                    if (preview && showActions) {
                        e.stopPropagation();
                        setIsViewOpen(true);
                    } else if (!disabled) {
                        inputRef.current?.click();
                    }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={cn(
                    "relative group flex flex-col items-center justify-center overflow-hidden transition-all duration-300",
                    !preview && !disabled ? "cursor-pointer border-2 border-dashed border-muted-foreground/25 bg-muted/5 hover:bg-muted/10 hover:border-primary/50" : !preview && disabled ? "cursor-not-allowed border-2 border-dashed border-muted-foreground/10 bg-muted/5" : "",
                    preview && showActions ? "cursor-zoom-in ring-4 ring-background shadow-xl" : !disabled ? "cursor-pointer" : "cursor-default",
                    preview && !showActions ? "border-primary/20 bg-primary/5" : "",
                    isAvatar ? "w-32 h-32 rounded-full" : "w-full h-32 rounded-xl"
                )}
            >
                {preview ? (
                    <>
                        <div className="absolute inset-0 w-full h-full">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {!showActions && !disabled && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <p className="text-white text-xs font-medium flex items-center gap-2">
                                        <Upload className="w-3 h-3" /> Change
                                    </p>
                                </div>
                            )}
                        </div>
                        {!showActions && !disabled && (
                            <Button
                                size="icon"
                                variant="destructive"
                                className={cn(
                                    "absolute shadow-md opacity-0 group-hover:opacity-100 transition-opacity",
                                    isAvatar ? "bottom-2 right-2 h-7 w-7 rounded-full" : "top-2 right-2 h-6 w-6 rounded-full"
                                )}
                                onClick={clearImage}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <div className={cn(
                            "mb-2 rounded-full bg-background shadow-sm ring-1 ring-border group-hover:scale-110 group-hover:ring-primary/20 transition-all duration-300",
                            isAvatar ? "p-4" : "p-3"
                        )}>
                            <Upload className={cn(isAvatar ? "h-6 w-6" : "h-5 w-5")} />
                        </div>
                        {!isAvatar && (
                            <>
                                <p className="text-xs font-medium">{label}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">Drag & drop or click</p>
                            </>
                        )}
                        {isAvatar && <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Upload</p>}
                    </div>
                )}
            </div>

            {/* Actions for Profile Mode */}
            {showActions && preview && !disabled && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <Tooltip content="Change Image">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 rounded-full bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background"
                            onClick={(e) => {
                                e.stopPropagation();
                                inputRef.current?.click();
                            }}
                        >
                            <Upload className="h-3 w-3" /> Change
                        </Button>
                    </Tooltip>
                    <Tooltip content="Remove Image">
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full shadow-md"
                            onClick={clearImage}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                </div>
            )}

            {isAvatar && label && !preview && <p className="text-xs font-medium text-muted-foreground">{label}</p>}

            {/* View Image Modal */}
            {isViewOpen && preview && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsViewOpen(false)}
                >
                    <div className="relative max-w-3xl max-h-[90vh] w-full p-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-lg transition-transform hover:scale-105"
                            onClick={() => setIsViewOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <img
                            src={preview}
                            alt="View Fullsize"
                            className="rounded-full aspect-square object-cover shadow-2xl max-h-[85vh] w-auto border-4 border-white/10 bg-black/50"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
