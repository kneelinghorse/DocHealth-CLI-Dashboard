import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const ensureDirectory = (targetPath) => {
  const directory = path.dirname(targetPath)
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }
}

export const createDatabase = (dbPath) => {
  ensureDirectory(dbPath)
  const database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  return database
}
