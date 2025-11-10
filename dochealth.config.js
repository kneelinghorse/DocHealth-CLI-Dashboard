module.exports = {
  // Protocol manifest paths
  protocols: {
    api: './src/api_protocol_*.js',
    data: './src/data_protocol_*.js',
    workflow: './src/workflow_protocol_*.js',
    documentation: './src/*documentation*protocol*.js',
    semantic: './src/semantic_protocol_*.js'
  },
  
  // Health check thresholds
  thresholds: {
    healthScore: 70,
    maxStaleDays: 30
  },
  
  // Output settings
  output: {
    format: 'markdown',
    directory: './docs'
  },
  
  // SME routing (future feature)
  sme: {
    autoRoute: false,
    reviewers: []
  }
};