import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infographic Builder",
  description: "AI-generated patient education infographics",
};

export default function InfographicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
