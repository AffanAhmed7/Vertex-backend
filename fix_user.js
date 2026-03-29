import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'user123@gmail.com' } });
    if (user && user.passwordHash === 'user123b') {
        const hashed = await bcrypt.hash('user123b', 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashed }
        });
        console.log('Fixed password for user123@gmail.com');
    } else {
        console.log('User not found or password already hashed');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
