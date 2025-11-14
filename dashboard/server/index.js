import { config } from './config.js'
import { createServer } from './server.js'
import { createDefaultRepository } from './db/healthRepository.js'

const repository = createDefaultRepository(config.dbPath)
const app = createServer({ repository })

app.listen(config.serverPort, () => {
  console.log(
    `[DocHealth API] listening on http://localhost:${config.serverPort} using ${config.dbPath}`,
  )
})
