import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './src/user/user.entity';
import { Organization } from './src/organization/organization.entity';

async function seedUsers() {
  // Set default env vars if not set
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  process.env.DB_NAME = process.env.DB_NAME || 'event_booking';
  
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const userRepo = app.get(getRepositoryToken(User));
  const orgRepo = app.get(getRepositoryToken(Organization));

  // Get all organizations or create a default one
  let organizations = await orgRepo.find();
  
  if (organizations.length === 0) {
    // Create a default organization if none exists
    const defaultOrg = await orgRepo.save({
      name: 'Default Organization',
    });
    organizations = [defaultOrg];
  }

  // Create test users for each organization
  const testUsers = [];
  
  for (const org of organizations) {
    testUsers.push(
      {
        name: 'John Doe',
        email: `john.doe@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        organizationId: org.id,
      },
      {
        name: 'Jane Smith',
        email: `jane.smith@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        organizationId: org.id,
      },
      {
        name: 'Bob Johnson',
        email: `bob.johnson@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        organizationId: org.id,
      },
      {
        name: 'Alice Williams',
        email: `alice.williams@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        organizationId: org.id,
      },
      {
        name: 'Charlie Brown',
        email: `charlie.brown@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
        organizationId: org.id,
      },
    );
  }

  // Check if users already exist to avoid duplicates
  const existingUsers = await userRepo.find();
  const existingEmails = new Set(existingUsers.map(u => u.email));
  
  const newUsers = testUsers.filter(u => !existingEmails.has(u.email));
  
  if (newUsers.length > 0) {
    await userRepo.save(newUsers);
    console.log(`✅ Created ${newUsers.length} test users`);
  } else {
    console.log('ℹ️  Test users already exist');
  }

  const allUsers = await userRepo.find({ relations: ['organization'] });
  console.log(`\n📋 Total users in database: ${allUsers.length}`);
  allUsers.forEach(user => {
    console.log(`   - ${user.name} (${user.email}) - ${user.organization.name}`);
  });

  await app.close();
}

seedUsers().catch((error) => {
  console.error('Error seeding users:', error);
  process.exit(1);
});
