import React from 'react';
import { getNodeCenter, getEdgePoint } from './Geometry';

function getDefaultControlPoint(start, end) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

function shortenTowards(a, b, distance) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0 || distance >= length) return b;
  const ratio = (length - distance) / length;
  return { x: a.x + dx * ratio, y: a.y + dy * ratio };
}

export default function Connections({
  nodes,
  connection,
  theme,
  dimmed,
  selected,
  onSelectConnection,
  onControlPointDragStart,
  onDeleteConnection,
}) {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const from = nodeMap[connection.from];
  const to = nodeMap[connection.to];
  const connectionColor = theme === 'dark' ? '#ffffff' : '#1f1f1f';

  if (!from || !to) return null;

  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);
  const start = getEdgePoint(from, toCenter);
  const end = getEdgePoint(to, fromCenter);
  const controlPoint = connection.controlPoint || getDefaultControlPoint(start, end);
  const endShort = shortenTowards(controlPoint, end, 10);
  const pathData = `M${start.x},${start.y} Q${controlPoint.x},${controlPoint.y} ${endShort.x},${endShort.y}`;

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
          opacity={dimmed ? 0.16 : 1}
        />

        <path
          d={pathData}
          stroke="transparent"
          strokeWidth={16}
          fill="none"
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(event) => {
            event.stopPropagation();
            onSelectConnection(connection.id);
          }}
        />

        {selected && (
          <g>
            <line
              x1={(start.x + end.x) / 2}
              y1={(start.y + end.y) / 2}
              x2={controlPoint.x}
              y2={controlPoint.y}
              stroke={connectionColor}
              strokeOpacity="0.24"
              strokeDasharray="4 4"
            />
            <circle
              cx={controlPoint.x}
              cy={controlPoint.y}
              r="8"
              fill={theme === 'dark' ? '#1f1d2b' : '#ffffff'}
              stroke="#696eff"
              strokeWidth="2"
              style={{ cursor: 'grab', pointerEvents: 'all' }}
              onMouseDown={(event) => onControlPointDragStart(event, connection.id)}
            />
          </g>
        )}
      </g>
    </svg>
  );
}
