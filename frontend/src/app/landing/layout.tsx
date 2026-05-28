import type { ReactNode } from "react";

// Marketing layout — no app shell, sidebar, or auth wrapper. Just the page.
export default function LandingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-bg text-fg antialiased">{children}</div>;
}
