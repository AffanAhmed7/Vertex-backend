import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const deleted = await prisma.product.deleteMany({
      where: {
        OR: [
          { description: { equals: '' } },
          { description: { equals: null as any } }
        ]
      }
    });
    console.log(`Successfully deleted ${deleted.count} products without description.`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
