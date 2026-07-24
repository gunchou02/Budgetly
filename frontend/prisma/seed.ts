import { hash } from 'bcryptjs';
import { getDb } from '../src/server/db';
import { ensureDefaultCategories } from '../src/server/default-categories';

async function main() {
  if (process.env.BUDGETLY_SEED_DEMO !== 'true') {
    console.log('Skipping demo user seed. Set BUDGETLY_SEED_DEMO=true to enable it.');
    return;
  }

  const db = getDb();
  const user = await db.user.upsert({
    where: { email: 'demo@budgetly.local' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@budgetly.local',
      passwordHash: await hash('password123', 12),
    },
  });

  await ensureDefaultCategories(user.id);
  console.log(`Seeded demo user ${user.email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDb().$disconnect();
  });
