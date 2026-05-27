import Link from "next/link";
import { MethodistBrand } from "@/components/methodist-logo";
import { LoginForm } from "@/components/admin/login-form";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCsrfToken } from "@/lib/csrf";
import { logoutAdminAction } from "@/actions/auth";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  const csrfToken = await createCsrfToken();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <MethodistBrand subtitle="Acesso restrito" logoHeight={44} />
          <CardTitle>Painel administrativo</CardTitle>
          <CardDescription>Acesso restrito aos responsáveis pela organização da eleição.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session ? (
            <div className="rounded-2xl border bg-muted/50 p-4 text-sm">
              <p className="text-muted-foreground">
                Há uma sessão ativa como <span className="font-medium text-foreground">{session.email}</span>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/admin">Ir para o painel</Link>
                </Button>
              </div>
            </div>
          ) : null}
          <LoginForm csrfToken={csrfToken} />
          {session ? (
            <form action={logoutAdminAction}>
              <Button type="submit" variant="outline" className="w-full">
                Sair e entrar com outra conta
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
