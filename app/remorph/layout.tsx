import type { Metadata } from "next";
import "./remorph.css";

export const metadata: Metadata = {
  title: "Remorph",
  description: "Region-targeted skin lesion image editing.",
};

export default function RemorphLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="remorph">{children}</div>;
}
