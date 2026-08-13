import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — TheInsuranceOS" },
      {
        name: "description",
        content: "Acesse o TheInsuranceOS para gerenciar clientes, apólices e comissões.",
      },
      { property: "og:title", content: "Entrar — TheInsuranceOS" },
      {
        property: "og:description",
        content: "Acesse o painel da sua corretora no TheInsuranceOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safeNext(): string {
  if (typeof window === "undefined") return "/app";
  const raw = new URLSearchParams(window.location.search).get("next");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/app";
}

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: safeNext(), replace: true });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.invalidate();
    void navigate({ to: safeNext(), replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}${safeNext()}`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    void navigate({ to: safeNext(), replace: true });
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth?next=${encodeURIComponent(safeNext())}`,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: safeNext(), replace: true });
  };

  const forgot = async () => {
    if (!email) {
      toast.error("Informe seu e-mail primeiro");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de redefinição para o seu e-mail");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">TheInsuranceOS</CardTitle>
          <CardDescription>
            {checkEmail
              ? "Confirme seu e-mail para concluir o cadastro."
              : "Entre para acessar a operação da sua corretora."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkEmail ? (
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação para <strong>{email}</strong>. Após confirmar, volte
              aqui e faça login.
            </p>
          ) : (
            <>
              <Button variant="outline" className="w-full" disabled={busy} onClick={google}>
                Continuar com Google
              </Button>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form className="space-y-4 pt-4" onSubmit={signIn}>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      Entrar
                    </Button>
                    <button
                      type="button"
                      className="w-full text-xs text-muted-foreground underline"
                      onClick={forgot}
                    >
                      Esqueci minha senha
                    </button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form className="space-y-4 pt-4" onSubmit={signUp}>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-up">E-mail</Label>
                      <Input
                        id="email-up"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-up">Senha</Label>
                      <Input
                        id="password-up"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
