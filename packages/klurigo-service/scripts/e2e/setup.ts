import { resetE2eDb } from './e2e-db'
import { seedDatabase } from './seed-database'

async function main() {
  await resetE2eDb({
    shouldWipeMongo: true,
    shouldWipeRedis: true,
    seed: async ({ mongo }) => {
      await seedDatabase(mongo)
    },
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
