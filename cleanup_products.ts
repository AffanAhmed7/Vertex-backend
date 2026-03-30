import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.product.deleteMany({
    where: {
      OR: [
        { description: { equals: '' } },
        { description: null }
      ]
    }
  });
  console.log(`Deleted ${deleted.count} products without description.`);
  await prisma.$disconnect();
}

main().catch(console.error);
