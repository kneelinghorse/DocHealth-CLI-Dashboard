/**
 * Data catalog generator (Stage 1 + Stage 2 pipeline).
 */

const { performance } = require('node:perf_hooks');
const {
  analyzeFreshness,
  analyzeCoverage,
  calculateCombinedHealthScore
} = require('../analyzer');
const {
  createSlug,
  wrapGeneratedSection,
  formatDataFieldsTable,
  formatLineageList,
  formatCatalogMetadata,
  formatGovernanceSummary
} = require('./helpers');
const { createFrontmatterPlugin } = require('./frontmatter-plugin');

const NO_DATA = '_No data available_';
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

function buildHealthSection(health = {}, semanticId) {
  if (!health) return '';

  const rows = [];
  if (health.freshness) {
    rows.push(`- **Freshness:** ${health.freshness.healthScore ?? 'n/a'}/100 (${health.freshness.severity || 'unknown'})`);
  }
  if (health.coverage) {
    const coveragePercent = Math.round((health.coverage.coveragePercentage || 0) * 100);
    if (Number.isFinite(coveragePercent)) {
      rows.push(
        `- **Coverage:** ${coveragePercent}% (${health.coverage.documentedFields || health.coverage.documentedItems || 0}/${health.coverage.totalFields || health.coverage.totalItems || 0})`
      );
    }
  }
  if (health.combined) {
    rows.push(`- **Overall Health:** ${health.combined.healthScore ?? 'n/a'}/100`);
  }
  if (!rows.length) return '';
  const sectionId = semanticId ? ` {#${semanticId}}` : '';
  return `## Health${sectionId}\n${rows.join('\n')}`;
}

function createSemanticIds(datasetSlug) {
  const base = `dataset-${datasetSlug}`;
  return {
    base,
    overview: `${base}-overview`,
    schema: `${base}-schema`,
    keys: `${base}-keys`,
    lineage: `${base}-lineage`,
    catalog: `${base}-catalog`,
    governance: `${base}-governance`,
    quality: `${base}-quality`,
    health: `${base}-health`,
    operations: `${base}-operations`
  };
}

function formatKeyDetails(schema = {}) {
  const lines = [];
  const primary = schema.primary_key;
  if (primary) {
    const pk = Array.isArray(primary) ? primary.join(', ') : primary;
    lines.push(`- **Primary Key:** ${pk}`);
  }

  const uniqueKeys = schema.keys?.unique;
  if (Array.isArray(uniqueKeys) && uniqueKeys.length) {
    lines.push(`- **Unique Constraints:** ${uniqueKeys.join(', ')}`);
  }

  const foreignKeys = schema.keys?.foreign_keys;
  if (Array.isArray(foreignKeys) && foreignKeys.length) {
    const mapped = foreignKeys
      .map(fk => `    - \`${fk.field}\` → ${fk.ref || 'unknown target'}`)
      .join('\n');
    lines.push('- **Foreign Keys:**', mapped);
  }

  const partition = schema.keys?.partition;
  if (partition?.field) {
    lines.push(`- **Partitioning:** ${partition.field} (${partition.type || 'unspecified'})`);
  }

  return lines.length ? lines.join('\n') : NO_DATA;
}

function formatOperationsSummary(operations = {}) {
  if (!operations || typeof operations !== 'object') return NO_DATA;
  const refresh = operations.refresh || {};
  const lines = [
    refresh.schedule ? `- **Refresh Schedule:** ${refresh.schedule}${refresh.expected_by ? ` (expected by ${refresh.expected_by})` : ''}` : null,
    operations.retention ? `- **Retention:** ${operations.retention}` : null,
    refresh.latency_sla ? `- **Latency SLA:** ${refresh.latency_sla}` : null,
    operations.backfill?.enabled
      ? `- **Backfill:** Enabled (max lookback ${operations.backfill.max_lookback_days || '?'} days)`
      : null
  ].filter(Boolean);

  return lines.length ? lines.join('\n') : NO_DATA;
}

function formatQualityMetrics(quality = {}) {
  if (!quality || typeof quality !== 'object') return NO_DATA;
  const lines = [
    quality.freshness_ts ? `- **Last Refresh:** ${quality.freshness_ts}` : null,
    quality.row_count_estimate ? `- **Row Count (est.):** ${quality.row_count_estimate.toLocaleString?.() || quality.row_count_estimate}` : null,
    quality.completeness_score !== undefined
      ? `- **Completeness:** ${(quality.completeness_score * 100).toFixed(1)}%`
      : null,
    quality.accuracy_score !== undefined
      ? `- **Accuracy:** ${(quality.accuracy_score * 100).toFixed(1)}%`
      : null
  ].filter(Boolean);

  const nullRates = quality.null_rate && Object.entries(quality.null_rate);
  if (nullRates && nullRates.length) {
    const highlights = nullRates
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, rate]) => `${field} ${(rate * 100).toFixed(0)}%`)
      .join(', ');
    lines.push(`- **Highest Null Rates:** ${highlights}`);
  }

  if (Array.isArray(quality.consistency_checks) && quality.consistency_checks.length) {
    const checks = quality.consistency_checks
      .map(check => `    - ${check.name || 'check'} (${Math.round((check.pass_rate || 0) * 100)}% pass)`)
      .join('\n');
    lines.push('- **Consistency Checks:**', checks);
  }

  return lines.length ? lines.join('\n') : NO_DATA;
}

function renderDatasetMarkdown({ manifest, datasetSlug, semanticIds, health }) {
  const dataset = manifest?.dataset || {};
  const schema = manifest?.schema || {};
  const catalog = manifest?.catalog || {};
  const lineage = manifest?.lineage || {};
  const operations = manifest?.operations || {};
  const quality = manifest?.quality || {};
  const fields = schema.fields || {};
  const piiFieldCount = Object.values(fields).filter(field => field?.pii === true).length;

  const overviewBullets = [
    dataset.type ? `- **Type:** ${dataset.type}` : null,
    dataset.lifecycle?.status ? `- **Status:** ${dataset.lifecycle.status}` : null,
    dataset.lifecycle?.created_at ? `- **Created:** ${dataset.lifecycle.created_at}` : null,
    operations.refresh?.schedule
      ? `- **Refresh:** ${operations.refresh.schedule}${operations.refresh.expected_by ? ` (expected by ${operations.refresh.expected_by})` : ''}`
      : null,
    operations.retention ? `- **Retention:** ${operations.retention}` : null,
    catalog.criticality ? `- **Criticality:** ${catalog.criticality}` : null,
    `- **PII Fields:** ${piiFieldCount > 0 ? `${piiFieldCount} 🔐` : 'None detected'}`
  ].filter(Boolean);

  const sections = [
    `## Overview {#${semanticIds.overview}}`,
    dataset.description || 'No description provided.',
    '',
    overviewBullets.length ? overviewBullets.join('\n') : NO_DATA,
    ''
  ];

  const healthSection = buildHealthSection(health, semanticIds.health);
  if (healthSection) {
    sections.push(healthSection, '');
  }

  sections.push(
    `## Schema {#${semanticIds.schema}}`,
    formatDataFieldsTable(fields),
    '',
    `## Keys {#${semanticIds.keys}}`,
    formatKeyDetails(schema),
    '',
    `## Lineage {#${semanticIds.lineage}}`,
    '### Sources',
    formatLineageList(lineage.sources || []),
    '',
    '### Consumers',
    formatLineageList(lineage.consumers || []),
    ''
  );

  if (Array.isArray(lineage.transformations) && lineage.transformations.length) {
    sections.push(
      '### Transformations',
      formatLineageList(lineage.transformations),
      ''
    );
  }

  sections.push(
    `## Catalog {#${semanticIds.catalog}}`,
    formatCatalogMetadata(catalog, dataset),
    '',
    `## Governance {#${semanticIds.governance}}`,
    formatGovernanceSummary(manifest.governance),
    '',
    `## Operations {#${semanticIds.operations}}`,
    formatOperationsSummary(operations),
    '',
    `## Data Quality {#${semanticIds.quality}}`,
    formatQualityMetrics(quality)
  );

  const generatedContent = sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const directive = wrapGeneratedSection(generatedContent, {
    id: semanticIds.base,
    attributes: {
      'data-dataset': datasetSlug,
      'data-type': dataset.type || 'unknown',
      'data-pii': piiFieldCount > 0 ? 'true' : 'false'
    }
  });

  return `# Dataset: ${dataset.name || datasetSlug}\n\n${directive}`.trimEnd() + '\n';
}

function buildDatasetFrontmatter({ manifest, datasetSlug, semanticIds, health }) {
  const dataset = manifest?.dataset || {};
  const catalog = manifest?.catalog || {};
  const fields = manifest?.schema?.fields || {};
  const piiFieldCount = Object.values(fields).filter(field => field?.pii === true).length;
  const coveragePercent = Math.round((health.coverage.coveragePercentage || 0) * 100);

  return {
    title: dataset.name || datasetSlug,
    slug: `/data/${datasetSlug}`,
    dataset: dataset.name || datasetSlug,
    datasetType: dataset.type || 'unknown',
    owner: catalog.owner,
    tags: catalog.tags || [],
    healthScore: health.combined.healthScore,
    freshnessScore: health.freshness.healthScore,
    coveragePercentage: Number.isFinite(coveragePercent) ? coveragePercent : 0,
    severity: health.freshness.severity,
    semanticId: semanticIds.base,
    piiFieldCount,
    rowCountEstimate: manifest?.quality?.row_count_estimate,
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

function benchmarkStageOne(renderStageOne) {
  const targetIterations = 100;
  const start = performance.now();
  for (let i = 0; i < targetIterations; i++) {
    renderStageOne();
  }
  const durationMs = performance.now() - start;
  return {
    sampleSize: targetIterations,
    durationMs: Number(durationMs.toFixed(2)),
    perDocMs: Number((durationMs / targetIterations).toFixed(4)),
    targetMs: 200,
    metTarget: durationMs <= 200
  };
}

async function generateDataCatalogDocs(manifest, options = {}) {
  if (!manifest?.dataset?.name) {
    throw new Error('Data manifest must include dataset.name');
  }

  const datasetSlug = createSlug(manifest.dataset.name);
  const semanticIds = createSemanticIds(datasetSlug);

  const coverage = analyzeCoverage(manifest, 'data');
  const freshness = analyzeFreshness(manifest);
  const combined = calculateCombinedHealthScore(freshness, coverage);
  const health = { coverage, freshness, combined };

  const markdown = renderDatasetMarkdown({
    manifest,
    datasetSlug,
    semanticIds,
    health
  });

  const frontmatter = buildDatasetFrontmatter({
    manifest,
    datasetSlug,
    semanticIds,
    health
  });

  const file = await transformMarkdown(markdown, frontmatter);
  const fileName = `${datasetSlug || 'dataset'}.md`;

  const performanceStats = benchmarkStageOne(() =>
    renderDatasetMarkdown({
      manifest,
      datasetSlug,
      semanticIds,
      health
    })
  );

  return {
    dataset: manifest.dataset.name,
    datasetSlug,
    document: {
      semanticId: semanticIds.base,
      slug: frontmatter.slug,
      fileName,
      frontmatter,
      vfile: file,
      content: String(file)
    },
    freshness,
    coverage,
    combined,
    performance: performanceStats,
    options
  };
}

module.exports = {
  generateDataCatalogDocs,
  renderDatasetMarkdown,
  buildDatasetFrontmatter
};
