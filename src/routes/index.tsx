import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TheInsuranceOS — Sistema operacional para corretoras" },
      {
        name: "description",
        content:
          "Gestão de carteira, apólices, pipeline e comissões para corretoras de seguros em uma única plataforma.",
      },
      { property: "og:title", content: "TheInsuranceOS" },
      {
        property: "og:description",
        content: "O sistema operacional das corretoras de seguros modernas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          TheInsuranceOS
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          O sistema operacional da sua corretora
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Carteira de clientes, apólices, follow-ups, pipeline comercial e financeiro — tudo em um
          só lugar, com dados reais e seguros.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
