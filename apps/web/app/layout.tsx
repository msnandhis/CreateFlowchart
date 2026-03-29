import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CreateFlowchart — AI-Powered Flowchart Builder",
    template: "%s — CreateFlowchart",
  },
  description:
    "Build, analyze, and share professional flowcharts with AI. Real-time collaboration, drag-and-drop editor, and one-click exports.",
  keywords: [
    "flowchart",
    "flowchart maker",
    "AI flowchart",
    "diagram builder",
    "process flow",
    "collaboration",
  ],
  openGraph: {
    title: "CreateFlowchart — AI-Powered Flowchart Builder",
    description:
      "Build, analyze, and share professional flowcharts with AI.",
    siteName: "CreateFlowchart",
    type: "website",
  },
};

import { QueryProvider } from "@/shared/providers/QueryProvider";
import { ToastProvider } from "@/shared/ui/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
