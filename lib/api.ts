// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://opd-backend-hntt.onrender.com";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Helper to get headers with fallback auth
const getHeaders = (isMultipart: boolean = false) => {
    const headers: Record<string, string> = {
        // "Content-Type" is automatically set for FormData, only set for JSON
    };

    if (!isMultipart) {
        headers["Content-Type"] = "application/json";
    }

    // Auth Fallback: Get User ID from Local Storage if available
    if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("medcore_user");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.id) {
                    headers["x-user-id"] = parsedUser.id; // Keep for backward compatibility if needed temporarily
                }
                if (parsedUser.access_token) {
                    headers["Authorization"] = `Bearer ${parsedUser.access_token}`;
                }
            } catch (e) {
                console.warn("Failed to parse user for auth header", e);
            }
        }
    }

    return headers;
};

// Extractor for NestJS HTTP Exceptions
const extractErrorMsg = (error: any) => {
    if (!error) return "Request failed";
    if (Array.isArray(error.message)) return error.message[0];
    if (typeof error.message === "string") return error.message;
    if (typeof error.error === "string") return error.error;
    return "Request failed";
};

// Generic Fetch Wrapper
export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "GET",
            headers: getHeaders(),
            cache: "no-store",
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Request failed" }));
            throw new Error(extractErrorMsg(error));
        }
        return res.json();
    },

    post: async <T>(endpoint: string, data: any): Promise<T> => {
        const isFormData = data instanceof FormData;
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: getHeaders(isFormData),
            body: isFormData ? data : JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Request failed" }));
            throw new Error(extractErrorMsg(error));
        }
        return res.json();
    },

    put: async <T>(endpoint: string, data: any): Promise<T> => {
        const isFormData = data instanceof FormData;
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "PUT",
            headers: getHeaders(isFormData),
            body: isFormData ? data : JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Request failed" }));
            throw new Error(extractErrorMsg(error));
        }
        return res.json();
    },

    patch: async <T>(endpoint: string, data: any): Promise<T> => {
        const isFormData = data instanceof FormData;
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "PATCH",
            headers: getHeaders(isFormData),
            body: isFormData ? data : JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Request failed" }));
            throw new Error(extractErrorMsg(error));
        }
        return res.json();
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "DELETE",
            headers: getHeaders(),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: "Request failed" }));
            throw new Error(extractErrorMsg(error));
        }
        return res.json();
    }
};
