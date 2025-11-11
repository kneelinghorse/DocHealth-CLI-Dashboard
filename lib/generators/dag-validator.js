/**
 * DAG validation utilities for workflow generators.
 *
 * Implements Kahn's Algorithm to detect cycles and report
 * missing dependencies before attempting diagram rendering.
 */

/**
 * Normalize step collection and capture duplicate IDs.
 * @param {Array<Object>} steps
 * @returns {{steps: Array<Object>, duplicateIds: string[]}}
 */
function normalizeSteps(steps = []) {
  if (!Array.isArray(steps)) {
    return { steps: [], duplicateIds: [] };
  }

  const deduped = [];
  const seen = new Set();
  const duplicateIds = [];

  steps.forEach(step => {
    if (!step || !step.id) return;
    if (seen.has(step.id)) {
      duplicateIds.push(step.id);
      return;
    }
    seen.add(step.id);
    deduped.push(step);
  });

  return { steps: deduped, duplicateIds };
}

/**
 * Build adjacency list + indegree map for workflow steps.
 * @param {Array<Object>} steps
 * @returns {{adjacency: Map<string,string[]>, indegree: Map<string,number>, missingDependencies:Array}}
 */
function buildGraph(steps = []) {
  const adjacency = new Map();
  const indegree = new Map();
  const missingDependencies = [];

  steps.forEach(step => {
    adjacency.set(step.id, []);
    indegree.set(step.id, 0);
  });

  steps.forEach(step => {
    const dependencies = Array.isArray(step.dependencies) ? step.dependencies : [];
    dependencies.forEach(dep => {
      if (!adjacency.has(dep)) {
        missingDependencies.push({ stepId: step.id, dependency: dep });
        return;
      }
      adjacency.get(dep).push(step.id);
      indegree.set(step.id, (indegree.get(step.id) || 0) + 1);
    });
  });

  return { adjacency, indegree, missingDependencies };
}

/**
 * Run Kahn's Algorithm to detect cycles and return ordering.
 * @param {Map<string,string[]>} adjacency
 * @param {Map<string,number>} indegree
 * @returns {{order:string[], hasCycle:boolean, cycleNodes:string[]}}
 */
function runTopologicalSort(adjacency, indegree) {
  const queue = [];
  const order = [];

  indegree.forEach((count, node) => {
    if (count === 0) queue.push(node);
  });

  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    (adjacency.get(current) || []).forEach(next => {
      indegree.set(next, (indegree.get(next) || 0) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
      }
    });
  }

  const hasCycle = order.length !== adjacency.size;
  const cycleNodes = [];
  if (hasCycle) {
    indegree.forEach((count, node) => {
      if (count > 0) {
        cycleNodes.push(node);
      }
    });
  }

  return { order, hasCycle, cycleNodes };
}

/**
 * Validate workflow steps for DAG soundness.
 * @param {Array<Object>} steps
 * @returns {{
 *   hasCycle: boolean,
 *   cycleNodes: string[],
 *   missingDependencies: Array<{stepId:string, dependency:string}>,
 *   duplicateIds: string[],
 *   order: string[],
 *   isolatedNodes: string[],
 *   metadata: { nodeCount: number, edgeCount: number }
 * }}
 */
function validateWorkflowDag(steps = []) {
  const { steps: normalizedSteps, duplicateIds } = normalizeSteps(steps);
  const { adjacency, indegree, missingDependencies } = buildGraph(normalizedSteps);
  const { order, hasCycle, cycleNodes } = runTopologicalSort(new Map(adjacency), new Map(indegree));

  const isolatedNodes = [];
  normalizedSteps.forEach(step => {
    const deps = Array.isArray(step.dependencies) ? step.dependencies.length : 0;
    const outbound = (adjacency.get(step.id) || []).length;
    if (deps === 0 && outbound === 0) {
      isolatedNodes.push(step.id);
    }
  });

  let edgeCount = 0;
  adjacency.forEach(neighbors => {
    edgeCount += neighbors.length;
  });

  return {
    hasCycle,
    cycleNodes,
    missingDependencies,
    duplicateIds,
    order,
    isolatedNodes,
    metadata: {
      nodeCount: normalizedSteps.length,
      edgeCount
    }
  };
}

module.exports = {
  validateWorkflowDag,
  normalizeSteps,
  buildGraph,
  runTopologicalSort
};
