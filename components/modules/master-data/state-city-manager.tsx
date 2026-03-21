"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Map, MapPin, Pencil, Trash2, CheckCircle2, MoreVertical, X, Building2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/auth-context";

interface State {
    state_id: number;
    state_name: string;
    state_code: string;
    is_active: boolean;
    cities?: City[]; // Helper for local grouping if needed, though usually fetched separately
}

interface City {
    city_id: number;
    city_name: string;
    city_code: string;
    state_id: number;
    is_active: boolean;
}

export function StateCityManager() {
    const { user } = useAuth(); // Should be SuperAdmin
    const { addToast } = useToast();

    // --- State ---
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [selectedState, setSelectedState] = useState<State | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    // Search
    const [stateSearch, setStateSearch] = useState("");
    const [citySearch, setCitySearch] = useState("");

    // Modals
    const [isStateModalOpen, setIsStateModalOpen] = useState(false);
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({ id: 0, name: "", code: "" });
    const [isEditing, setIsEditing] = useState(false);

    // Delete/Toggle
    const [deleteState, setDeleteState] = useState<{ open: boolean; type: 'State' | 'City'; id: number; name: string }>({
        open: false,
        type: 'State',
        id: 0,
        name: ''
    });

    // Mobile View Toggle
    const [isMobileCityView, setIsMobileCityView] = useState(false);

    // Auto-switch to city view on mobile when a state is selected
    useEffect(() => {
        if (selectedState) {
            setIsMobileCityView(true);
        }
    }, [selectedState]);

    // --- Fetching ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statesRes, citiesRes] = await Promise.all([
                api.get<State[]>('/master-data/states'),
                api.get<City[]>('/master-data/cities')
            ]);
            setStates(statesRes);
            setCities(citiesRes);

            // Maintain selection if updating
            if (selectedState) {
                const updatedState = statesRes.find(s => s.state_id === selectedState.state_id);
                if (updatedState) setSelectedState(updatedState);
            } else if (statesRes.length > 0) {
                // Optional: Auto-select first? Maybe not for State manager.
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to fetch data", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Computed ---
    const filteredStates = useMemo(() => {
        let result = states;
        if (stateSearch) {
            const q = stateSearch.toLowerCase();
            result = states.filter(s => s.state_name.toLowerCase().includes(q) || s.state_code.toLowerCase().includes(q));
        }
        return result.sort((a, b) => a.state_name.localeCompare(b.state_name));
    }, [states, stateSearch]);

    const filteredCities = useMemo(() => {
        if (!selectedState) return [];
        let stateCities = cities.filter(c => c.state_id === selectedState.state_id);
        if (citySearch) {
            const q = citySearch.toLowerCase();
            stateCities = stateCities.filter(c => c.city_name.toLowerCase().includes(q) || c.city_code.toLowerCase().includes(q));
        }
        return stateCities.sort((a, b) => a.city_name.localeCompare(b.city_name));
    }, [cities, selectedState, citySearch]);


    // --- Handlers ---

    // State Handlers
    const openAddState = () => {
        setIsEditing(false);
        setFormData({ id: 0, name: "", code: "" });
        setIsStateModalOpen(true);
    };

    const openEditState = (state: State) => {
        setIsEditing(true);
        setFormData({ id: state.state_id, name: state.state_name, code: state.state_code });
        setIsStateModalOpen(true);
    };

    const handleStateSubmit = async () => {
        try {
            if (isEditing) {
                await api.put(`/master-data/states/${formData.id}`, {
                    state_name: formData.name,
                    state_code: formData.code
                });
                addToast("State updated successfully", "success");
            } else {
                await api.post('/master-data/states', {
                    state_name: formData.name,
                    state_code: formData.code,
                    is_active: true
                });
                addToast("State created successfully", "success");
            }
            setIsStateModalOpen(false);
            fetchData();
        } catch (e) {
            addToast("Failed to save state", "error");
        }
    };

    // City Handlers
    const openAddCity = () => {
        if (!selectedState) return;
        setIsEditing(false);
        setFormData({ id: 0, name: "", code: "" });
        setIsCityModalOpen(true);
    };

    const openEditCity = (city: City) => {
        setIsEditing(true);
        setFormData({ id: city.city_id, name: city.city_name, code: city.city_code });
        setIsCityModalOpen(true);
    };

    const handleCitySubmit = async () => {
        if (!selectedState) return;
        try {
            if (isEditing) {
                await api.put(`/master-data/cities/${formData.id}`, {
                    city_name: formData.name,
                    city_code: formData.code,
                    state_id: selectedState.state_id
                });
                addToast("City updated successfully", "success");
            } else {
                await api.post('/master-data/cities', {
                    city_name: formData.name,
                    city_code: formData.code,
                    state_id: selectedState.state_id,
                    is_active: true
                });
                addToast("City created successfully", "success");
            }
            setIsCityModalOpen(false);
            fetchData();
        } catch (e) {
            addToast("Failed to save city", "error");
        }
    };

    // Toggle/Delete
    const handleToggle = async () => {
        const isState = deleteState.type === 'State';
        const url = isState
            ? `/master-data/states/${deleteState.id}/status`
            : `/master-data/cities/${deleteState.id}/status`;

        try {
            await api.patch(url, {}); // Toggle status
            addToast(`${deleteState.type} status updated`, "success");
            setDeleteState(prev => ({ ...prev, open: false }));
            fetchData();
        } catch (e) {
            addToast(`Failed to update ${deleteState.type} status`, "error");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
            {/* Page Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">State & City Manager</h1>
                    <p className="text-sm text-muted-foreground">Manage your geographical master data</p>
                </div>
            </div>

            <div className="flex-1 flex min-h-0 gap-4 relative overflow-hidden">
                {/* Left Sidebar: States */}
                <div className={cn(
                    "w-full md:w-[320px] lg:w-[380px] flex flex-col border border-border/40 bg-white dark:bg-slate-900 z-10 shrink-0 rounded-xl shadow-sm overflow-hidden h-full absolute md:relative transition-all duration-300",
                    isMobileCityView
                        ? "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
                        : "translate-x-0 opacity-100"
                )}>
                    <div className="p-4 border-b border-border/40 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Map className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg leading-none">States</h2>
                                    <p className="text-xs text-muted-foreground mt-1">Manage States</p>
                                </div>
                            </div>
                            <Button size="icon" className="h-8 w-8 rounded-lg" onClick={openAddState}>
                                <Plus className="h-4 w-4 text-white" />
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                            <Input
                                placeholder="Search states..."
                                className="pl-9 h-9 bg-slate-50 dark:bg-slate-950/50 border-border/50 text-sm rounded-lg"
                                value={stateSearch}
                                onChange={(e) => setStateSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            {filteredStates.map(state => (
                                <div
                                    key={state.state_id}
                                    onClick={() => setSelectedState(state)}
                                    className={cn(
                                        "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                                        selectedState?.state_id === state.state_id
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                                            : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                        selectedState?.state_id === state.state_id
                                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                    )}>
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className={cn(
                                                "font-semibold text-sm truncate",
                                                selectedState?.state_id === state.state_id ? "text-indigo-950 dark:text-indigo-100" : "text-foreground"
                                            )}>
                                                {state.state_name}
                                            </h3>
                                            <Badge variant="secondary" className="text-[10px] h-4 px-1">{state.state_code}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                            {cities.filter(c => c.state_id === state.state_id).length} Cities
                                            {!state.is_active && <span className="text-red-500 font-medium">Inactive</span>}
                                        </p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { openEditState(state); }}>
                                                <Pencil className="h-4 w-4 mr-2" /> Edit State
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setDeleteState({ open: true, type: 'State', id: state.state_id, name: state.state_name }); }}>
                                                {state.is_active ? <Trash2 className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                                {state.is_active ? "Deactivate" : "Activate"}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel: Cities */}
                <div className={cn(
                    "flex-1 flex flex-col min-w-0 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-border/40 shadow-sm overflow-hidden backdrop-blur-sm h-full absolute inset-0 md:relative md:inset-auto z-20 transition-transform duration-300",
                    isMobileCityView ? "translate-x-0" : "translate-x-full md:translate-x-0"
                )}>
                    {selectedState ? (
                        <>
                            <div className="h-16 px-4 md:px-6 border-b border-border/40 flex items-center justify-between sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="md:hidden -ml-2 mr-1 h-8 w-8"
                                        onClick={() => setIsMobileCityView(false)}
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                        <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                                            {selectedState.state_name}
                                            <Badge variant="outline" className="text-xs font-mono">{selectedState.state_code}</Badge>
                                        </h1>
                                        <p className="text-xs text-muted-foreground hidden sm:block">Managing cities for this state</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="relative w-64 hidden sm:block">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                        <Input
                                            placeholder="Search cities..."
                                            value={citySearch}
                                            onChange={(e) => setCitySearch(e.target.value)}
                                            className="pl-9 h-9 bg-white dark:bg-slate-900 border-border/60 rounded-lg"
                                        />
                                    </div>
                                    <Button onClick={openAddCity} className="h-8 md:h-9 w-8 md:w-auto rounded-lg bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 p-0 md:px-4 flex items-center justify-center">
                                        <Plus className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Add City</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-hidden">
                                <ScrollArea className="h-full">
                                    {filteredCities.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                                            {filteredCities.map(city => (
                                                <Card key={city.city_id} className={cn(
                                                    "group hover:shadow-neo-lg transition-all duration-300 border-border/60 bg-white dark:bg-slate-900 rounded-xl overflow-hidden",
                                                    !city.is_active && "opacity-70 bg-slate-50 dark:bg-slate-900/50"
                                                )}>
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                                <Building2 className="h-5 w-5 text-slate-500" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-semibold text-sm truncate" title={city.city_name}>{city.city_name}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{city.city_code}</span>
                                                                    {!city.is_active && <span className="text-[10px] text-red-500 font-medium">Inactive</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pl-2 shrink-0">
                                                            <Tooltip content="Edit City">
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditCity(city)}>
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </Tooltip>
                                                            <Tooltip content={city.is_active ? "Deactivate" : "Activate"}>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteState({ open: true, type: 'City', id: city.city_id, name: city.city_name })}>
                                                                    {city.is_active ? <Trash2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                </Button>
                                                            </Tooltip>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                                            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                                <Map className="h-8 w-8 opacity-20" />
                                            </div>
                                            <h3 className="text-lg font-medium text-foreground">No Cities Found</h3>
                                            <p className="text-sm max-w-xs mt-1">
                                                {citySearch ? "No cities match your search." : "Select a state to view cities or add a new one."}
                                            </p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-950/50">
                            <div className="h-24 w-24 rounded-full bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center mb-6 animate-pulse">
                                <MapPin className="h-10 w-10 text-indigo-300" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Select a State</h2>
                            <p className="text-sm max-w-sm mt-2">
                                Choose a state from the sidebar to manage its cities and configuration.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Dialog open={isStateModalOpen} onOpenChange={setIsStateModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit State' : 'Add New State'}</DialogTitle>
                        <DialogDescription>Enter the details for the state.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="s-name">State Name</Label>
                            <Input id="s-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Maharashtra" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="s-code">State Code</Label>
                            <Input id="s-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. MH" className="font-mono uppercase" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStateModalOpen(false)}>Cancel</Button>
                        <Button className="text-white" onClick={handleStateSubmit}>{isEditing ? 'Save Changes' : 'Create State'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCityModalOpen} onOpenChange={setIsCityModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit City' : 'Add New City'}</DialogTitle>
                        <DialogDescription>Adding city to <span className="font-semibold text-primary">{selectedState?.state_name}</span></DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="c-name">City Name</Label>
                            <Input id="c-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Mumbai" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="c-code">City Code</Label>
                            <Input id="c-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. MUM" className="font-mono uppercase" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCityModalOpen(false)}>Cancel</Button>
                        <Button className="text-white" onClick={handleCitySubmit}>{isEditing ? 'Save Changes' : 'Create City'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmationDialog
                open={deleteState.open}
                onOpenChange={(val) => setDeleteState(prev => ({ ...prev, open: val }))}
                onConfirm={handleToggle}
                itemName={deleteState.name}
                title={deleteState.type === 'State' ? "Update State Status?" : "Update City Status?"}
                description={`Are you sure you want to change the status of this ${deleteState.type.toLowerCase()}?`}
                confirmText="Confirm"
            />
        </div>
    );
}
