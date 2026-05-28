"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCsrfToken } from "@/lib/csrf";
import { updateAdminCredentials, verifyAdminLogin } from "@/lib/admin-credentials";
import {
  createAdminToken,
  clearAdminSessionCookie,
  requireAdminSession,
  setAdminSessionCookie
} from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { changeAdminAccountSchema, loginSchema } from "@/validations/admin";
import type { ActionState } from "@/types/actions";

export async function loginAdminAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = loginSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);
    await assertRateLimit({
      action: "admin-login",
      identifier: parsed.email,
      limit: 6,
      windowSeconds: 15 * 60
    });

    const isValid = await verifyAdminLogin(parsed.email, parsed.password);
    if (!isValid) {
      return { ok: false, message: "E-mail ou senha inválidos." };
    }

    const token = await createAdminToken({
      sub: "local-admin",
      email: parsed.email,
      name: "Administrador"
    });

    await setAdminSessionCookie(token);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Não foi possível entrar.";
    const message =
      raw.toLowerCase().includes("fetch failed") || raw.includes("Upstash")
        ? "Banco de dados (Upstash) não configurado na Vercel. Crie um Redis em console.upstash.com e atualize UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN."
        : raw;
    return { ok: false, message };
  }

  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}

export async function changeAdminAccountAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminSession();
    const parsed = changeAdminAccountSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);
    await assertRateLimit({
      action: "admin-change-account",
      identifier: "admin-account",
      limit: 10,
      windowSeconds: 60 * 60
    });

    const newPassword = parsed.newPassword?.trim() || undefined;
    const updated = await updateAdminCredentials({
      currentPassword: parsed.currentPassword,
      email: parsed.email,
      newPassword
    });

    const token = await createAdminToken({
      sub: "local-admin",
      email: updated.email,
      name: "Administrador"
    });
    await setAdminSessionCookie(token);
    revalidatePath("/admin");

    return {
      ok: true,
      message: newPassword
        ? "E-mail e senha atualizados com sucesso."
        : "E-mail de acesso atualizado com sucesso."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível atualizar a conta."
    };
  }
}
