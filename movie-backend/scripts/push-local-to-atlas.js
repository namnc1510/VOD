const path = require('node:path')
const { spawn } = require('node:child_process')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true })

const DEFAULT_SOURCE_URI = 'mongodb://127.0.0.1:27017/The-Movie'
const DEFAULT_BATCH_SIZE = 250
const DEFAULT_COLLECTIONS = [
  'categories',
  'countries',
  'qualities',
  'formats',
  'persons',
  'movies',
  'episodes',
  'settings',
  'users',
  'comments',
  'watchlists',
  'transactions',
  'role_permissions'
]

let cachedConfig = null

function log(message, context) {
  const payload = {
    time: new Date().toISOString(),
    message,
    ...(context && typeof context === 'object' ? { context } : {})
  }

  console.log(JSON.stringify(payload))
}

function printHelp() {
  console.log(`Usage:
  npm run db:atlas:push
  npm run db:atlas:dry

Environment:
  SOURCE_MONGO_URI   MongoDB local/source URI. Default: mongodb://127.0.0.1:27017/The-Movie
  ATLAS_MONGO_URI    MongoDB Atlas/target URI. Required unless TARGET_MONGO_URI is set.
  TARGET_MONGO_URI   Alias for ATLAS_MONGO_URI.
  ATLAS_SYNC_COLLECTIONS Optional comma-separated collection list.
  ATLAS_SYNC_BATCH_SIZE  Optional batch size. Default: 250

Flags:
  --dry-run            Read source and report what would be synced, no writes.
  --skip-normalize     Skip running scripts/sync-data.js on source before push.
  --drop-target        Drop each target collection before importing from source.
  --no-delete-missing  Do not delete target documents missing from source.
  --allow-local-target Allow target URI to point to localhost/127.0.0.1.
  --collections=a,b    Override collection list for this run.
  --batch-size=500     Override batch size for bulk operations.
  --help               Show this help.

PowerShell example:
  $env:SOURCE_MONGO_URI="mongodb://127.0.0.1:27017/The-Movie"
  $env:ATLAS_MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/The-Movie?retryWrites=true&w=majority"
  npm run db:atlas:dry
  npm run db:atlas:push`)
}

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = require('../src/config/env')
  }

  return cachedConfig
}

function parseList(value) {
  if (typeof value !== 'string' || !value.trim()) return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseCliOptions(argv) {
  const options = {
    dryRun: false,
    skipNormalize: false,
    dropTarget: false,
    deleteMissing: true,
    allowLocalTarget: false,
    showHelp: false,
    collections: [],
    batchSize: parsePositiveInt(process.env.ATLAS_SYNC_BATCH_SIZE, DEFAULT_BATCH_SIZE),
  }

  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true
      continue
    }

    if (arg === '--skip-normalize') {
      options.skipNormalize = true
      continue
    }

    if (arg === '--drop-target') {
      options.dropTarget = true
      continue
    }

    if (arg === '--no-delete-missing') {
      options.deleteMissing = false
      continue
    }

    if (arg === '--allow-local-target') {
      options.allowLocalTarget = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      options.showHelp = true
      continue
    }

    if (arg.startsWith('--collections=')) {
      options.collections = parseList(arg.slice('--collections='.length))
      continue
    }

    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInt(arg.slice('--batch-size='.length), options.batchSize)
    }
  }

  if (options.collections.length === 0) {
    options.collections = parseList(process.env.ATLAS_SYNC_COLLECTIONS)
  }

  return options
}

function maskMongoUri(uri) {
  return String(uri || '').replace(/(mongodb(?:\+srv)?:\/\/)([^@/]+)@/i, '$1***:***@')
}

function isLocalMongoUri(uri) {
  return /:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:[/?]|$)/i.test(String(uri || ''))
}

function getIndexSignature(index) {
  const signature = {
    key: index.key,
    unique: Boolean(index.unique),
    sparse: Boolean(index.sparse),
    partialFilterExpression: index.partialFilterExpression || null,
    expireAfterSeconds: index.expireAfterSeconds ?? null,
    collation: index.collation || null,
    weights: index.weights || null,
    default_language: index.default_language || null,
    language_override: index.language_override || null,
    hidden: Boolean(index.hidden),
  }

  return JSON.stringify(signature)
}

function toCreateIndexSpec(index) {
  const spec = {
    key: index.key,
    name: index.name
  }

  const optionKeys = [
    'unique',
    'sparse',
    'partialFilterExpression',
    'expireAfterSeconds',
    'collation',
    'weights',
    'default_language',
    'language_override',
    'hidden',
  ]

  for (const key of optionKeys) {
    if (index[key] !== undefined) {
      spec[key] = index[key]
    }
  }

  return spec
}

async function collectionExists(db, name) {
  const collections = await db.listCollections({ name }, { nameOnly: true }).toArray()
  return collections.length > 0
}

async function safeCount(collection) {
  try {
    return await collection.estimatedDocumentCount()
  } catch (error) {
    if (error?.codeName === 'NamespaceNotFound') {
      return 0
    }

    return collection.countDocuments()
  }
}

async function safeIndexes(collection) {
  try {
    return await collection.indexes()
  } catch (error) {
    if (error?.codeName === 'NamespaceNotFound') {
      return [{ name: '_id_', key: { _id: 1 } }]
    }

    throw error
  }
}

async function flushWriteBatch(collection, operations) {
  if (operations.length === 0) return
  await collection.bulkWrite(operations, { ordered: false })
  operations.length = 0
}

async function flushDeleteBatch(collection, ids) {
  if (ids.length === 0) return
  await collection.deleteMany({ _id: { $in: ids } })
  ids.length = 0
}

async function runSourceNormalization({ sourceUri, dryRun }) {
  const syncScriptPath = path.resolve(__dirname, 'sync-data.js')
  const backendDir = path.resolve(__dirname, '..')
  const args = [syncScriptPath]

  if (dryRun) {
    args.push('--dry-run')
  }

  log('atlas_sync_normalize_start', {
    dryRun,
    sourceUri: maskMongoUri(sourceUri)
  })

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: backendDir,
      env: {
        ...process.env,
        MONGO_URI: sourceUri
      },
      stdio: 'inherit'
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Source normalization failed with exit code ${code}`))
    })
  })

  log('atlas_sync_normalize_done', {
    dryRun,
    sourceUri: maskMongoUri(sourceUri)
  })
}

async function connectMongo(uri) {
  const runtimeConfig = getConfig()
  const connection = mongoose.createConnection(uri, {
    maxPoolSize: runtimeConfig.mongoMaxPoolSize,
    serverSelectionTimeoutMS: runtimeConfig.mongoServerSelectionTimeoutMs,
    socketTimeoutMS: runtimeConfig.mongoSocketTimeoutMs,
  })

  await connection.asPromise()
  return connection
}

function sortCollections(collections) {
  return [...collections].sort((a, b) => {
    const ai = DEFAULT_COLLECTIONS.indexOf(a)
    const bi = DEFAULT_COLLECTIONS.indexOf(b)
    const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
    const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi

    if (aRank !== bRank) return aRank - bRank
    return a.localeCompare(b)
  })
}

async function resolveCollections(sourceDb, requestedCollections) {
  const discovered = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
    .map((item) => item.name)
    .filter((name) => !name.startsWith('system.'))

  const discoveredSet = new Set(discovered)

  if (requestedCollections.length > 0) {
    const missing = requestedCollections.filter((name) => !discoveredSet.has(name))
    if (missing.length > 0) {
      throw new Error(`Requested collections not found in source DB: ${missing.join(', ')}`)
    }

    return sortCollections(requestedCollections)
  }

  const selected = DEFAULT_COLLECTIONS.filter((name) => discoveredSet.has(name))
  const skipped = discovered.filter((name) => !DEFAULT_COLLECTIONS.includes(name))

  if (skipped.length > 0) {
    log('atlas_sync_skip_unknown_collections', {
      collections: skipped
    })
  }

  return sortCollections(selected)
}

async function syncIndexes({ sourceCollection, targetCollection, dryRun, dropTarget }) {
  const sourceIndexes = (await safeIndexes(sourceCollection)).filter((index) => index.name !== '_id_')

  if (sourceIndexes.length === 0) {
    return {
      sourceIndexes: 0,
      createdIndexes: 0
    }
  }

  if (dryRun) {
    return {
      sourceIndexes: sourceIndexes.length,
      createdIndexes: sourceIndexes.length
    }
  }

  if (dropTarget) {
    await targetCollection.createIndexes(sourceIndexes.map(toCreateIndexSpec))
    return {
      sourceIndexes: sourceIndexes.length,
      createdIndexes: sourceIndexes.length
    }
  }

  const targetIndexes = (await safeIndexes(targetCollection)).filter((index) => index.name !== '_id_')
  const targetSignatures = new Set(targetIndexes.map(getIndexSignature))
  const toCreate = sourceIndexes.filter((index) => !targetSignatures.has(getIndexSignature(index)))

  if (toCreate.length === 0) {
    return {
      sourceIndexes: sourceIndexes.length,
      createdIndexes: 0
    }
  }

  try {
    await targetCollection.createIndexes(toCreate.map(toCreateIndexSpec))
    return {
      sourceIndexes: sourceIndexes.length,
      createdIndexes: toCreate.length
    }
  } catch (error) {
    log('atlas_sync_index_warning', {
      collection: sourceCollection.collectionName,
      error: error?.message,
      tip: 'Use --drop-target if you need target indexes to be recreated exactly from source.'
    })

    return {
      sourceIndexes: sourceIndexes.length,
      createdIndexes: 0
    }
  }
}

async function mirrorCollection({
  sourceDb,
  targetDb,
  collectionName,
  dryRun,
  dropTarget,
  deleteMissing,
  batchSize,
}) {
  const sourceCollection = sourceDb.collection(collectionName)
  const targetCollection = targetDb.collection(collectionName)
  const sourceCount = await safeCount(sourceCollection)
  const targetCountBefore = await safeCount(targetCollection)
  const sourceIds = deleteMissing && !dropTarget ? new Set() : null
  const writeBatch = []
  const deleteBatch = []
  let scanned = 0
  let deleted = 0

  if (dropTarget && !dryRun && (await collectionExists(targetDb, collectionName))) {
    await targetCollection.drop()
  }

  const sourceCursor = sourceCollection.find({}, { batchSize })

  for await (const doc of sourceCursor) {
    scanned += 1

    if (sourceIds) {
      sourceIds.add(String(doc._id))
    }

    if (dryRun) {
      continue
    }

    writeBatch.push({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true
      }
    })

    if (writeBatch.length >= batchSize) {
      await flushWriteBatch(targetCollection, writeBatch)
    }
  }

  if (!dryRun) {
    await flushWriteBatch(targetCollection, writeBatch)
  }

  if (deleteMissing && !dropTarget) {
    const targetCursor = targetCollection.find({}, { projection: { _id: 1 }, batchSize })

    for await (const doc of targetCursor) {
      if (sourceIds && sourceIds.has(String(doc._id))) {
        continue
      }

      deleted += 1

      if (dryRun) {
        continue
      }

      deleteBatch.push(doc._id)
      if (deleteBatch.length >= batchSize) {
        await flushDeleteBatch(targetCollection, deleteBatch)
      }
    }

    if (!dryRun) {
      await flushDeleteBatch(targetCollection, deleteBatch)
    }
  }

  const indexSummary = await syncIndexes({
    sourceCollection,
    targetCollection,
    dryRun,
    dropTarget
  })

  return {
    collection: collectionName,
    sourceCount,
    targetCountBefore,
    scanned,
    upserts: scanned,
    deleted,
    sourceIndexes: indexSummary.sourceIndexes,
    createdIndexes: indexSummary.createdIndexes
  }
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))

  if (options.showHelp) {
    printHelp()
    return
  }

  const sourceUri = String(
    process.env.SOURCE_MONGO_URI ||
    process.env.LOCAL_MONGO_URI ||
    DEFAULT_SOURCE_URI
  ).trim()

  const targetUri = String(
    process.env.ATLAS_MONGO_URI ||
    process.env.TARGET_MONGO_URI ||
    ''
  ).trim()

  if (!targetUri) {
    throw new Error('ATLAS_MONGO_URI (or TARGET_MONGO_URI) is required.')
  }

  if (sourceUri === targetUri) {
    throw new Error('SOURCE_MONGO_URI and ATLAS_MONGO_URI must not point to the same database.')
  }

  if (!options.allowLocalTarget && isLocalMongoUri(targetUri)) {
    throw new Error('Target URI looks like localhost. Pass --allow-local-target only if this is intentional.')
  }

  log('atlas_sync_start', {
    dryRun: options.dryRun,
    skipNormalize: options.skipNormalize,
    dropTarget: options.dropTarget,
    deleteMissing: options.deleteMissing,
    batchSize: options.batchSize,
    sourceUri: maskMongoUri(sourceUri),
    targetUri: maskMongoUri(targetUri),
    requestedCollections: options.collections
  })

  if (!options.skipNormalize) {
    await runSourceNormalization({
      sourceUri,
      dryRun: options.dryRun
    })
  }

  let sourceConnection
  let targetConnection

  try {
    sourceConnection = await connectMongo(sourceUri)
    targetConnection = await connectMongo(targetUri)

    const collections = await resolveCollections(sourceConnection.db, options.collections)
    if (collections.length === 0) {
      throw new Error('No known application collections were found in source database.')
    }

    log('atlas_sync_collections_ready', {
      collections,
      sourceDatabase: sourceConnection.name,
      targetDatabase: targetConnection.name
    })

    const summaries = []
    for (const collectionName of collections) {
      log('atlas_sync_collection_start', { collection: collectionName })
      const summary = await mirrorCollection({
        sourceDb: sourceConnection.db,
        targetDb: targetConnection.db,
        collectionName,
        dryRun: options.dryRun,
        dropTarget: options.dropTarget,
        deleteMissing: options.deleteMissing,
        batchSize: options.batchSize,
      })

      summaries.push(summary)
      log('atlas_sync_collection_done', summary)
    }

    const totals = summaries.reduce((acc, item) => {
      acc.collections += 1
      acc.sourceCount += item.sourceCount
      acc.targetCountBefore += item.targetCountBefore
      acc.upserts += item.upserts
      acc.deleted += item.deleted
      acc.createdIndexes += item.createdIndexes
      return acc
    }, {
      collections: 0,
      sourceCount: 0,
      targetCountBefore: 0,
      upserts: 0,
      deleted: 0,
      createdIndexes: 0
    })

    log('atlas_sync_summary', {
      dryRun: options.dryRun,
      skipNormalize: options.skipNormalize,
      dropTarget: options.dropTarget,
      deleteMissing: options.deleteMissing,
      batchSize: options.batchSize,
      collections,
      totals
    })
  } finally {
    await Promise.allSettled([
      sourceConnection ? sourceConnection.close() : Promise.resolve(),
      targetConnection ? targetConnection.close() : Promise.resolve(),
    ])
  }
}

if (require.main === module) {
  main().catch((error) => {
    log('atlas_sync_failed', {
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      }
    })
    process.exitCode = 1
  })
}
