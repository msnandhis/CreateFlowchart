import { SignupForm } from "@/features/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — CreateFlowchart",
  description: "Create a free account on CreateFlowchart.com and start building AI-powered flowcharts.",
};

export default function SignupPage() {
  return <SignupForm />;
}
