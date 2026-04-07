import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OPD Token Display | MedCore HMS",
  description: "Live OPD queue token display for hospital TV screens",
};

/**
 * TV Display layout — intentionally bare-bones.
 * No auth providers, no navigation, no theme wrappers.
 * This page is meant to run fullscreen on a hospital TV.
 */
export default function TVDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
