import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const databaseName = 'smart_hospital_proposed'

dotenv.config({ path: resolve(projectRoot, '.env') })

const schemaSql = await readFile(resolve(projectRoot, 'database/proposed_schema.sql'), 'utf8')
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  multipleStatements: true,
})

let databaseCreated = false

try {
  const [existingDatabase] = await connection.execute(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    [databaseName],
  )

  if (existingDatabase.length) {
    throw new Error(`${databaseName} already exists; refusing to overwrite it.`)
  }

  await connection.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  databaseCreated = true
  await connection.query(`USE \`${databaseName}\``)

  const schemaBody = schemaSql
    .replace(/^--.*(?:\r?\n|$)/gm, '')
    .replace(/CREATE DATABASE IF NOT EXISTS smart_hospital_proposed[\s\S]*?;\s*/i, '')
    .replace(/USE smart_hospital_proposed;\s*/i, '')

  await connection.query(schemaBody)

  const [tables] = await connection.execute(
    'SELECT COUNT(*) AS table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
    [databaseName],
  )

  console.log(`Applied proposed schema to ${databaseName} (${tables[0].table_count} tables).`)
} catch (error) {
  if (databaseCreated) {
    await connection.query(`DROP DATABASE \`${databaseName}\``).catch(() => undefined)
  }

  console.error(error.message)
  process.exitCode = 1
} finally {
  await connection.end()
}