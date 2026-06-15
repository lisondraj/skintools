import type { Metadata, Viewport } from "next";
import "./vsp.css";

export const metadata: Metadata = {
  title: "Virtual Patient",
  description: "Practice dermatology encounters with a voice patient and saved transcripts.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function VspLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="vsp-tool">{children}</div>;
}
