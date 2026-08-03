/**
 * diagramUtils.js
 * Replaces pdfUtils.js — saves full diagram JSON as a .json file (not PDF).
 * This allows full restore of nodes, connections, positions, styles, etc.
 */

/**
 * Converts diagram data to a JSON Blob for upload.
 * @param {{ name: string, nodes: Array, connections: Array }} param0
 * @returns {Blob}
 */
export function diagramToJson({ name, nodes, connections }) {
    const payload = {
      name: name || 'Untitled diagram',
      nodes,
      connections,
      savedAt: Date.now(),
      version: 1,
    };
    return new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
  }
  
  /**
   * Parses a diagram JSON blob/response back into { name, nodes, connections }.
   * @param {string} jsonText  Raw JSON string fetched from server
   * @returns {{ name: string, nodes: Array, connections: Array, savedAt: number } | null}
   */
  export function parseDiagramJson(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      return {
        name: parsed.name || 'Untitled diagram',
        nodes: parsed.nodes || [],
        connections: parsed.connections || [],
        savedAt: parsed.savedAt || Date.now(),
      };
    } catch (e) {
      console.error('parseDiagramJson failed:', e);
      return null;
    }
  }
  