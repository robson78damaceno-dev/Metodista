type SetOptions = {
  ex?: number;
  nx?: boolean;
};

type Entry =
  | { kind: "string"; value: unknown; expiresAt?: number }
  | { kind: "set"; value: Set<string>; expiresAt?: number }
  | { kind: "hash"; value: Map<string, number>; expiresAt?: number }
  | { kind: "list"; value: unknown[]; expiresAt?: number };

function isLocalAppUrl(url: string) {
  const normalized = url.toLowerCase();
  return normalized.includes("localhost") || normalized.includes("127.0.0.1");
}

export function shouldUseMemoryRedis() {
  if (process.env.VERCEL) return false;

  const useMemory = process.env.USE_DEV_MEMORY_STORE === "true";
  if (!useMemory) return false;

  // Segurança extra: só permite memória quando o app roda localmente.
  // Em Vercel/URLs públicas, memória causa "criou e sumiu".
  const appUrl = process.env.APP_URL ?? "";
  return isLocalAppUrl(appUrl);
}

class MemoryRedis {
  private store = new Map<string, Entry>();

  private cleanup(key: string) {
    const entry = this.store.get(key);
    if (!entry?.expiresAt) return entry ?? null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  private touch(key: string, entry: Entry, ex?: number) {
    if (ex) entry.expiresAt = Date.now() + ex * 1000;
    this.store.set(key, entry);
  }

  async set(key: string, value: unknown, options?: SetOptions) {
    if (this.cleanup(key) && options?.nx) return null;
    if (options?.nx && this.store.has(key)) return null;

    const entry: Entry = { kind: "string", value, expiresAt: undefined };
    this.touch(key, entry, options?.ex);
    return "OK";
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cleanup(key);
    if (!entry || entry.kind !== "string") return null;
    return entry.value as T;
  }

  async sadd(key: string, member: string) {
    let entry = this.cleanup(key);
    if (!entry) {
      entry = { kind: "set", value: new Set<string>() };
      this.store.set(key, entry);
    }
    if (entry.kind !== "set") return 0;
    entry.value.add(member);
    return 1;
  }

  async smembers(key: string): Promise<string[]> {
    const entry = this.cleanup(key);
    if (!entry || entry.kind !== "set") return [];
    return Array.from(entry.value);
  }

  async scard(key: string) {
    const members = await this.smembers(key);
    return members.length;
  }

  async expire(key: string, seconds: number) {
    const entry = this.cleanup(key) ?? this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, entry);
    return 1;
  }

  async incr(key: string) {
    const current = Number((await this.get<string>(key)) ?? 0);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  async incrby(key: string, increment: number) {
    const current = Number((await this.get<string>(key)) ?? 0);
    const next = current + increment;
    await this.set(key, String(next));
    return next;
  }

  async hincrby(key: string, field: string, increment: number) {
    let entry = this.cleanup(key);
    if (!entry) {
      entry = { kind: "hash", value: new Map<string, number>() };
      this.store.set(key, entry);
    }
    if (entry.kind !== "hash") return 0;
    const next = (entry.value.get(field) ?? 0) + increment;
    entry.value.set(field, next);
    return next;
  }

  async hgetall<T extends Record<string, string | number>>(key: string): Promise<T | null> {
    const entry = this.cleanup(key);
    if (!entry || entry.kind !== "hash") return {} as T;
    return Object.fromEntries(entry.value.entries()) as T;
  }

  async rpush(key: string, value: unknown) {
    let entry = this.cleanup(key);
    if (!entry) {
      entry = { kind: "list", value: [] };
      this.store.set(key, entry);
    }
    if (entry.kind !== "list") return 0;
    entry.value.push(value);
    return entry.value.length;
  }

  async lrange(key: string, start: number, end: number): Promise<unknown[]> {
    const entry = this.cleanup(key);
    if (!entry || entry.kind !== "list") return [];
    const normalizedEnd = end < 0 ? entry.value.length - 1 : end;
    return entry.value.slice(start, normalizedEnd + 1);
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }
}

const globalForMemoryRedis = globalThis as unknown as {
  memoryRedis?: MemoryRedis;
};

export const memoryRedis = globalForMemoryRedis.memoryRedis ?? new MemoryRedis();

if (process.env.NODE_ENV !== "production") {
  globalForMemoryRedis.memoryRedis = memoryRedis;
}
