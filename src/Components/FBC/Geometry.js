export function getNodeCenter(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function intersectRayWithPolygon(center, target, points) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  let bestT = Number.POSITIVE_INFINITY;
  let bestPoint = null;

  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const denominator = (dx * sy) - (dy * sx);

    if (Math.abs(denominator) < 1e-8) continue;

    const qpx = a.x - center.x;
    const qpy = a.y - center.y;
    const t = ((qpx * sy) - (qpy * sx)) / denominator;
    const u = ((qpx * dy) - (qpy * dx)) / denominator;

    if (t >= 0 && u >= 0 && u <= 1 && t < bestT) {
      bestT = t;
      bestPoint = { x: center.x + dx * t, y: center.y + dy * t };
    }
  }

  return bestPoint;
}

function getRectEdgePoint(node, toCenter) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = toCenter.x - cx;
  const dy = toCenter.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = Math.abs(dx) / (node.w / 2);
  const sy = Math.abs(dy) / (node.h / 2);
  let ex;
  let ey;
  if (sx > sy) {
    ex = cx + (dx > 0 ? node.w / 2 : -node.w / 2);
    ey = cy + (dy / Math.abs(dx)) * (node.w / 2);
  } else {
    ey = cy + (dy > 0 ? node.h / 2 : -node.h / 2);
    ex = cx + (dx / Math.abs(dy)) * (node.h / 2);
  }
  return { x: ex, y: ey };
}

function getEllipseEdgePoint(node, toCenter) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = toCenter.x - cx;
  const dy = toCenter.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const rx = node.w / 2;
  const ry = node.h / 2;
  const scale = 1 / Math.sqrt(((dx * dx) / (rx * rx)) + ((dy * dy) / (ry * ry)));
  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

function getDiamondEdgePoint(node, toCenter) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const points = [
    { x: cx, y: node.y },
    { x: node.x + node.w, y: cy },
    { x: cx, y: node.y + node.h },
    { x: node.x, y: cy },
  ];
  return intersectRayWithPolygon({ x: cx, y: cy }, toCenter, points) || getRectEdgePoint(node, toCenter);
}

function getParallelogramEdgePoint(node, toCenter) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const skew = Math.min(22, node.w * 0.16);
  const points = [
    { x: node.x + skew, y: node.y },
    { x: node.x + node.w, y: node.y },
    { x: node.x + node.w - skew, y: node.y + node.h },
    { x: node.x, y: node.y + node.h },
  ];
  return intersectRayWithPolygon({ x: cx, y: cy }, toCenter, points) || getRectEdgePoint(node, toCenter);
}

function getHexagonEdgePoint(node, toCenter) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const inset = node.w * 0.22;
  const points = [
    { x: node.x + inset, y: node.y },
    { x: node.x + node.w - inset, y: node.y },
    { x: node.x + node.w, y: cy },
    { x: node.x + node.w - inset, y: node.y + node.h },
    { x: node.x + inset, y: node.y + node.h },
    { x: node.x, y: cy },
  ];
  return intersectRayWithPolygon({ x: cx, y: cy }, toCenter, points) || getRectEdgePoint(node, toCenter);
}

export function getEdgePoint(node, toCenter) {
  if (node.shape === 'circle') {
    return getEllipseEdgePoint(node, toCenter);
  }

  if (node.shape === 'diamond') {
    return getDiamondEdgePoint(node, toCenter);
  }

  if (node.shape === 'parallelogram') {
    return getParallelogramEdgePoint(node, toCenter);
  }

  if (node.shape === 'hexagon') {
    return getHexagonEdgePoint(node, toCenter);
  }

  return getRectEdgePoint(node, toCenter);
}

export function uid() {
  return `n${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

export function snapshot(nodes, connections) {
  return JSON.parse(JSON.stringify({ nodes, connections }));
}
