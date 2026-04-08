"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function PayRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const pa = searchParams.get("pa");
    const pn = searchParams.get("pn") || "Hospital";
    const am = searchParams.get("am");
    const tn = searchParams.get("tn") || "";

    if (pa && am) {
      const upiUrl = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
      // Small timeout to ensure the transition is smooth
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 500);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      <h2 className="text-2xl font-bold text-slate-800">Opening Payment App...</h2>
      <p className="text-slate-500 text-sm max-w-sm">
        If your UPI app does not open automatically, please scan this QR directly from inside PhonePe, GPay, or Paytm.
      </p>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <PayRedirect />
    </Suspense>
  );
}
