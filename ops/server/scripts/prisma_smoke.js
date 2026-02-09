/* eslint-disable no-console */

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const classCount = await prisma.class.count();
    const sample = await prisma.class.findFirst({
      select: { id: true, oneOnOneGroupId: true, oneOnOneStudentId: true },
    });
    console.log(JSON.stringify({ classCount, sample }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

