import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const votingCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{9,11}$/, "Informe o código no formato ABX-92K-LP1.");

export const feedbackSchema = z
  .string()
  .trim()
  .max(800, "O feedback deve ter no máximo 800 caracteres.")
  .optional()
  .transform((value) => (value ? value : undefined));

export const csrfSchema = z.string().min(16);
