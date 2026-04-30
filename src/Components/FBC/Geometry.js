export function getNodeCenter(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

export function getEdgePoint(node, toCenter) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = toCenter.x - cx;
  const dy = toCenter.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = Math.abs(dx) / (node.w / 2);
  const sy = Math.abs(dy) / (node.h / 2);
  let ex, ey;
  if (sx > sy) {
    ex = cx + (dx > 0 ? node.w / 2 : -node.w / 2);
    ey = cy + (dy / Math.abs(dx)) * (node.w / 2);
  } else {
    ey = cy + (dy > 0 ? node.h / 2 : -node.h / 2);
    ex = cx + (dx / Math.abs(dy)) * (node.h / 2);
  }
  return { x: ex, y: ey };
}

export function uid() {
  return 'n' + Date.now() + Math.random().toString(36).slice(2, 7);
}

export function snapshot(nodes, connections) {
  return JSON.parse(JSON.stringify({ nodes, connections }));
}