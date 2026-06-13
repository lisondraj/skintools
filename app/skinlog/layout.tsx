import type { Metadata, Viewport } from "next";
import "./skinlog.css";

export const metadata: Metadata = {
  title: "SkinLog",
  description: "Track skin changes over time for personal reference.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function SkinLogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="skinlog">{children}</div>;
}
