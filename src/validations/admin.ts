import { z } from "zod";
import { uuidSchema } from "@/validations/common";

export const loginSchema = z.object({
  email: z.string().trim().min(2, "Informe o usuário.").toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  csrfToken: z.string().min(16)
});

export const electionSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().trim().min(3, "Informe um título.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  recipientEmail1: z.string().trim().email("Informe um email válido.").toLowerCase(),
  recipientEmail2: z.string().trim().email("Informe um email válido.").toLowerCase(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
  csrfToken: z.string().min(16)
});

export const candidateSchema = z.object({
  id: uuidSchema.optional(),
  electionId: uuidSchema,
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  csrfToken: z.string().min(16)
});

export const changeElectionStatusSchema = z.object({
  electionId: uuidSchema,
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  csrfToken: z.string().min(16)
});

export const changeAdminAccountSchema = z
  .object({
    currentPassword: z.string().min(8, "Informe a senha atual."),
    email: z.string().trim().min(2, "Informe o usuário.").toLowerCase(),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    csrfToken: z.string().min(16)
  })
  .superRefine((data, ctx) => {
    const newPassword = data.newPassword?.trim() ?? "";
    const confirmPassword = data.confirmPassword?.trim() ?? "";

    if (!newPassword) {
      if (confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "Preencha a nova senha ou deixe os dois campos em branco.",
          path: ["confirmPassword"]
        });
      }
      return;
    }

    if (newPassword.length < 8) {
      ctx.addIssue({
        code: "custom",
        message: "A nova senha deve ter pelo menos 8 caracteres.",
        path: ["newPassword"]
      });
    }

    if (newPassword !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "A confirmação não coincide com a nova senha.",
        path: ["confirmPassword"]
      });
    }
  });
