import type { Metadata } from "next";
import {
  DM_Sans,
  IBM_Plex_Sans,
  Lora,
  Merriweather,
  Outfit,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import "./modules.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
});
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Modules",
  description: "AI slide builder with virtual patient voice simulation.",
};

export default function ModulesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`modules ${dmSans.variable} ${outfit.variable} ${ibmPlex.variable} ${sourceSerif.variable} ${lora.variable} ${merriweather.variable} ${playfair.variable}`}
    >
      {children}
    </div>
  );
}
