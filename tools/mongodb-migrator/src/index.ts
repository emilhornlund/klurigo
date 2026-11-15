#!/usr/bin/env node

/**
 * MongoDB BSON Migration Transformer
 *
 * This script reads BSON dump files from a source directory, transforms the documents
 * based on hardcoded rules (e.g., quiz format normalization), and outputs BSON files
 * and metadata compatible with `mongorestore`.
 *
 * Features:
 * - Full document rewriting (not just renaming or copying).
 * - Robust BSON-aware typing, including support for ObjectId, Decimal128, Date, etc.
 * - Safely converts ISO date strings to native `Date` values.
 * - Skips collections without recognized transformation rules.
 */

import { existsSync, mkdirSync, readdirSync } from 'fs'
import { join, resolve } from 'path'

import { Command } from 'commander'

import { patchCollectionAvatars } from './patches/missing-avatars.patch'
import {
  cleanCollections,
  parseCollections,
  printCollectionsDiff,
  writeCollections,
} from './utils'

const program = new Command()

program
  .name('mongodb-migrator')
  .description('CLI tool to process MongoDB migration files')
  .requiredOption('-i, --inputDir <directory>', 'Input directory')
  .requiredOption('-o, --outputDir <directory>', 'Output directory')
  .option('--dbName <name>', 'MongoDB database name to use for output', '')

program.parse(process.argv)

const options = program.opts()

const inputDir = resolve(options.inputDir)
const outputDir = resolve(options.outputDir)
const dbOutputDir = join(outputDir, options.dbName)

if (!existsSync(inputDir)) {
  console.error(`Input directory does not exist: ${inputDir}`)
  process.exit(1)
}

if (!existsSync(dbOutputDir)) {
  mkdirSync(dbOutputDir, { recursive: true })
  console.log(`Created outputDir directory: ${dbOutputDir}`)
}

const bsonFiles = readdirSync(inputDir)
  .filter((f) => f.endsWith('.bson'))
  .filter((f) => /^[^.].*\.bson$/.test(f))

const collections = cleanCollections(parseCollections(inputDir, bsonFiles))
// Temporary backfill: remove this call and its import after the initial migration.
patchCollectionAvatars(collections)
printCollectionsDiff(collections)
writeCollections(outputDir, collections)
