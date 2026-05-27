import "server-only";

import { hmacSha256 } from "@/lib/crypto";
import { normalizeCpf } from "@/lib/cpf";
import { env } from "@/lib/env";

export function hashCpf(cpf: string) {
  return hmacSha256(`cpf:${normalizeCpf(cpf)}`, env.CODE_HASH_SECRET);
}
