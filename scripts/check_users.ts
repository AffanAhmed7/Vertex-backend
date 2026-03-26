import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        console.log(`TOTAL_USERS: ${count}`);
        
        const admin = await prisma.user.findUnique({
            where: { email: 'admin1234@gmail.com' }
        });
        console.log(`ADMIN_EXISTS: ${!!admin}`);
        
        const users = await prisma.user.findMany({
            take: 5,
            select: { email: true, name: true }
        });
        console.log('SAMPLE_USERS:', JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
