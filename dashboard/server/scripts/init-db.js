#!/usr/bin/env node
import { config } from '../config.js'
import { createDatabase } from '../db/client.js'
import { applyMigrations } from '../db/schema.js'

const db = createDatabase(config.dbPath)
applyMigrations(db)
console.log(`SQLite database ready at ${config.dbPath}`)
