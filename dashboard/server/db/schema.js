const CREATE_ANALYSIS_RUNS = `
CREATE TABLE IF NOT EXISTS analysis_runs (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_timestamp INTEGER NOT NULL,
  overall_health_score REAL NOT NULL,
  total_protocols_analyzed INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);`

const CREATE_PROTOCOL_DEFINITIONS = `
CREATE TABLE IF NOT EXISTS protocol_definitions (
  protocol_id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol_name TEXT NOT NULL UNIQUE,
  file_path TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);`

const CREATE_PROTOCOL_SNAPSHOTS = `
CREATE TABLE IF NOT EXISTS protocol_snapshots (
  snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES analysis_runs(run_id) ON DELETE CASCADE,
  protocol_id INTEGER NOT NULL REFERENCES protocol_definitions(protocol_id) ON DELETE CASCADE,
  health_score REAL NOT NULL,
  raw_analysis_output TEXT NOT NULL,
  recorded_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);`

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON analysis_runs (run_timestamp DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_protocol_name ON protocol_definitions (protocol_name);`,
  `CREATE INDEX IF NOT EXISTS idx_snapshot_trends ON protocol_snapshots (protocol_id, run_id);`,
]

export const applyMigrations = (db) => {
  db.exec('BEGIN')
  try {
    db.exec(CREATE_ANALYSIS_RUNS)
    db.exec(CREATE_PROTOCOL_DEFINITIONS)
    db.exec(CREATE_PROTOCOL_SNAPSHOTS)
    INDEXES.forEach((statement) => db.exec(statement))
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
