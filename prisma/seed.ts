import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@igreja.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "troque-esta-senha";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, active: true },
    create: {
      email,
      name: "Administrador",
      passwordHash
    }
  });

  const election = await prisma.election.upsert({
    where: { id: "11111111-1111-4111-8111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Concílio Metodista",
      description: "Eleição demonstrativa para preparação do sistema.",
      status: "DRAFT"
    }
  });

  const candidates = ["Candidato A", "Candidato B", "Candidato C"];

  for (const [index, name] of candidates.entries()) {
    await prisma.candidate.upsert({
      where: { id: `22222222-2222-4222-8222-22222222222${index}` },
      update: {},
      create: {
        id: `22222222-2222-4222-8222-22222222222${index}`,
        electionId: election.id,
        name,
        description: "Exemplo de candidato. Edite no painel administrativo.",
        sortOrder: index
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
