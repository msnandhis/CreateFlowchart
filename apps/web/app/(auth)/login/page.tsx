import { LoginForm } from "@/features/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — CreateFlowchart",
  description: "Sign in to CreateFlowchart.com to manage your AI-powered flowcharts.",
};

export default function LoginPage() {
  return <LoginForm />;
}
