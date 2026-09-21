import mongoose from 'mongoose'

import { E2E_SEED_DOCUMENTS, type QuizDoc, type UserDoc } from './seed-data'

export async function seedDatabase(mongo: typeof mongoose): Promise<void> {
  const db = mongo.connection.db
  if (db) {
    await db.collection<UserDoc>('users').insertMany(E2E_SEED_DOCUMENTS.users)
    await db
      .collection<QuizDoc>('quizzes')
      .insertMany(E2E_SEED_DOCUMENTS.quizzes)
  }
}
