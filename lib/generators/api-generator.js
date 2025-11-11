/**
 * API reference generator (Stage 1 + Stage 2 pipeline).
 */

const { performance } = require('node:perf_hooks');
const {
  analyzeFreshness,
  analyzeCoverage,
  calculateCombinedHealthScore
} = require('../analyzer');
const {
  createSlug,
  createSemanticId,
  formatParametersTable,
  formatResponsesTable,
  formatErrorsList,
  formatRequestBodySection,
  formatPaginationDetails,
  formatLongRunningDetails,
  formatAuthenticationSummary,
  wrapGeneratedSection
} = require('./helpers');
const { createFrontmatterPlugin } = require('./frontmatter-plugin');

let remarkStackPromise = null;

async function loadRemarkStack() {
  if (!remarkStackPromise) {
    remarkStackPromise = (async () => {
      const [{ unified }, remarkParseModule, remarkStringifyModule, remarkFrontmatterModule, remarkDirectiveModule] =
        await Promise.all([
          import('unified'),
          import('remark-parse'),
          import('remark-stringify'),
          import('remark-frontmatter'),
          import('remark-directive')
        ]);

      return {
        unified,
        remarkParse: remarkParseModule.default || remarkParseModule,
        remarkStringify: remarkStringifyModule.default || remarkStringifyModule,
        remarkFrontmatter: remarkFrontmatterModule.default || remarkFrontmatterModule,
        remarkDirective: remarkDirectiveModule.default || remarkDirectiveModule
      };
    })();
  }
  return remarkStackPromise;
}

function buildHealthSection(health = {}) {
  const { freshness, coverage, combined } = health;
  const rows = [];
  if (freshness) {
    rows.push(`- **Freshness:** ${freshness.healthScore ?? 'n/a'}/100 (${freshness.severity || 'unknown'})`);
  }
  if (coverage) {
    const coveragePercent = Math.round((coverage.coveragePercentage || 0) * 100);
    if (Number.isFinite(coveragePercent)) {
      rows.push(
        `- **Coverage:** ${coveragePercent}% (${coverage.documentedEndpoints || 0}/${coverage.totalEndpoints || coverage.totalItems || 0})`
      );
    }
  }
  if (combined) {
    rows.push(`- **Overall Health:** ${combined.healthScore ?? 'n/a'}/100`);
  }
  if (!rows.length) return '';
  return `## Health\n${rows.join('\n')}`;
}

/**
 * Stage 1: Render endpoint content using template literals only.
 * @param {Object} args
 * @returns {string}
 */
function renderEndpointMarkdown({
  endpoint,
  manifest,
  serviceName,
  serviceSlug,
  semanticId,
  health
}) {
  const method = endpoint.method || 'GET';
  const pathName = endpoint.path || '/';
  const summary = endpoint.summary || `${method} ${pathName}`;
  const description = endpoint.description || 'No description provided.';
  const tags = Array.from(
    new Set([
      ...((manifest?.metadata?.tags || [])),
      ...((manifest?.capabilities?.domains || []))
    ].filter(Boolean))
  );

  const metadataLines = [
    `- **Service:** ${serviceName}`,
    manifest?.service?.version ? `- **Version:** ${manifest.service.version}` : null,
    `- **Method:** \`${method}\``,
    `- **Path:** \`${pathName}\``,
    `- **Authentication:** ${formatAuthenticationSummary(manifest?.interface?.authentication)}`,
    tags.length ? `- **Tags:** ${tags.join(', ')}` : null
  ].filter(Boolean);

  const sections = [
    '## Summary',
    summary,
    '',
    '## Description',
    description,
    '',
    '## Endpoint Metadata',
    metadataLines.join('\n'),
    ''
  ];

  const healthSection = buildHealthSection(health);
  if (healthSection) {
    sections.push(healthSection, '');
  }

  sections.push(
    '## Parameters',
    formatParametersTable(endpoint.params),
    '',
    '## Request',
    formatRequestBodySection(endpoint.request),
    '',
    '## Responses',
    formatResponsesTable(endpoint.responses),
    '',
    '## Errors',
    formatErrorsList(endpoint.errors),
    '',
    '## Pagination',
    formatPaginationDetails(endpoint.pagination),
    '',
    '## Long-running Operations',
    formatLongRunningDetails(endpoint.long_running)
  );

  const generatedContent = sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const directive = wrapGeneratedSection(generatedContent, {
    id: semanticId,
    attributes: {
      'data-service': serviceSlug,
      'data-method': method,
      'data-path': pathName
    }
  });

  return `# ${method} ${pathName}\n\n${directive}`.trimEnd() + '\n';
}

function buildEndpointFrontmatter({
  endpoint,
  manifest,
  serviceSlug,
  semanticId,
  health
}) {
  const method = endpoint.method || 'GET';
  const pathName = endpoint.path || '/';
  const endpointSlug = createSlug(
    endpoint.summary || `${method}-${pathName.replace(/[\/{}]/g, '-')}`,
    semanticId
  );
  const tags = Array.from(
    new Set([
      ...((manifest?.metadata?.tags || [])),
      ...((manifest?.capabilities?.domains || []))
    ].filter(Boolean))
  );
  const coveragePercent = Math.round((health.coverage.coveragePercentage || 0) * 100);

  return {
    title: endpoint.summary || `${method} ${pathName}`,
    slug: `/api/${serviceSlug}/${endpointSlug}`,
    service: manifest?.service?.name || serviceSlug,
    serviceVersion: manifest?.service?.version,
    operationId: endpoint.operationId || endpoint.operation_id || semanticId,
    method,
    path: pathName,
    tags,
    healthScore: health.combined.healthScore,
    freshnessScore: health.freshness.healthScore,
    coveragePercentage: Number.isFinite(coveragePercent) ? coveragePercent : 0,
    severity: health.freshness.severity,
    semanticId,
    generatedAt: new Date().toISOString()
  };
}

async function transformMarkdown(markdown, frontmatter) {
  const stack = await loadRemarkStack();
  const processor = stack
    .unified()
    .use(stack.remarkParse)
    .use(stack.remarkDirective)
    .use(stack.remarkFrontmatter, ['yaml'])
    .use(createFrontmatterPlugin(frontmatter))
    .use(stack.remarkStringify, {
      fences: true,
      bullet: '-',
      rule: '-'
    });

  const file = await processor.process(markdown);
  file.data = file.data || {};
  file.data.frontmatter = frontmatter;
  return file;
}

function benchmarkStageOne(endpoints, render) {
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    return {
      sampleSize: 0,
      durationMs: 0,
      perDocMs: 0,
      targetMs: 200,
      metTarget: true
    };
  }

  const targetIterations = 100;
  const sampleSize = endpoints.length >= targetIterations ? targetIterations : targetIterations;
  const start = performance.now();
  for (let i = 0; i < sampleSize; i++) {
    const ep = endpoints[i % endpoints.length];
    render(ep);
  }
  const durationMs = performance.now() - start;

  return {
    sampleSize,
    durationMs: Number(durationMs.toFixed(2)),
    perDocMs: Number((durationMs / sampleSize).toFixed(4)),
    targetMs: 200,
    metTarget: durationMs <= 200
  };
}

/**
 * Generate API reference documents for every endpoint in the manifest.
 * @param {Object} manifest
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function generateAPIReferences(manifest, options = {}) {
  const endpoints = manifest?.interface?.endpoints;
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    throw new Error('API manifest must include interface.endpoints');
  }

  const serviceName = manifest?.service?.name || 'api-service';
  const serviceSlug = createSlug(serviceName);

  const coverage = analyzeCoverage(manifest, 'api');
  const freshness = analyzeFreshness(manifest);
  const combined = calculateCombinedHealthScore(freshness, coverage);
  const health = { coverage, freshness, combined };

  const documents = [];

  for (const endpoint of endpoints) {
    const semanticId = createSemanticId(endpoint, serviceSlug);
    const markdown = renderEndpointMarkdown({
      endpoint,
      manifest,
      serviceName,
      serviceSlug,
      semanticId,
      health
    });

    const frontmatter = buildEndpointFrontmatter({
      endpoint,
      manifest,
      serviceSlug,
      semanticId,
      health
    });

    const file = await transformMarkdown(markdown, frontmatter);
    const fileKey = frontmatter.slug.replace(/^\/+/, '').replace(/\//g, '-');
    const fileName = `${createSlug(fileKey, semanticId)}.md`;

    documents.push({
      semanticId,
      slug: frontmatter.slug,
      fileName,
      frontmatter,
      vfile: file,
      content: String(file)
    });
  }

  const performanceStats = benchmarkStageOne(endpoints, endpoint =>
    renderEndpointMarkdown({
      endpoint,
      manifest,
      serviceName,
      serviceSlug,
      semanticId: createSemanticId(endpoint, serviceSlug),
      health
    })
  );

  return {
    service: serviceName,
    serviceSlug,
    endpoints: documents,
    freshness,
    coverage,
    combined,
    performance: performanceStats,
    options
  };
}

module.exports = {
  generateAPIReferences,
  renderEndpointMarkdown,
  buildEndpointFrontmatter
};
