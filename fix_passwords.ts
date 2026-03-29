import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
    const users = await prisma.user.findMany();
    
    for (const user of users) {
        // If the password hash is very short (plain text) or doesn't look like a bcrypt hash
        if (user.passwordHash && !user.passwordHash.startsWith('$2')) {
            console.log(`Hashing password for user: ${user.email}`);
            const hashed = await bcrypt.hash(user.passwordHash, SALT_ROUNDS);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashed }
            });
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
