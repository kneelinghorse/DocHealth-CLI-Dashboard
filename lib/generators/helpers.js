/**
 * Utility helpers for generator modules.
 */

const crypto = require('crypto');

const NO_DATA = '_No data available_';

/**
 * Convert a string to a filesystem-safe slug.
 * @param {string} value
 * @param {string} fallback
 * @returns {string}
 */
function createSlug(value = '', fallback = 'doc') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

/**
 * Generate a stable semantic ID for a directive block.
 * @param {Object} endpoint
 * @param {string} namespace
 * @returns {string}
 */
function createSemanticId(endpoint = {}, namespace = 'api') {
  const opId = endpoint.operationId || endpoint.operation_id;
  if (opId) {
    return `${namespace}-${createSlug(opId)}`;
  }
  const signature = `${endpoint.method || 'get'}-${endpoint.path || 'root'}`;
  const digest = crypto.createHash('sha1').update(signature).digest('hex').slice(0, 10);
  return `${namespace}-${digest}`;
}

/**
 * Simple path accessor for nested values.
 * @param {Object} source
 * @param {string} path
 * @returns {unknown}
 */
function getPath(source, path = '') {
  if (!path) return undefined;
  return path.split('.').reduce((acc, segment) => (acc == null ? undefined : acc[segment]), source);
}

/**
 * Escape markdown table pipes.
 * @param {string} value
 * @returns {string}
 */
function escapePipes(value) {
  return value.replace(/\|/g, '\\|');
}

/**
 * Convert rows to a Markdown table string.
 * @param {Array} rows
 * @param {Array<{header:string, accessor:string|Function}>} columns
 * @returns {string}
 */
function jsonToMarkdownTable(rows = [], columns = []) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!safeRows.length || !columns.length) return NO_DATA;

  const headerLine = `| ${columns.map(col => col.header).join(' | ')} |`;
  const dividerLine = `| ${columns.map(() => '---').join(' | ')} |`;

  const bodyLines = safeRows.map(row => {
    const cells = columns.map(col => {
      const raw =
        typeof col.accessor === 'function'
          ? col.accessor(row)
          : getPath(row, col.accessor);
      const value = raw === undefined || raw === null || raw === ''
        ? '—'
        : escapePipes(String(raw));
      return value;
    });
    return `| ${cells.join(' | ')} |`;
  });

  return [headerLine, dividerLine, ...bodyLines].join('\n');
}

/**
 * Render schema information in a single line.
 * @param {Object} schema
 * @returns {string}
 */
function describeSchema(schema) {
  if (!schema || typeof schema !== 'object') return '—';
  if (schema.$ref) return schema.$ref;
  if (schema.type === 'array') {
    const inner = describeSchema(schema.items || {});
    return `array<${inner}>`;
  }
  if (schema.type) return schema.type;
  return 'object';
}

/**
 * Format API parameter definitions as a markdown table.
 * @param {Array<Object>} params
 * @returns {string}
 */
function formatParametersTable(params = []) {
  if (!Array.isArray(params) || params.length === 0) {
    return '_No parameters declared_';
  }
  return jsonToMarkdownTable(params, [
    { header: 'Name', accessor: row => row.name || '—' },
    { header: 'In', accessor: row => row.in || '—' },
    { header: 'Type', accessor: row => describeSchema(row.schema) },
    { header: 'Required', accessor: row => (row.required ? 'Yes' : 'No') },
    { header: 'Description', accessor: row => row.description || '—' }
  ]);
}

/**
 * Format responses as a markdown table.
 * @param {Array<Object>} responses
 * @returns {string}
 */
function formatResponsesTable(responses = []) {
  if (!Array.isArray(responses) || responses.length === 0) {
    return '_No responses defined_';
  }
  return jsonToMarkdownTable(responses, [
    { header: 'Status', accessor: row => row.status || '—' },
    { header: 'Description', accessor: row => row.description || '—' },
    { header: 'Schema', accessor: row => describeSchema(row.schema) }
  ]);
}

/**
 * Format declared errors as a markdown list.
 * @param {Array<Object>} errors
 * @returns {string}
 */
function formatErrorsList(errors = []) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '_No declared errors_';
  }
  const rows = errors.map(error => {
    const code = error.code || 'UNKNOWN';
    const status = error.http ? `HTTP ${error.http}` : 'HTTP —';
    const retriable = error.retriable ? ' (retriable)' : '';
    const description = error.description ? ` — ${error.description}` : '';
    return `- \`${code}\` → ${status}${retriable}${description}`;
  });
  return rows.join('\n');
}

/**
 * Format request body details.
 * @param {Object} request
 * @returns {string}
 */
function formatRequestBodySection(request) {
  if (!request) return '_No request body_';
  const lines = [];
  if (request.contentType) {
    lines.push(`- **Content Type:** \`${request.contentType}\``);
  }
  if (request.schema) {
    lines.push(`- **Schema:** ${describeSchema(request.schema)}`);
  }
  if (request.example) {
    lines.push('- **Example:**');
    lines.push('```json');
    lines.push(JSON.stringify(request.example, null, 2));
    lines.push('```');
  }
  return lines.length ? lines.join('\n') : '_Request schema unspecified_';
}

/**
 * Format pagination metadata.
 * @param {Object} pagination
 * @returns {string}
 */
function formatPaginationDetails(pagination) {
  if (!pagination || !pagination.style) return '_No pagination metadata_';
  const lines = [`- **Style:** ${pagination.style}`];
  if (pagination.params) {
    Object.entries(pagination.params).forEach(([key, value]) => {
      lines.push(`- **${key}:** \`${value}\``);
    });
  }
  return lines.join('\n');
}

/**
 * Format long-running operation metadata.
 * @param {Object} longRunning
 * @returns {string}
 */
function formatLongRunningDetails(longRunning) {
  if (!longRunning || !longRunning.pattern) return '_No long-running metadata_';
  const lines = [`- **Pattern:** ${longRunning.pattern}`];
  if (longRunning.status_endpoint) {
    lines.push(`- **Status Endpoint:** \`${longRunning.status_endpoint}\``);
  }
  return lines.join('\n');
}

/**
 * Format authentication summary.
 * @param {Object} auth
 * @returns {string}
 */
function formatAuthenticationSummary(auth) {
  if (!auth || auth.type === 'none') return 'None';
  const scopes = Array.isArray(auth.scopes) && auth.scopes.length
    ? ` (scopes: ${auth.scopes.join(', ')})`
    : '';
  return `${auth.type}${scopes}`;
}

/**
 * Wrap generated content in a directive with semantic ID.
 * @param {string} content
 * @param {Object} options
 * @param {string} options.id
 * @param {Object} options.attributes
 * @returns {string}
 */
function wrapGeneratedSection(content, { id, attributes = {} } = {}) {
  const attrParts = [];
  if (id) attrParts.push(`#${id}`);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    attrParts.push(`${key}="${String(value).replace(/"/g, '\\"')}"`);
  });
  const attrBlock = attrParts.length ? `{${attrParts.join(' ')}}` : '';
  const trimmed = (content || '').trim();
  return `:::generated-section${attrBlock}\n${trimmed}\n:::\n`;
}

module.exports = {
  createSlug,
  createSemanticId,
  describeSchema,
  jsonToMarkdownTable,
  formatParametersTable,
  formatResponsesTable,
  formatErrorsList,
  formatRequestBodySection,
  formatPaginationDetails,
  formatLongRunningDetails,
  formatAuthenticationSummary,
  wrapGeneratedSection
};
