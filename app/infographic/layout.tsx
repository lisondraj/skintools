import type { Metadata, Viewport } from "next";
import "../skinlog/skinlog.css";
import "./infographic.css";

export const metadata: Metadata = {
  title: "Infographic Builder",
  description: "AI-generated patient education infographics",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function InfographicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="skinlog">{children}</div>;
}
