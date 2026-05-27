CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

CREATE TABLE "elections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "electionId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voting_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "electionId" UUID NOT NULL,
  "codeHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "voting_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "votes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "candidateId" UUID NOT NULL,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "spent_ballots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "electionId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "spent_ballots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rate_limit_buckets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "csrf_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "csrf_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorId" UUID,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voting_codes_codeHash_key" ON "voting_codes"("codeHash");
CREATE UNIQUE INDEX "spent_ballots_tokenHash_key" ON "spent_ballots"("tokenHash");
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "rate_limit_buckets_key_action_key" ON "rate_limit_buckets"("key", "action");
CREATE UNIQUE INDEX "csrf_tokens_tokenHash_key" ON "csrf_tokens"("tokenHash");

CREATE INDEX "elections_status_idx" ON "elections"("status");
CREATE INDEX "candidates_electionId_active_idx" ON "candidates"("electionId", "active");
CREATE INDEX "candidates_electionId_sortOrder_idx" ON "candidates"("electionId", "sortOrder");
CREATE INDEX "voting_codes_electionId_active_used_idx" ON "voting_codes"("electionId", "active", "used");
CREATE INDEX "votes_candidateId_idx" ON "votes"("candidateId");
CREATE INDEX "votes_createdAt_idx" ON "votes"("createdAt");
CREATE INDEX "spent_ballots_electionId_idx" ON "spent_ballots"("electionId");
CREATE INDEX "rate_limit_buckets_resetAt_idx" ON "rate_limit_buckets"("resetAt");
CREATE INDEX "csrf_tokens_expiresAt_idx" ON "csrf_tokens"("expiresAt");
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voting_codes" ADD CONSTRAINT "voting_codes_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spent_ballots" ADD CONSTRAINT "spent_ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
