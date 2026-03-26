import useSWR, { SWRConfiguration } from "swr";
import { api } from "@/lib/api";

const fetcher = async (url: string) => {
    const res = await api.get(url);
    return res as any; // Allow SWR to infer the structure
};

export function useApi<T>(url: string | null, config?: SWRConfiguration) {
    return useSWR<T>(url, fetcher, {
        revalidateOnFocus: false, // Don't spam backend when switching tabs
        dedupingInterval: 5000,   // Dedupe requests within 5 seconds
        ...config,
    });
}
