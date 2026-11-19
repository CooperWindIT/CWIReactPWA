import React, { useState, useRef } from "react";
import { getNodeCenter, getEdgePoint } from './Geometry';
import {
  ARROW_TYPE,
  ARROWHEAD,
  ARROW_HEAD_LEN,
  ARROW_HEAD_W,
  CONNECTION_WIDTH,
  CONNECTION_LAYER,
  SELECTED_CONNECTION_LAYER,
  getArrowType,
  getConnectionAnchors,
  anchorPoint,
  resolveArrowStyle,
  dashArrayFor,
  getElbowPoints,
  routeSegments,
  trimForArrow,
  buildArrowPath,
  cornerRadiusFor,
  polylineMidpoint,
  sampleQuadratic,
  hashSeed,
} from './connectionRouting';

function getDefaultControlPoint(start, end) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

// One <marker> per head shape.
//
// overflow="visible" matters here: a marker clips to its own box by default, so
// a stroked head (the barb and the outline triangle) would have the outer half
// of its stroke shaved off along every edge.
function ArrowheadMarker({ id, type, length, width, color, reversed }) {
  if (!type || type === ARROWHEAD.NONE) return null;

  const outlineWidth = Math.max(1.3, length * 0.13);

  const shared = {
    id,
    markerUnits: 'userSpaceOnUse',
    markerWidth: length,
    markerHeight: width,
    // The reference point is the tip, so the tip lands exactly on the end of
    // the path and the head overlays the last stretch of line.
    refX: length,
    refY: width / 2,
    // A head on the START of a line has to point back down the line rather
    // than along it.
    orient: reversed ? 'auto-start-reverse' : 'auto',
    overflow: 'visible',
  };

  if (type === ARROWHEAD.ARROW) {
    return (
      <marker {...shared}>
        <path
          d={`M0,0 L${length},${width / 2} L0,${width}`}
          fill="none"
          stroke={color}
          strokeWidth={outlineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
    );
  }

  if (type === ARROWHEAD.TRIANGLE_OUTLINE) {
    return (
      <marker {...shared}>
        <path
          d={`M0,0 L${length},${width / 2} L0,${width} Z`}
          fill="none"
          stroke={color}
          strokeWidth={outlineWidth}
          strokeLinejoin="round"
        />
      </marker>
    );
  }

  // The notch at the back is what stops a solid head reading as a blunt wedge.
  return (
    <marker {...shared}>
      <path
        d={`M0,0 L${length},${width / 2} L0,${width} L${length * 0.28},${width / 2} Z`}
        fill={color}
      />
    </marker>
  );
}

export default function Connections({
  nodes,
  connection,
  theme,
  dimmed,
  selected,
  onSelectConnection,
  onControlPointDragStart,
  onEndpointDragStart,
  onSegmentDragStart,
  onDeleteConnection,
  onLabelChange,
}) {
  const [editing, setEditing] = useState(false);

  const inputRef = useRef(null);
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const from = nodeMap[connection.from];
  const to = nodeMap[connection.to];
  const isDark = theme === 'dark';

  if (!from || !to) return null;

  // Everything the properties panel can set, resolved once. The panel's
  // sticky defaults are deliberately NOT consulted here — they are applied
  // when an arrow is created, not when it is drawn, so changing them never
  // reaches back and restyles arrows that are already on the canvas.
  const style = resolveArrowStyle(connection);

  // A null stroke means "follow the theme", which is what keeps diagrams drawn
  // before the colour picker existed readable on both canvases.
  const connectionColor = style.stroke || (isDark ? '#ffffff' : '#1f1f1f');

  const strokeWidth = style.strokeWidth;
  const headScale = strokeWidth / CONNECTION_WIDTH;
  const headLen = ARROW_HEAD_LEN * headScale;
  const headW = ARROW_HEAD_W * headScale;

  // Every connection renders its own <svg>, so marker ids have to be unique per
  // connection — otherwise they all resolve to whichever marker the browser
  // found first in the document and share its size, shape and colour.
  const idSafe = String(connection.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const endMarkerId = `flow-arrow-end-${idSafe}`;
  const startMarkerId = `flow-arrow-start-${idSafe}`;

  const hasStartHead = style.startArrowhead !== ARROWHEAD.NONE;
  const hasEndHead = style.endArrowhead !== ARROWHEAD.NONE;

  const fromCenter = getNodeCenter(from);
  const toCenter = getNodeCenter(to);

  // An arrow drawn with the arrow tool remembers exactly where on each border
  // it was attached. Anything older — the connect tool, auto arrow, old saved
  // diagrams — has no anchors, and keeps aiming at the shape's centre line.
  const anchors = getConnectionAnchors(connection);
  const arrowType = style.arrowType;
  const seed = hashSeed(connection.id);

  // Each route is reduced to a list of points first and turned into a path
  // second. Going through points for all three types is what lets sloppiness
  // apply uniformly — a wobble has to be applied to a route, not to a path
  // string — and it's also what the drag handles are positioned from.
  let routePoints;
  let start;
  let end;

  if (arrowType === ARROW_TYPE.ELBOW) {
    routePoints = getElbowPoints(connection, from, to);

    // The endpoints are READ BACK OFF the route rather than worked out a
    // second time. Computing them independently is how the endpoint handles
    // ended up floating beside the arrow instead of on it — two bits of code
    // deciding where the same point was, and disagreeing whenever an arrow
    // had no anchors stored.
    start = routePoints[0];
    end = routePoints[routePoints.length - 1];
  } else {
    // A straight or curved arrow with no anchors keeps aiming at the other
    // shape's centre, exactly as it always has.
    start = anchors.from ? anchorPoint(from, anchors.from) : getEdgePoint(from, toCenter);
    end = anchors.to ? anchorPoint(to, anchors.to) : getEdgePoint(to, fromCenter);
  }

  const controlPoint = connection.controlPoint || getDefaultControlPoint(start, end);

  if (arrowType === ARROW_TYPE.STRAIGHT) {
    routePoints = [start, end];
  } else if (arrowType !== ARROW_TYPE.ELBOW) {
    routePoints = sampleQuadratic(start, controlPoint, end, 24);
  }

  // Only the ends that actually carry a head get trimmed; a plain tail should
  // touch its shape rather than float a couple of pixels off it.
  const trimmed = trimForArrow(routePoints, {
    start: hasStartHead,
    end: hasEndHead,
  });

  // Corner rounding only belongs to elbows, and only when this arrow asks for
  // it. cornerRadiusFor is shared with the PDF exporter so the printed corner
  // is the drawn one.
  const cornerRadius = cornerRadiusFor(style, arrowType);

  const pathData = buildArrowPath(trimmed, style.sloppiness, seed, { cornerRadius });

  const mid = polylineMidpoint(trimmed);
  const labelX = mid.x;
  const labelY = mid.y;

  // Handles sit on the untrimmed route, so they don't shuffle about when an
  // arrowhead is switched on or off.
  const segments = (selected && arrowType === ARROW_TYPE.ELBOW)
    ? routeSegments(routePoints)
    : [];

  // The label used to render unconditionally, as an opaque white pill sitting
  // at the midpoint — so every connection, labelled or not, had a white gap
  // punched through the middle of its line. It now only exists while it's
  // actually being edited or actually has text in it.
  const hasLabel = Boolean(`${connection.label || ''}`.trim());
  const showLabelBox = editing || hasLabel;

  // The box is centered on (labelX, labelY) and its contents are centered
  // inside it. Laying the label out as a plain inline-block instead left it
  // aligned to the box's left edge, which pushed the visible text off-center
  // by roughly half its own width.
  const LABEL_BOX_W = 180;
  const LABEL_BOX_H = 34;

  const startEditing = (event) => {
    event.stopPropagation();
    // Without this the double-click keeps travelling up to the canvas, which
    // treats a double-click on empty space as "create a floating text node".
    event.preventDefault();
    setEditing(true);
  };

  const dashArray = dashArrayFor(style.strokeStyle, strokeWidth);

  const handleFill = isDark ? '#1f1d2b' : '#ffffff';

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        // A selected arrow is lifted above the shapes. Its handles live in
        // this same layer, and at the default depth an endpoint handle sitting
        // on a shape's border was drawn underneath that shape — visible only
        // as a sliver, and impossible to grab.
        zIndex: selected ? SELECTED_CONNECTION_LAYER : CONNECTION_LAYER,
        overflow: 'visible',
      }}
    >
      <defs>
        <ArrowheadMarker
          id={endMarkerId}
          type={style.endArrowhead}
          length={headLen}
          width={headW}
          color={connectionColor}
        />
        <ArrowheadMarker
          id={startMarkerId}
          type={style.startArrowhead}
          length={headLen}
          width={headW}
          color={connectionColor}
          reversed
        />
      </defs>

      <g opacity={dimmed ? 0.16 : style.opacity / 100}>
        {/* Drawn first, so it sits UNDER the line as a halo. Painted after, a
            translucent band would wash out the arrow's own colour. Selection
            has to stay visible on an arrow of any colour, including one the
            user has already coloured blue, so it's a halo rather than a
            recolour. */}
        {selected && (
          <path
            d={pathData}
            stroke="#696eff"
            strokeWidth={strokeWidth + 8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.25}
            style={{ pointerEvents: 'none' }}
          />
        )}

        <path
          d={pathData}
          stroke={connectionColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashArray}
          markerEnd={hasEndHead ? `url(#${endMarkerId})` : undefined}
          markerStart={hasStartHead ? `url(#${startMarkerId})` : undefined}
        />

        {/* A second, slightly offset pass at the sloppiest setting. One wobbly
            line reads as a wobbly line; two overlapping ones read as pencil. */}
        {style.sloppiness >= 2 && (
          <path
            d={buildArrowPath(trimmed, style.sloppiness, seed + 977, { cornerRadius })}
            stroke={connectionColor}
            strokeWidth={strokeWidth * 0.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashArray}
            opacity={0.55}
          />
        )}

        <path
          d={pathData}
          data-connid={connection.id}
          stroke="transparent"
          strokeWidth={Math.max(18, strokeWidth * 5)}
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
            x={labelX - LABEL_BOX_W / 2}
            y={labelY - LABEL_BOX_H / 2}
            width={LABEL_BOX_W}
            height={LABEL_BOX_H}
            style={{
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {/* Full-size flex wrapper: this is what actually centers the
                label on the line, both across and along it. It ignores
                pointer events so the padding around a short label doesn't
                swallow clicks meant for the line underneath. */}
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
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
                    // Matches the canvas instead of being hard-coded white,
                    // which read as a bright slab in dark mode.
                    background: isDark ? "#1f1d2b" : "#ffffff",
                    color: isDark ? "#f5f5f5" : "#222",
                    outline: "none",
                    pointerEvents: "all",
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
                    // Only as wide as the text — a full-width block would put
                    // an opaque bar across the line again.
                    display: "inline-block",
                    background: isDark ? "#1f1d2b" : "#ffffff",
                    padding: "2px 8px",
                    borderRadius: 10,
                    textAlign: "center",
                    cursor: "text",
                    fontSize: 13,
                    lineHeight: 1.3,
                    color: isDark ? "#f5f5f5" : "#222",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    pointerEvents: "all",
                  }}
                >
                  {connection.label}
                </div>
              )}
            </div>
          </foreignObject>
        )}

        {/* The bend handle only means anything on a curve — a straight line has
            nothing to bend, and an elbow is reshaped by its segment handles
            instead. */}
        {selected && arrowType === ARROW_TYPE.CURVE && (
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
              fill={handleFill}
              stroke="#696eff"
              strokeWidth="2"
              style={{ cursor: 'grab', pointerEvents: 'all' }}
              onMouseDown={(event) => onControlPointDragStart(event, connection.id)}
            />
          </g>
        )}

        {selected && (
          <g>
            {/* Segment handles. Each one slides its segment sideways, which is
                how the route gets reshaped by hand. The cursor shows the only
                axis the segment can move along — a horizontal segment can only
                go up and down.

                Each handle is a visible dot plus a larger invisible disc
                behind it. A 6px target is fiddly to hit on a line that is
                itself 3px wide, so the grabbable area is roughly twice what
                is drawn. */}
            {segments.map((segment) => (
              <g key={`seg-${segment.index}-${segment.kind}`}>
                <circle
                  cx={segment.mid.x}
                  cy={segment.mid.y}
                  r={13}
                  fill="transparent"
                  style={{
                    cursor: segment.axis === 'h' ? 'ns-resize' : 'ew-resize',
                    pointerEvents: 'all',
                  }}
                  onMouseDown={(event) => (
                    onSegmentDragStart
                    && onSegmentDragStart(
                      event, connection.id, segment.index, routePoints, segment.kind,
                    )
                  )}
                />
                <circle
                  cx={segment.mid.x}
                  cy={segment.mid.y}
                  r={6}
                  fill={handleFill}
                  stroke="#696eff"
                  strokeWidth={2.2}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}

            {/* Endpoint handles. Dragging one slides the arrow's attachment
                point anywhere along the shape's outline. Drawn last, and
                filled rather than hollow, so they read as different from the
                segment handles and stay on top where the two land close
                together. */}
            {[
              { key: 'from', point: start },
              { key: 'to', point: end },
            ].map(({ key, point }) => (
              <g key={`end-${key}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={14}
                  fill="transparent"
                  style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                  onMouseDown={(event) => (
                    onEndpointDragStart && onEndpointDragStart(event, connection.id, key)
                  )}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={6.5}
                  fill="#696eff"
                  stroke={handleFill}
                  strokeWidth={2.5}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}