import React, { useState, useRef } from "react";
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
  onLabelChange,
}) {
  const [editing, setEditing] = useState(false);

  const inputRef = useRef(null);
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const from = nodeMap[connection.from];
  const to = nodeMap[connection.to];
  const connectionColor = theme === 'dark' ? '#ffffff' : '#1f1f1f';
  const isDark = theme === 'dark';

  if (!from || !to) return null;

  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);
  const start = getEdgePoint(from, toCenter);
  const end = getEdgePoint(to, fromCenter);
  const controlPoint = connection.controlPoint || getDefaultControlPoint(start, end);
  const labelX =
    0.25 * start.x +
    0.5 * controlPoint.x +
    0.25 * end.x;

  const labelY =
    0.25 * start.y +
    0.5 * controlPoint.y +
    0.25 * end.y;
  const endShort = shortenTowards(controlPoint, end, 10);
  const pathData = `M${start.x},${start.y} Q${controlPoint.x},${controlPoint.y} ${endShort.x},${endShort.y}`;

  // The label used to render unconditionally, as an opaque white pill sitting
  // at the midpoint — so every connection, labelled or not, had a white gap
  // punched through the middle of its line. It now only exists while it's
  // actually being edited or actually has text in it.
  const hasLabel = Boolean(`${connection.label || ''}`.trim());
  const showLabelBox = editing || hasLabel;

  const startEditing = (event) => {
    event.stopPropagation();
    // Without this the double-click keeps travelling up to the canvas, which
    // treats a double-click on empty space as "create a floating text node".
    event.preventDefault();
    setEditing(true);
  };

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
          // With no permanent label box to double-click, the line itself is
          // what opens the editor for naming this connection.
          onDoubleClick={startEditing}
        />

        {showLabelBox && (
          <foreignObject
            x={labelX - 70}
            y={labelY - 14}
            width={140}
            height={30}
            style={{
              pointerEvents: "all",
              overflow: "visible",
            }}
          >
            {editing ? (
              <input
                ref={inputRef}
                autoFocus
                defaultValue={connection.label || ""}
                style={{
                  width: "100%",
                  border: "1px solid #696eff",
                  borderRadius: 5,
                  fontSize: 13,
                  padding: "2px 6px",
                  textAlign: "center",
                  // Matches the canvas instead of being hard-coded white, which
                  // read as a bright slab in dark mode.
                  background: isDark ? "#1f1d2b" : "#ffffff",
                  color: isDark ? "#f5f5f5" : "#222",
                  outline: "none",
                }}
                onBlur={(e) => {
                  onLabelChange(connection.id, e.target.value);
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onLabelChange(connection.id, e.target.value);
                    setEditing(false);
                  }

                  if (e.key === "Escape") {
                    // Leave the label as it was.
                    setEditing(false);
                  }
                }}
              />
            ) : (
              <div
                onDoubleClick={startEditing}
                style={{
                  display: "inline-block",
                  // Only as wide as the text — a full-width block would put an
                  // opaque bar across the line again, just a shorter one.
                  background: isDark ? "#1f1d2b" : "#ffffff",
                  padding: "2px 8px",
                  borderRadius: 10,
                  textAlign: "center",
                  cursor: "text",
                  fontSize: 13,
                  color: isDark ? "#f5f5f5" : "#222",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                {connection.label}
              </div>
            )}
          </foreignObject>
        )}

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