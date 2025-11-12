/**
 * Generator Pipeline
 * ------------------
 * Loads protocol manifests, runs the appropriate generator (API/Data/Workflow),
 * and writes Markdown outputs with optional merge protection using the AST
 * merge utilities. File writes happen in bounded concurrent batches (default 200)
 * to satisfy the R3.1 performance guidance.
 */

const fs = require('fs').promises;
const path = require('path');

const { loadProtocols } = require('./loader');
const { generateAPIReferences } = require('./generators/api-generator');
const { generateDataCatalogDocs } = require('./generators/data-generator');
const { generateWorkflowDocs } = require('./generators/workflow-generator');
const { mergeDocuments } = require('./merge/ast-merger');
const {
  readBase,
  writeBase
} = require('./merge/base-storage');
const {
  saveConflictRecord,
  clearConflictRecord
} = require('./merge/conflict-detector');

const DEFAULT_TYPES = ['api', 'data', 'workflow'];
const DEFAULT_CONCURRENCY = 200;

const GENERATOR_DEFINITIONS = {
  api: {
    label: 'API',
    async collect(protocolEntry, context) {
      const manifest = protocolEntry.protocol.manifest();
      const generation = await generateAPIReferences(manifest, context.generatorOptions);
      const documents = generation.endpoints.map(doc => ({
        type: 'api',
        displayName: `${generation.service} → ${doc.fileName}`,
        relativePath: path.join(generation.serviceSlug || 'api', doc.fileName),
        content: doc.content,
        meta: {
          service: generation.service,
          serviceSlug: generation.serviceSlug,
          fileName: doc.fileName,
          performance: generation.performance
        }
      }));

      return {
        documents,
        summary: {
          name: generation.service,
          files: generation.endpoints.length,
          outputDir: path.join(context.outputDir, generation.serviceSlug || 'api'),
          performance: generation.performance
        }
      };
    }
  },
  data: {
    label: 'Data',
    async collect(protocolEntry, context) {
      const manifest = protocolEntry.protocol.manifest();
      const generation = await generateDataCatalogDocs(manifest, context.generatorOptions);
      const { document } = generation;
      const documents = [
        {
          type: 'data',
          displayName: `${generation.dataset} dataset`,
          relativePath: path.join('data', document.fileName),
          content: document.content,
          meta: {
            dataset: generation.dataset,
            fileName: document.fileName,
            performance: generation.performance
          }
        }
      ];

      return {
        documents,
        summary: {
          name: generation.dataset,
          files: documents.length,
          outputDir: path.join(context.outputDir, 'data'),
          performance: generation.performance
        }
      };
    }
  },
  workflow: {
    label: 'Workflow',
    async collect(protocolEntry, context) {
      const manifest = protocolEntry.protocol.manifest();
      const generation = await generateWorkflowDocs(manifest, context.generatorOptions);
      const { document } = generation;
      const documents = [
        {
          type: 'workflow',
          displayName: `${generation.workflow} workflow`,
          relativePath: path.join('workflows', document.fileName),
          content: document.content,
          meta: {
            workflow: generation.workflow,
            fileName: document.fileName,
            performance: generation.performance,
            validation: generation.validation
          }
        }
      ];

      return {
        documents,
        summary: {
          name: generation.workflow,
          files: documents.length,
          outputDir: path.join(context.outputDir, 'workflows'),
          performance: generation.performance
        }
      };
    }
  }
};

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function processWithConcurrency(items, limit, handler) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  const workerCount = Math.max(1, Math.min(limit || DEFAULT_CONCURRENCY, items.length));
  let nextIndex = 0;

  async function worker() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= items.length) break;
      results[currentIndex] = await handler(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

async function writeDocument(descriptor, options) {
  const absolutePath = path.join(options.outputDir, descriptor.relativePath);
  const directory = path.dirname(absolutePath);
  await fs.mkdir(directory, { recursive: true });
  const exists = await pathExists(absolutePath);

  if (!exists) {
    await fs.writeFile(absolutePath, descriptor.content, 'utf8');
    if (options.merge.enabled) {
      await writeBase(absolutePath, descriptor.content, options.merge);
      await clearConflictRecord(absolutePath, options.merge);
    }
    return { action: 'created', conflicts: 0, targetPath: absolutePath };
  }

  if (!options.merge.enabled) {
    await fs.writeFile(absolutePath, descriptor.content, 'utf8');
    return { action: 'overwritten', conflicts: 0, targetPath: absolutePath };
  }

  const localContent = await fs.readFile(absolutePath, 'utf8');
  const baseSnapshot = await readBase(absolutePath, options.merge);
  let baseContent = baseSnapshot;
  let baseFromSnapshot = true;

  if (baseContent == null) {
    baseContent = localContent;
    baseFromSnapshot = false;
  }

  const mergeResult = await mergeDocuments({
    baseContent,
    localContent,
    remoteContent: descriptor.content,
    humanReferenceContent: baseFromSnapshot ? baseContent : descriptor.content,
    filePath: absolutePath
  });

  await fs.writeFile(absolutePath, mergeResult.mergedContent, 'utf8');

  if (mergeResult.conflicts.length > 0) {
    const conflictRecord = {
      file: path.relative(options.merge.root, absolutePath),
      createdAt: new Date().toISOString(),
      baseContent,
      remoteContent: descriptor.content,
      conflicts: mergeResult.conflicts
    };
    await saveConflictRecord(absolutePath, conflictRecord, options.merge);
    return {
      action: 'merged',
      conflicts: mergeResult.conflicts.length,
      hasConflicts: true,
      targetPath: absolutePath
    };
  }

  await writeBase(absolutePath, descriptor.content, options.merge);
  await clearConflictRecord(absolutePath, options.merge);

  return {
    action: 'merged',
    conflicts: 0,
    hasConflicts: false,
    targetPath: absolutePath
  };
}

function createEmptySummary(type) {
  const definition = GENERATOR_DEFINITIONS[type];
  return {
    type,
    label: definition?.label || type,
    protocolsProcessed: 0,
    documentsPlanned: 0,
    documentsWritten: 0,
    created: 0,
    merged: 0,
    overwritten: 0,
    conflicts: 0,
    documents: [],
    protocolSummaries: [],
    outputDirs: new Set()
  };
}

function mapRequestedTypes(types) {
  if (!types || !types.length) return DEFAULT_TYPES;
  return types
    .map(value => String(value || '').toLowerCase())
    .map(value => (value === 'workflows' ? 'workflow' : value))
    .filter(value => DEFAULT_TYPES.includes(value));
}

async function runGeneratorPipeline(options = {}) {
  const {
    types = DEFAULT_TYPES,
    protocolsPath = './src',
    outputDir = './docs',
    format = 'markdown',
    merge = true,
    concurrency = DEFAULT_CONCURRENCY,
    mergeRoot = process.cwd(),
    stateDir = null
  } = options;

  const resolvedOutput = path.resolve(outputDir);
  const resolvedProtocolsPath = path.resolve(protocolsPath);
  await fs.mkdir(resolvedOutput, { recursive: true });

  const loadResults = await loadProtocols(resolvedProtocolsPath);
  const mergeOptions = {
    enabled: Boolean(merge),
    root: mergeRoot ? path.resolve(mergeRoot) : process.cwd(),
    ...(stateDir ? { stateDir: path.resolve(stateDir) } : {})
  };

  const requestedTypes = mapRequestedTypes(types);
  const summaries = {};

  for (const type of requestedTypes) {
    const definition = GENERATOR_DEFINITIONS[type];
    const summary = createEmptySummary(type);
    summaries[type] = summary;

    if (!definition) {
      continue;
    }

    const protocolEntries = loadResults.protocols.filter(entry => entry.type === type);
    if (!protocolEntries.length) {
      continue;
    }

    const context = {
      outputDir: resolvedOutput,
      generatorOptions: { format }
    };

    const descriptors = [];

    for (const entry of protocolEntries) {
      const result = await definition.collect(entry, context);
      summary.protocolSummaries.push(result.summary);
      if (result.summary?.outputDir) {
        summary.outputDirs.add(result.summary.outputDir);
      }
      descriptors.push(...result.documents);
      summary.protocolsProcessed += 1;
    }

    summary.documentsPlanned = descriptors.length;

    if (!descriptors.length) {
      continue;
    }

    const writeResults = await processWithConcurrency(
      descriptors,
      concurrency,
      descriptor => writeDocument(descriptor, { outputDir: resolvedOutput, merge: mergeOptions })
    );

    summary.documents = descriptors.map((descriptor, index) => ({
      relativePath: descriptor.relativePath,
      type: descriptor.type,
      displayName: descriptor.displayName,
      meta: descriptor.meta,
      action: writeResults[index]?.action || 'skipped',
      conflicts: writeResults[index]?.conflicts || 0
    }));

    summary.documentsWritten = writeResults.length;
    summary.created = writeResults.filter(r => r?.action === 'created').length;
    summary.merged = writeResults.filter(r => r?.action === 'merged').length;
    summary.overwritten = writeResults.filter(r => r?.action === 'overwritten').length;
    summary.conflicts = writeResults.reduce((acc, r) => acc + (r?.conflicts || 0), 0);
    summary.outputDirs = Array.from(summary.outputDirs);
  }

  return {
    outputDir: resolvedOutput,
    loadResults,
    summaries: Object.fromEntries(
      Object.entries(summaries).map(([type, summary]) => {
        if (summary.outputDirs instanceof Set) {
          summary.outputDirs = Array.from(summary.outputDirs);
        }
        return [type, summary];
      })
    ),
    merge: mergeOptions.enabled
  };
}

module.exports = {
  runGeneratorPipeline
};
