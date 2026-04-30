import jsPDF from 'jspdf';

// Converts diagram data (nodes, connections, name) to a PDF Blob
export function diagramToPdf({ name, nodes, connections }) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(name || 'Diagram', 10, 20);
  doc.setFontSize(12);
  doc.text('Nodes:', 10, 35);
  nodes.forEach((node, i) => {
    doc.text(`${i + 1}. ${node.label || node.shape} (${node.shape})`, 15, 45 + i * 8);
  });
  const yStart = 45 + nodes.length * 8 + 10;
  doc.text('Connections:', 10, yStart);
  connections.forEach((conn, i) => {
    doc.text(`${i + 1}. ${conn.from} -> ${conn.to}`, 15, yStart + 10 + i * 8);
  });
  return doc.output('blob');
}
