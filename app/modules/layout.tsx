import type { Metadata } from "next";
import "./modules.css";

export const metadata: Metadata = {
  title: "Modules",
  description: "AI slide builder with virtual patient voice simulation.",
};

export default function ModulesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="modules">{children}</div>;
}
