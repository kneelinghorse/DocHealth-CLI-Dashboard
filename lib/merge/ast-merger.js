const path = require('path');
const { CONFLICT_TYPES, detectSectionConflict } = require('./conflict-detector');

let remarkStackPromise = null;

async function loadRemarkStack() {
  if (!remarkStackPromise) {
    remarkStackPromise = (async () => {
      const [
        { unified },
        remarkParseModule,
        remarkStringifyModule,
        remarkDirectiveModule,
        remarkFrontmatterModule
      ] =
        await Promise.all([
          import('unified'),
          import('remark-parse'),
          import('remark-stringify'),
          import('remark-directive'),
          import('remark-frontmatter')
        ]);

      return {
        unified,
        remarkParse: remarkParseModule.default || remarkParseModule,
        remarkStringify: remarkStringifyModule.default || remarkStringifyModule,
        remarkDirective: remarkDirectiveModule.default || remarkDirectiveModule,
        remarkFrontmatter: remarkFrontmatterModule.default || remarkFrontmatterModule
      };
    })();
  }
  return remarkStackPromise;
}

async function createProcessors() {
  const stack = await loadRemarkStack();
  const parser = stack.unified().use(stack.remarkParse).use(stack.remarkDirective).use(stack.remarkFrontmatter, ['yaml']);
  const stringifier = stack
    .unified()
    .use(stack.remarkDirective)
    .use(stack.remarkFrontmatter, ['yaml'])
    .use(stack.remarkStringify, {
      fences: true,
      bullet: '-',
      rule: '-'
    });
  return { parser, stringifier };
}

function cloneNode(node) {
  return node ? JSON.parse(JSON.stringify(node)) : null;
}

function normalizeNodeForDiff(node) {
  if (node == null) return node;
  if (Array.isArray(node)) {
    return node.map(normalizeNodeForDiff);
  }
  if (typeof node !== 'object') {
    return node;
  }
  const copy = { ...node };
  delete copy.position;
  if (copy.children) {
    copy.children = copy.children.map(normalizeNodeForDiff);
  }
  if (copy.data) {
    copy.data = normalizeNodeForDiff(copy.data);
  }
  return copy;
}

function nodeSignature(node) {
  return JSON.stringify(normalizeNodeForDiff(node));
}

function isGeneratedSection(node) {
  return Boolean(
    node && node.type === 'containerDirective' && node.name === 'generated-section'
  );
}

function getSectionId(node) {
  if (!isGeneratedSection(node)) return null;
  return node.attributes?.id || node.identifier || null;
}

function extractSections(tree) {
  const sections = new Map();
  if (!tree?.children) return sections;
  for (const node of tree.children) {
    if (!isGeneratedSection(node)) continue;
    const id = getSectionId(node);
    if (!id) continue;
    sections.set(id, cloneNode(node));
  }
  return sections;
}

function getSectionOrder(tree) {
  if (!tree?.children) return [];
  return tree.children
    .filter(isGeneratedSection)
    .map(node => getSectionId(node))
    .filter(Boolean);
}

function segmentGaps(tree) {
  const segments = [];
  const children = tree?.children || [];
  let buffer = [];
  let anchor = '__prelude__';

  const flush = () => {
    segments.push({ anchor, nodes: buffer });
    buffer = [];
  };

  for (const node of children) {
    if (isGeneratedSection(node)) {
      flush();
      anchor = getSectionId(node) || anchor;
      continue;
    }
    buffer.push(node);
  }

  segments.push({ anchor, nodes: buffer });
  return segments;
}

function computeSegmentDiff(baseNodes = [], localNodes = []) {
  const remainingBase = baseNodes.map(nodeSignature);
  const additions = [];

  for (const node of localNodes) {
    const signature = nodeSignature(node);
    const index = remainingBase.indexOf(signature);
    if (index >= 0) {
      remainingBase.splice(index, 1);
      continue;
    }
    additions.push(cloneNode(node));
  }
  return additions;
}

function identifyHumanContent(baseTree, localTree) {
  const baseSegments = segmentGaps(baseTree);
  const localSegments = segmentGaps(localTree);
  const baseMap = new Map(baseSegments.map(seg => [seg.anchor, seg.nodes]));
  const humanMap = new Map();

  for (const segment of localSegments) {
    const baseNodes = baseMap.get(segment.anchor) || [];
    const humanNodes = computeSegmentDiff(baseNodes, segment.nodes);
    if (humanNodes.length) {
      humanMap.set(segment.anchor, humanNodes);
    }
  }

  return humanMap;
}

function insertHumanContent(tree, humanMap) {
  if (!humanMap || humanMap.size === 0) return tree;
  const children = tree.children || [];
  const nextChildren = [];
  let preludeInserted = false;

  const emitPrelude = () => {
    if (preludeInserted) return;
    const additions = humanMap.get('__prelude__');
    if (additions?.length) {
      additions.forEach(node => nextChildren.push(cloneNode(node)));
    }
    preludeInserted = true;
  };

  for (const node of children) {
    if (isGeneratedSection(node) && !preludeInserted) {
      emitPrelude();
    }
    nextChildren.push(node);
    if (!isGeneratedSection(node)) continue;
    const id = getSectionId(node);
    const additions = humanMap.get(id);
    if (additions?.length) {
      additions.forEach(addition => nextChildren.push(cloneNode(addition)));
    }
  }

  if (!preludeInserted) {
    emitPrelude();
  }

  tree.children = nextChildren;
  return tree;
}

function stringifyNode(stringifier, node) {
  if (!node) return '';
  const tree = {
    type: 'root',
    children: [cloneNode(node)]
  };
  return stringifier.stringify(tree).trim();
}

function createDirectiveSkeleton(id, templateNode) {
  if (templateNode) {
    return cloneNode(templateNode);
  }
  return {
    type: 'containerDirective',
    name: 'generated-section',
    attributes: Object.assign({}, id ? { id } : {}),
    children: []
  };
}

async function createManualNode(parser, id, template, manualContent) {
  const manualTree = parser.parse(manualContent || '');
  const directive = createDirectiveSkeleton(id || getSectionId(template) || template?.attributes?.id, template);
  directive.children = manualTree.children;
  return directive;
}

function collectCurrentSectionIds(children = []) {
  return children.filter(isGeneratedSection).map(node => getSectionId(node)).filter(Boolean);
}

function findChildIndex(children, id) {
  return children.findIndex(node => isGeneratedSection(node) && getSectionId(node) === id);
}

function computeInsertionIndex(children, missingId, baseOrder) {
  const currentIds = collectCurrentSectionIds(children);
  const baseIdx = baseOrder.indexOf(missingId);
  if (baseIdx === -1) {
    return children.length;
  }

  for (let i = baseIdx - 1; i >= 0; i--) {
    const prevId = baseOrder[i];
    if (!currentIds.includes(prevId)) continue;
    const prevIndex = findChildIndex(children, prevId);
    if (prevIndex >= 0) {
      return prevIndex + 1;
    }
  }

  for (let i = baseIdx + 1; i < baseOrder.length; i++) {
    const nextId = baseOrder[i];
    if (!currentIds.includes(nextId)) continue;
    const nextIndex = findChildIndex(children, nextId);
    if (nextIndex >= 0) {
      return nextIndex;
    }
  }

  return children.length;
}

function normalizeResolutionMap(mapLike) {
  if (!mapLike) return new Map();
  if (mapLike instanceof Map) {
    return new Map(
      Array.from(mapLike.entries()).map(([key, value]) => [
        key,
        value && typeof value === 'object' ? value : { strategy: value }
      ])
    );
  }
  const entries = Object.entries(mapLike).map(([key, value]) => {
    if (value && typeof value === 'object') return [key, value];
    return [key, { strategy: value }];
  });
  return new Map(entries);
}

async function mergeDocuments({
  baseContent = '',
  localContent = '',
  remoteContent = '',
  humanReferenceContent = null,
  filePath = '',
  resolutionMap = null,
  autoAcceptTheirs = false
} = {}) {
  const { parser, stringifier } = await createProcessors();
  const baseTree = parser.parse(baseContent || '');
  const localTree = parser.parse(localContent || '');
  const remoteTree = parser.parse(remoteContent || '');
  let referenceTree;
  if (humanReferenceContent == null || humanReferenceContent === baseContent) {
    referenceTree = baseTree;
  } else if (humanReferenceContent === remoteContent) {
    referenceTree = remoteTree;
  } else {
    referenceTree = parser.parse(humanReferenceContent);
  }

  const baseSections = extractSections(baseTree);
  const localSections = extractSections(localTree);
  const remoteSections = extractSections(remoteTree);
  const baseOrder = getSectionOrder(baseTree);
  const humanMap = identifyHumanContent(referenceTree, localTree);
  const mergedTree = cloneNode(remoteTree);
  const resolutionLookup = normalizeResolutionMap(resolutionMap);
  const conflicts = [];

  const children = mergedTree.children || [];

  for (let idx = 0; idx < children.length; idx++) {
    const node = children[idx];
    if (!isGeneratedSection(node)) continue;
    const id = getSectionId(node);
    if (!id) continue;

    const baseNode = baseSections.get(id);
    const localNode = localSections.get(id);
    const remoteNode = remoteSections.get(id);

    const conflict = detectSectionConflict({
      id,
      hasBase: Boolean(baseNode),
      hasLocal: Boolean(localNode),
      hasRemote: Boolean(remoteNode),
      baseText: stringifyNode(stringifier, baseNode),
      localText: stringifyNode(stringifier, localNode),
      remoteText: stringifyNode(stringifier, remoteNode)
    });

    const resolution = resolutionLookup.get(id);
    const effectiveStrategy = resolution?.strategy || (autoAcceptTheirs ? 'remote' : null);

    if (conflict && !effectiveStrategy) {
      conflicts.push(conflict);
      children[idx] = cloneNode(localNode || node);
      continue;
    }

    if (conflict && effectiveStrategy === 'local') {
      children[idx] = cloneNode(localNode || node || baseNode);
      continue;
    }

    if (conflict && effectiveStrategy === 'manual') {
      const manualNode = await createManualNode(
        parser,
        id,
        localNode || remoteNode || baseNode || node,
        resolution.manualContent || ''
      );
      children[idx] = manualNode;
      continue;
    }

    // Default: keep remote (fresh generator)
    children[idx] = cloneNode(remoteNode || node || localNode || baseNode);
  }

  for (const [id, localNode] of localSections.entries()) {
    if (findChildIndex(children, id) !== -1) continue;
    const baseNode = baseSections.get(id);
    const remoteNode = remoteSections.get(id);
    const conflict = detectSectionConflict({
      id,
      hasBase: Boolean(baseNode),
      hasLocal: true,
      hasRemote: Boolean(remoteNode),
      baseText: stringifyNode(stringifier, baseNode),
      localText: stringifyNode(stringifier, localNode),
      remoteText: stringifyNode(stringifier, remoteNode)
    });
    const resolution = resolutionLookup.get(id);
    const effectiveStrategy = resolution?.strategy || (autoAcceptTheirs ? 'remote' : null);

    if (conflict && conflict.type === CONFLICT_TYPES.ORPHANED_CONTENT) {
      if (!effectiveStrategy) {
        conflicts.push(conflict);
        const insertIndex = computeInsertionIndex(children, id, baseOrder);
        children.splice(insertIndex, 0, cloneNode(localNode));
        continue;
      }
      if (effectiveStrategy === 'local') {
        const insertIndex = computeInsertionIndex(children, id, baseOrder);
        children.splice(insertIndex, 0, cloneNode(localNode));
        continue;
      }
      if (effectiveStrategy === 'manual') {
        const manualNode = await createManualNode(
          parser,
          id,
          localNode || baseNode,
          resolution.manualContent || ''
        );
        const insertIndex = computeInsertionIndex(children, id, baseOrder);
        children.splice(insertIndex, 0, manualNode);
        continue;
      }
      // effectiveStrategy === 'remote' → deletion accepted (skip insertion)
      continue;
    }

    if (!conflict) {
      const insertIndex = computeInsertionIndex(children, id, baseOrder);
      children.splice(insertIndex, 0, cloneNode(localNode));
    } else if (conflict && !effectiveStrategy) {
      conflicts.push(conflict);
      const insertIndex = computeInsertionIndex(children, id, baseOrder);
      children.splice(insertIndex, 0, cloneNode(localNode));
    }
  }

  insertHumanContent(mergedTree, humanMap);

  const mergedContent = stringifier.stringify(mergedTree).trim() + '\n';

  return {
    filePath: filePath ? path.resolve(filePath) : undefined,
    mergedContent,
    conflicts
  };
}

module.exports = {
  mergeDocuments,
  loadRemarkStack
};
