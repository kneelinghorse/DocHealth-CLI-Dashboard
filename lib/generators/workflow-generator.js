/**
 * Workflow diagram generator (Stage 1 + Stage 2 pipeline).
 */

const { performance } = require('node:perf_hooks');
const { validateWorkflowDag } = require('./dag-validator');
const {
  createSlug,
  wrapGeneratedSection,
  escapeMermaidLabel
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

function determineStepClass(type = '') {
  const normalized = String(type).toLowerCase();
  if (normalized === 'human') return 'humanNode';
  if (normalized === 'event') return 'eventNode';
  if (normalized === 'decision' || normalized === 'gateway') return 'decisionNode';
  if (normalized === 'start' || normalized === 'entry') return 'startNode';
  if (normalized === 'end' || normalized === 'terminal') return 'endNode';
  return 'processNode';
}

function buildClassDefinitions() {
  return [
    'classDef startNode fill:#0f62fe,stroke:#0f62fe,color:#fff;font-weight:bold;',
    'classDef processNode fill:#08BDBA,stroke:#046c63,color:#fff;',
    'classDef humanNode fill:#f6c945,stroke:#b38b00,color:#1b1b1b;',
    'classDef decisionNode fill:#ffa8a8,stroke:#d15454,color:#1b1b1b;',
    'classDef eventNode fill:#a66bff,stroke:#5f249f,color:#fff;',
    'classDef endNode fill:#555,stroke:#222,color:#fff;',
    'classDef defaultNode fill:#dcdcdc,stroke:#666,color:#1b1b1b;'
  ];
}

function createStepLabel(step) {
  const title = step.name || step.id || 'step';
  const subtitle = step.description || step.service || step.event_type || '';
  const suffix = step.type ? `[${step.type}]` : '';
  const joined = [title, subtitle, suffix].filter(Boolean).join('\\n');
  return escapeMermaidLabel(joined);
}

function groupStepsByPhase(steps = []) {
  const groups = new Map();
  steps.forEach(step => {
    const phase = step.phase || step.metadata?.phase || 'Unassigned';
    if (!groups.has(phase)) groups.set(phase, []);
    groups.get(phase).push(step.id);
  });
  return groups;
}

function buildMermaidDiagram({ steps, validation }) {
  if (validation.hasCycle) {
    return {
      type: 'error',
      content: [
        ':::danger Cycle detected',
        `Workflow contains a cycle involving: ${validation.cycleNodes.join(', ')}`,
        ':::' 
      ].join('\n')
    };
  }

  if (validation.missingDependencies.length) {
    const details = validation.missingDependencies
      .map(item => `- ${item.stepId} depends on missing step '${item.dependency}'`)
      .join('\n');
    return {
      type: 'error',
      content: [
        ':::danger Invalid workflow',
        'The following dependencies reference unknown steps:',
        details,
        ':::'
      ].join('\n')
    };
  }

  const configBlock = `%%{init: {"layout": "elk", "elk": {"nodePlacementStrategy": "NETWORK_SIMPLEX", "mergeEdges": true}}}%%`;
  const lines = ['```mermaid', configBlock, 'graph TD'];
  lines.push(...buildClassDefinitions());

  steps.forEach(step => {
    const label = createStepLabel(step);
    const className = determineStepClass(step.type);
    lines.push(`  ${step.id}["${label}"]:::${className}`);
  });

  const groups = groupStepsByPhase(steps);
  let index = 0;
  groups.forEach((stepIds, phaseName) => {
    const slug = `phase_${index++}`;
    const label = escapeMermaidLabel(phaseName);
    lines.push(`  subgraph ${slug}["${label}"]`);
    stepIds.forEach(id => lines.push(`    ${id}`));
    lines.push('  end');
  });

  steps.forEach(step => {
    (Array.isArray(step.dependencies) ? step.dependencies : []).forEach(dep => {
      if (!dep) return;
      lines.push(`  ${dep} --> ${step.id}`);
    });
  });

  lines.push('```');
  return {
    type: 'diagram',
    content: lines.join('\n')
  };
}

function buildWorkflowSections({ manifest, diagram, semanticIds, validation }) {
  const workflow = manifest.workflow || {};
  const metadata = manifest.metadata || {};
  const sla = manifest.sla || {};

  const overviewLines = [
    workflow.description || 'No description provided.',
    '',
    workflow.purpose ? `- **Purpose:** ${workflow.purpose}` : null,
    workflow.version ? `- **Version:** ${workflow.version}` : null,
    sla.timeout ? `- **SLA Timeout:** ${sla.timeout}` : null,
    metadata.owner ? `- **Owner:** ${metadata.owner}` : null,
    metadata.tags?.length ? `- **Tags:** ${metadata.tags.join(', ')}` : null,
    metadata.criticality ? `- **Criticality:** ${metadata.criticality}` : null
  ].filter(Boolean);

  const sections = [
    `## Overview {#${semanticIds.overview}}`,
    overviewLines.join('\n'),
    '',
    `## Diagram {#${semanticIds.diagram}}`,
    diagram.content,
    ''
  ];

  if (!diagram || diagram.type === 'error') {
    sections.push(
      `:::note Validation state`,
      validation.hasCycle
        ? 'Cycle detection failed; resolve cycles before rendering.'
        : 'Resolve missing dependencies and re-run the generator.',
      ':::'
    );
  }

  if (manifest.monitoring?.metrics?.length) {
    const metrics = manifest.monitoring.metrics
      .map(metric => `- **${metric.name}:** ${metric.description || metric.type || ''}`)
      .join('\n');
    sections.push(
      `## Monitoring {#${semanticIds.monitoring}}`,
      metrics,
      ''
    );
  }

  if (manifest.compensation && Object.keys(manifest.compensation).length) {
    const compensationLines = Object.entries(manifest.compensation).map(
      ([key, step]) => `- **${key}:** ${step.description || step.service || ''}`
    );
    sections.push(
      `## Compensation {#${semanticIds.compensation}}`,
      compensationLines.join('\n'),
      ''
    );
  }

  return sections.join('\n').trim();
}

function renderWorkflowMarkdown({ manifest, semanticIds, validation }) {
  const diagram = buildMermaidDiagram({
    steps: manifest.steps || [],
    validation
  });

  const sections = buildWorkflowSections({
    manifest,
    diagram,
    semanticIds,
    validation
  });

  const workflow = manifest.workflow || {};
  const generatedContent = wrapGeneratedSection(sections, {
    id: semanticIds.base,
    attributes: {
      'data-workflow': workflow.id || semanticIds.slug,
      'data-steps': Array.isArray(manifest.steps) ? manifest.steps.length : 0,
      'data-has-cycle': validation.hasCycle
    }
  });

  return `# Workflow: ${workflow.name || workflow.id || 'workflow'}\n\n${generatedContent}`.trimEnd() + '\n';
}

function buildWorkflowFrontmatter({ manifest, semanticIds }) {
  const workflow = manifest.workflow || {};
  const metadata = manifest.metadata || {};

  return {
    title: workflow.name || workflow.id || 'Workflow',
    slug: `/workflows/${semanticIds.slug}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    version: workflow.version,
    owner: metadata.owner,
    tags: metadata.tags || [],
    semanticId: semanticIds.base,
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

function benchmarkStageOne(render) {
  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    render();
  }
  const durationMs = performance.now() - start;
  return {
    sampleSize: iterations,
    durationMs: Number(durationMs.toFixed(2)),
    perDocMs: Number((durationMs / iterations).toFixed(4)),
    targetMs: 100,
    metTarget: durationMs <= 100
  };
}

async function generateWorkflowDocs(manifest, options = {}) {
  if (!manifest?.workflow?.id && !manifest?.workflow?.name) {
    throw new Error('Workflow manifest must include workflow.id or workflow.name');
  }

  const workflowId = manifest.workflow.id || manifest.workflow.name;
  const workflowSlug = createSlug(workflowId);
  const semanticIds = {
    base: `workflow-${workflowSlug}`,
    overview: `workflow-${workflowSlug}-overview`,
    diagram: `workflow-${workflowSlug}-diagram`,
    monitoring: `workflow-${workflowSlug}-monitoring`,
    compensation: `workflow-${workflowSlug}-compensation`,
    slug: workflowSlug
  };

  const validation = validateWorkflowDag(manifest.steps || []);
  const markdown = renderWorkflowMarkdown({ manifest, semanticIds, validation });
  const frontmatter = buildWorkflowFrontmatter({ manifest, semanticIds });
  const vfile = await transformMarkdown(markdown, frontmatter);
  const fileName = `${workflowSlug || 'workflow'}.md`;

  const performanceStats = benchmarkStageOne(() =>
    renderWorkflowMarkdown({ manifest, semanticIds, validation })
  );

  return {
    workflow: manifest.workflow.name || manifest.workflow.id,
    workflowSlug,
    document: {
      semanticId: semanticIds.base,
      slug: frontmatter.slug,
      fileName,
      frontmatter,
      vfile,
      content: String(vfile)
    },
    validation,
    performance: performanceStats,
    options
  };
}

module.exports = {
  generateWorkflowDocs,
  renderWorkflowMarkdown,
  buildWorkflowFrontmatter
};
