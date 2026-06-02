import { Construction } from "lucide-react";
import type { ReactNode } from "react";

export function ComingSoonOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-24 md:pt-32 px-4">
        <div
          className="rounded-2xl border border-white/40 bg-white/30 dark:bg-white/10 shadow-xl px-8 py-7 md:px-10 md:py-8 text-center max-w-md w-full"
          style={{ backdropFilter: "blur(24px) saturate(140%)" }}
        >
          <div className="mx-auto h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center mb-3">
            <Construction className="h-6 w-6 text-brand-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Em Breve</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Este módulo está em construção e estará disponível em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
