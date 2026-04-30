import React from 'react';
import { getNodeCenter, getEdgePoint } from './Geometry';

export default function Connections({ nodes, connection, theme, onDeleteConnection }) {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const from = nodeMap[connection.from];
  const to = nodeMap[connection.to];
  const connectionColor = theme === 'dark' ? '#ffffff' : '#1f1f1f';

  if (!from || !to) return null;

  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);
  const start = getEdgePoint(from, toCenter);
  const end = getEdgePoint(to, fromCenter);

  const shortenTowards = (a, b, distance) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0 || distance >= length) return b;
    const ratio = (length - distance) / length;
    return { x: a.x + dx * ratio, y: a.y + dy * ratio };
  };

  const endShort = shortenTowards(start, end, 10);
  const dx = endShort.x - start.x;
  const dy = endShort.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const bend = Math.min(Math.max(absDx, absDy) * 0.48, 110);

  let c1x;
  let c1y;
  let c2x;
  let c2y;

  if (absDy >= absDx) {
    c1x = start.x;
    c1y = start.y + (dy > 0 ? bend : -bend);
    c2x = endShort.x;
    c2y = endShort.y + (dy > 0 ? -bend : bend);
  } else {
    c1x = start.x + (dx > 0 ? bend : -bend);
    c1y = start.y;
    c2x = endShort.x + (dx > 0 ? -bend : bend);
    c2y = endShort.y;
  }

  const pathData = `M${start.x},${start.y} C${c1x},${c1y} ${c2x},${c2y} ${endShort.x},${endShort.y}`;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M1,1.5 L8.5,5 L1,8.5 L2.5,5 Z" fill={connectionColor} />
        </marker>
      </defs>

      <g>
        <path
          d={pathData}
          stroke={connectionColor}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#flow-arrow)"
        />

        <path
          d={pathData}
          stroke="transparent"
          strokeWidth={16}
          fill="none"
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={() => onDeleteConnection(connection.id)}
        />
      </g>
    </svg>
  );
}
