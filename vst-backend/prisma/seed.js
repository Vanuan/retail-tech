const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@vst.com' },
      update: {},
      create: {
        id: uuidv4(),
        email: 'admin@vst.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
      },
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create a sample test
    const sampleTest = await prisma.test.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Sample Product Page Test',
        description: 'Testing different product page layouts for conversion optimization',
        status: 'ACTIVE',
        userId: adminUser.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    console.log(`✅ Created sample test: ${sampleTest.name}`);

    // Create variants for the test
    const variants = await Promise.all([
      prisma.variant.upsert({
        where: { 
          testId_identifier: {
            testId: sampleTest.id,
            identifier: 'control',
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          testId: sampleTest.id,
          name: 'Control Variant',
          identifier: 'control',
          config: {
            layout: 'standard',
            buttonColor: '#007bff',
            showReviews: true,
            showRelatedProducts: true,
          },
          weight: 1.0,
          isControl: true,
        },
      }),
      prisma.variant.upsert({
        where: { 
          testId_identifier: {
            testId: sampleTest.id,
            identifier: 'variant-a',
          }
        },
        update: {},
        create: {
          id: uuidv4(),
          testId: sampleTest.id,
          name: 'Variant A - Minimal Layout',
          identifier: 'variant-a',
          config: {
            layout: 'minimal',
            buttonColor: '#28a745',
            showReviews: false,
            showRelatedProducts: false,
            highlightDiscount: true,
          },
          weight: 1.0,
          isControl: false,
        },
      }),
    ]);

    console.log(`✅ Created ${variants.length} variants`);
    console.log('🎉 Seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
