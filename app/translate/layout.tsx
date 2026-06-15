import type { Metadata, Viewport } from "next";
import "./translate.css";

export const metadata: Metadata = {
  title: "Live Translate",
  description: "Real-time speech transcription and translation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function TranslateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="translate-tool">{children}</div>;
}
