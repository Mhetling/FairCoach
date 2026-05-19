import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "@/components/Footer";

interface AppShellProps {
  title: string;
  showBack?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, showBack, rightSlot, children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <Header title={title} showBack={showBack} rightSlot={rightSlot} />
      <main
        className="mx-auto max-w-xl px-4 pb-12 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 3rem)" }}
      >
        {children}
        <Footer />
      </main>
    </div>
  );
}
