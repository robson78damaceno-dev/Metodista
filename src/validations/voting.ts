import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { csrfSchema, feedbackSchema } from "@/validations/common";

export const requestVotingLinkSchema = z.object({
  cpf: z
    .string()
    .trim()
    .refine((value) => isValidCpf(value), "Informe um CPF válido.")
    .transform((value) => normalizeCpf(value)),
  email: z.string().trim().email("Informe um e-mail válido.").toLowerCase(),
  csrfToken: csrfSchema
});

export const submitVoteSchema = z.object({
  decisions: z.string().min(2, "Informe os votos dos candidatos."),
  csrfToken: csrfSchema
});
