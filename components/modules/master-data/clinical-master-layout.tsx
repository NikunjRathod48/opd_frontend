"use client";

import { useState, useMemo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Pencil, Trash2, CheckCircle2, MoreVertical, X, ArrowLeft, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---
// Generic constraint for Category
export interface BaseCategory {
    id?: number; // Optional because API might use different ID fields, we'll map or expect caller to normalize
    [key: string]: any;
}

// Generic constraint for Item
export interface BaseItem {
    id?: number;
    [key: string]: any;
}

interface ClinicalMasterLayoutProps<TCat extends BaseCategory, TItem extends BaseItem> {
    title: string;
    description: string;
    categoryLabel: string; // e.g., "Department", "Drug Class"
    itemLabel: string;     // e.g., "Test", "Medicine"

    // Data
    categories: TCat[];
    items: TItem[];
    isLoading?: boolean;

    // State props (controlled by parent)
    selectedCategory: TCat | null;
    onSelectCategory: (cat: TCat | null) => void;

    // Actions
    onAddCategory?: (data: any) => Promise<void>;
    onEditCategory?: (cat: TCat, data: any) => Promise<void>;
    onDeleteCategory?: (cat: TCat) => Promise<void>;
    onToggleCategory?: (cat: TCat, status: boolean) => Promise<void>; // Status logic depends on entity

    onAddItem?: (data: any) => Promise<void>;
    onEditItem: (item: TItem, data: any) => Promise<void>;
    onDeleteItem?: (item: TItem) => Promise<void>;
    onToggleItem?: (item: TItem, status: boolean) => Promise<void>;

    // Custom Rendering
    renderCategoryItem?: (cat: TCat, isSelected: boolean) => ReactNode; // Optional custom list item
    getCategoryId: (cat: TCat) => number | string; // Helper to extract ID
    getCategoryName: (cat: TCat) => string;       // Helper to extract Name
    getItemCount?: (cat: TCat) => number;         // Optional: Count of items in category

    getItemId: (item: TItem) => number | string;   // Helper
    getItemName: (item: TItem) => string;          // Helper
    filterItem: (item: TItem, query: string) => boolean; // Custom filter logic

    renderItemCard: (item: TItem) => ReactNode;    // REQUIRED: How to show the item in the grid

    // Forms
    renderCategoryForm?: (initialData: Partial<TCat>, onClose: () => void) => ReactNode;
    renderItemForm: (initialData: Partial<TItem>, category: TCat, onClose: () => void) => ReactNode;

    // Custom Slots
    headerActions?: ReactNode;
}

export function ClinicalMasterLayout<TCat extends BaseCategory, TItem extends BaseItem>({
    title,
    description,
    categoryLabel,
    itemLabel,
    categories,
    items,
    isLoading = false,
    selectedCategory,
    onSelectCategory,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    onToggleCategory,
    onAddItem,
    onEditItem,
    onDeleteItem,
    onToggleItem,
    getCategoryId,
    getCategoryName,
    getItemCount,
    getItemId,
    getItemName,
    filterItem,
    renderItemCard,
    renderCategoryForm,
    renderItemForm,
    renderCategoryItem,
    headerActions
}: ClinicalMasterLayoutProps<TCat, TItem>) {

    // --- Local State ---
    const [catSearch, setCatSearch] = useState("");
    const [itemSearch, setItemSearch] = useState("");
    const [isMobileItemView, setIsMobileItemView] = useState(false);

    // Modals
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);

    // We need to know if we are editing or adding
    const [editingCat, setEditingCat] = useState<TCat | null>(null);
    const [editingItem, setEditingItem] = useState<TItem | null>(null);

    // Filtered Data
    const filteredCategories = useMemo(() => {
        return categories.filter(c => getCategoryName(c).toLowerCase().includes(catSearch.toLowerCase()));
    }, [categories, catSearch, getCategoryName]);

    const filteredItems = useMemo(() => {
        if (!selectedCategory) return [];
        return items.filter(i => filterItem(i, itemSearch));
    }, [items, itemSearch, filterItem, selectedCategory]);

    const handleCategoryClick = (cat: TCat) => {
        onSelectCategory(cat);
        setIsMobileItemView(true);
    };

    // --- Template ---
    return (
        <div className="flex flex-col h-[calc(100vh-9rem)] overflow-hidden gap-4 md:gap-6 px-4 pb-4 pt-1 md:px-6 md:pb-6 md:pt-2 bg-slate-50/50 dark:bg-slate-950/50">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        {title}
                    </h1>
                    <p className="text-muted-foreground mt-1">{description}</p>
                </div>
            </div>

            {/* Split View */}
            <div className="flex flex-1 gap-6 overflow-hidden relative">

                {/* MASTER: Categories (Left Panel) */}
                <Card className={cn(
                    "flex flex-col border-border/50 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm transition-all duration-300 w-full md:w-1/3 lg:w-1/4 h-full absolute md:relative z-10",
                    isMobileItemView ? "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto" : "translate-x-0 opacity-100"
                )}>
                    <CardHeader className="border-b border-border/50 p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-600 rounded-full" />
                                {categoryLabel}s
                            </CardTitle>
                            {onAddCategory && renderCategoryForm && (
                                <Tooltip content={`Add ${categoryLabel}`}>
                                    <Button size="sm" onClick={() => { setEditingCat(null); setIsCatModalOpen(true); }} className="h-8 w-8 rounded-full p-0 bg-blue-600 hover:bg-blue-700">
                                        <Plus className="h-4 w-4 text-white" />
                                    </Button>
                                </Tooltip>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${categoryLabel}...`}
                                className="pl-9 h-9 bg-muted/30 border-muted-foreground/20 rounded-lg focus:ring-1 focus:ring-blue-500"
                                value={catSearch}
                                onChange={(e) => setCatSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-2">
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-transparent bg-muted/20">
                                        <div className="flex-1 min-w-0 pr-3 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                        <Skeleton className="h-5 w-8 rounded-full shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredCategories.map(cat => {
                                    const isSelected = selectedCategory && getCategoryId(selectedCategory!) === getCategoryId(cat);
                                    if (renderCategoryItem) return renderCategoryItem(cat, !!isSelected);

                                    // Default Rendering
                                    return (
                                        <div
                                            key={getCategoryId(cat)}
                                            onClick={() => handleCategoryClick(cat)}
                                            className={cn(
                                                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                                                isSelected
                                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm"
                                                    : "hover:bg-muted/50 hover:border-border/50"
                                            )}
                                        >
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className={cn("font-semibold truncate", isSelected ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>
                                                        {getCategoryName(cat)}
                                                    </p>
                                                    {getItemCount && (
                                                        <span className={cn(
                                                            "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
                                                            isSelected
                                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                                : "bg-muted text-muted-foreground group-hover:bg-background"
                                                        )}>
                                                            {getItemCount(cat)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredCategories.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground text-sm">
                                        No {categoryLabel.toLowerCase()}s found
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </Card>

                {/* DETAIL: Items (Right Panel) */}
                <Card className={cn(
                    "flex flex-col flex-1 border-border/50 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl h-full absolute inset-0 md:relative md:inset-auto z-20 transition-transform duration-300",
                    isMobileItemView ? "translate-x-0" : "translate-x-full md:translate-x-0"
                )}>
                    {isLoading ? (
                        <div className="flex flex-col h-full p-4 md:p-6">
                            <div className="border-b border-border/50 pb-4 mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 w-full">
                                    <Skeleton className="h-7 w-48" />
                                    <Skeleton className="h-5 w-24 rounded-md" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-9 w-28 rounded-lg hidden md:block" />
                                </div>
                            </div>
                            <div className="mb-4">
                                <Skeleton className="h-10 w-full md:w-1/2 rounded-xl" />
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className="bg-white/50 dark:bg-slate-800/10 border border-border/60 rounded-xl p-4 flex flex-col h-[150px] shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <Skeleton className="h-6 w-16 rounded-md" />
                                                <Skeleton className="h-4 w-12 rounded-sm" />
                                            </div>
                                            <Skeleton className="h-4 w-4/5 mb-3" />
                                            <div className="flex gap-2">
                                                <Skeleton className="h-3 w-16 rounded-sm" />
                                            </div>
                                            <div className="mt-auto pt-3 border-t border-dashed border-border/50 flex justify-between items-end">
                                                <div className="flex flex-col gap-1">
                                                    <Skeleton className="h-2 w-12" />
                                                    <Skeleton className="h-4 w-16" />
                                                </div>
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : selectedCategory ? (
                        <>
                            <CardHeader className="border-b border-border/50 p-4 shrink-0">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                                        {/* Mobile Back Button */}
                                        <Tooltip content={`Back to ${categoryLabel}s`}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="md:hidden shrink-0 -ml-2"
                                                onClick={() => setIsMobileItemView(false)}
                                            >
                                                <ArrowLeft className="h-5 w-5" />
                                            </Button>
                                        </Tooltip>

                                        <div>
                                            <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2 truncate">
                                                {getCategoryName(selectedCategory)}
                                                <Badge variant="outline" className="ml-2 font-normal text-xs bg-blue-50 text-blue-700 border-blue-200">{filteredItems.length} {itemLabel}s</Badge>
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">Manage {itemLabel.toLowerCase()}s</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* ADD ITEM BUTTON */}
                                        {onAddItem && (
                                            <>
                                                <Tooltip content={`Add ${itemLabel}`} className="hidden md:flex">
                                                    <Button
                                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all rounded-lg h-9"
                                                        onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Add {itemLabel}
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={`Add ${itemLabel}`}>
                                                    <Button
                                                        size="icon"
                                                        className="md:hidden bg-blue-600 text-white rounded-full shadow-lg"
                                                        onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
                                                    >
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                </Tooltip>
                                            </>
                                        )}
                                        {headerActions}
                                    </div>
                                </div>
                            </CardHeader>
                            <div className="mt-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={`Search ${itemLabel.toLowerCase()}s...`}
                                    className="pl-9 bg-white/60 dark:bg-slate-950/40 border-border/60 hover:border-blue-400 focus:border-blue-500 transition-colors rounded-xl"
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                />
                            </div>

                    <ScrollArea className="flex-1 p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map(item => (
                                <div key={getItemId(item)} className="relative group hover:z-10">
                                    {/* THE ITEM CARD RENDER PROP */}
                                    {renderItemCard(item)}

                                    {/* EDIT BUTTON OVERLAY - Always visible on mobile, hover on desktop */}
                                    <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                                        <Tooltip content={`Edit ${itemLabel}`}>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md bg-white hover:bg-slate-100"
                                                onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsItemModalOpen(true); }}>
                                                <Pencil className="h-4 w-4 text-slate-700" />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Search className="w-8 h-8" />
                                    </div>
                                    <p>No {itemLabel.toLowerCase()}s found matching your search</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </>
                ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 animate-pulse-slow">
                        <ArrowLeft className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Select a {categoryLabel}</h3>
                    <p className="max-w-xs mx-auto">Choose a {categoryLabel.toLowerCase()} from the sidebar to view and manage its {itemLabel.toLowerCase()}s.</p>
                </div>
                    )}
            </Card>
        </div>

            {/* --- Dialogs --- */ }

    {/* Category Dialog */ }
    {
        renderCategoryForm && (
            <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCat ? `Edit ${categoryLabel}` : `Add New ${categoryLabel}`}</DialogTitle>
                    </DialogHeader>
                    {/* Render the Custom Form, passing close handler and initial data */}
                    {renderCategoryForm(editingCat || {}, () => setIsCatModalOpen(false))}
                </DialogContent>
            </Dialog>
        )
    }

    {/* Item Dialog */ }
    <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingItem ? `Edit ${itemLabel}` : `Add New ${itemLabel}`}</DialogTitle>
            </DialogHeader>
            {/* Render the Custom Form */}
            {/* Check if selectedCategory is present before rendering, theoretically it must be if we are adding an item */}
            {selectedCategory && renderItemForm(editingItem || {}, selectedCategory, () => setIsItemModalOpen(false))}
        </DialogContent>
    </Dialog>
        </div >
    );
}
