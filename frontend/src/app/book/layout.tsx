import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule an Appointment",
  description: "Select your preferred service, date, and time.",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
