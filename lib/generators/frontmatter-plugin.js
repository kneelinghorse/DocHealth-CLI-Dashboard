/**
 * Remark plugin to inject YAML frontmatter into a document.
 */

const yaml = require('js-yaml');

/**
 * Create a remark plugin that inserts YAML frontmatter.
 * @param {Object} frontmatter
 * @returns {Function}
 */
function createFrontmatterPlugin(frontmatter = {}) {
  const serialized = yaml.dump(frontmatter || {}, { skipInvalid: true }).trimEnd();
  const node = {
    type: 'yaml',
    value: serialized ? `${serialized}\n` : ''
  };

  return () => (tree, file) => {
    file.data = file.data || {};
    file.data.frontmatter = frontmatter;

    if (!tree.children) {
      tree.children = [node];
      return;
    }

    const index = tree.children.findIndex(child => child.type === 'yaml');
    if (index >= 0) {
      tree.children[index] = node;
    } else {
      tree.children.unshift(node);
    }
  };
}

module.exports = {
  createFrontmatterPlugin
};
