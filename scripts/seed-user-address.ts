import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'user123@gmail.com';
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log(`User ${email} not found. Please register it first.`);
        return;
    }

    const dummyAddress = {
        userId: user.id,
        fullName: 'John Doe',
        street: '123 E-Commerce Ave',
        city: 'Digital City',
        postalCode: '90001',
        country: 'USA',
        isDefault: true,
        type: 'SHIPPING' as any
    };

    const existingAddress = await prisma.address.findFirst({
        where: { userId: user.id, isDefault: true }
    });

    if (existingAddress) {
        await prisma.address.update({
            where: { id: existingAddress.id },
            data: dummyAddress
        });
        console.log(`Updated existing address for ${email}`);
    } else {
        await prisma.address.create({
            data: dummyAddress
        });
        console.log(`Created new dummy address for ${email}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
