import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin1234@gmail.com' },
    select: { email: true, avatar: true }
  });
  console.log('User Avatar in DB:', user?.avatar);
  await prisma.$disconnect();
}

main().catch(console.error);
