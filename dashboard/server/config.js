import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_DB_PATH = path.join(__dirname, '../data/dochealth.sqlite')
const DEFAULT_PORT = 4319

export const config = {
  dbPath: process.env.DOCHEALTH_DASHBOARD_DB
    ? path.resolve(process.env.DOCHEALTH_DASHBOARD_DB)
    : DEFAULT_DB_PATH,
  serverPort: Number.parseInt(process.env.DOCHEALTH_DASHBOARD_PORT ?? DEFAULT_PORT, 10),
}
