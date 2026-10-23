import React, { useRef, useCallback, useEffect } from 'react';
import Node from './Node';
import Connections from './Connections';
import ContextMenu from './ContextMenu';
import {
  isElbow,
  getElbowPoints,
  routeElbowPoints,
  routeElbowAnchors,
  trimForArrow,
  buildPolylinePath,
  distanceToPolyline,
  CONNECTION_WIDTH,
  ARROW_TYPE,
  STROKE_PALETTE,
  getArrowType,
  nearestAnchor,
  resolveAnchors,
  moveSegment,
  settleWaypoints,
  anchorTForCursor,
  CONNECTION_LAYER,
} from './connectionRouting';
import styles from './Canvas.module.css';
import { uid } from './Geometry';
import { BASE_IMAGE_API_GET } from '../Config/Config';
import { getImageFiles, pickImageFiles, placeImageFiles } from './imageSupport';

const BASE_WIDTH = 3200;
const BASE_HEIGHT = 2400;

// How far a shape may stick out of another and still count as inside it.
const CONTAINMENT_SLACK = 2;

// Does `outer` fully enclose `inner`? Area is compared as well as bounds so two
// shapes drawn on top of each other at the same size can't each claim to
// contain the other — with no strict winner, neither is a container.
function nodeContains(outer, inner) {
  if (outer.id === inner.id) return false;
  if (outer.w * outer.h <= inner.w * inner.h) return false;

  return inner.x >= outer.x - CONTAINMENT_SLACK
    && inner.y >= outer.y - CONTAINMENT_SLACK
    && inner.x + inner.w <= outer.x + outer.w + CONTAINMENT_SLACK
    && inner.y + inner.h <= outer.y + outer.h + CONTAINMENT_SLACK;
}

// Stacking for the canvas: both the order shapes are drawn in and the z-index
// each one gets.
//
// Array position alone decides what covers what, and a shape drawn later
// naturally sits on top. That is wrong for the one case where it matters most:
// draw a big box around a finished group, give it a fill, and the fill hides
// everything it was drawn around.
//
// So a shape that fully encloses others is treated as a container and put
// underneath them. Nesting works too — each shape is ranked by how many shapes
// enclose it, so a box inside a box inside a frame still comes out on top.
// Within one rank the original order is kept untouched, which is what lets
// Bring to front and Send to back carry on meaning something between shapes
// that sit side by side.
//
// Order is not enough on its own, because the arrows are a separate layer of
// their own. A container has to go below THAT too, or its fill covers every
// connection crossing it — which is why each shape also carries an explicit
// z-index rather than relying on where it falls in the list.
export function computeNodeStacking(nodes) {
  const depths = nodes.map((node) => (
    nodes.reduce((count, other) => (nodeContains(other, node) ? count + 1 : count), 0)
  ));

  const encloses = nodes.map((node) => nodes.some((other) => nodeContains(node, other)));

  const layers = {};
  nodes.forEach((node, index) => {
    layers[node.id] = encloses[index]
      // Containers stack among themselves by nesting depth, all of them below
      // the arrows. The clamp only matters for absurdly deep nesting.
      ? Math.min(depths[index], CONNECTION_LAYER - 1)
      // Everything else sits above the arrows, so a line passing under a box
      // is still hidden by that box.
      : CONNECTION_LAYER + 1 + depths[index];
  });

  if (nodes.length < 2 || depths.every((depth) => depth === 0)) {
    return { ordered: nodes, layers };
  }

  const ordered = nodes
    .map((node, index) => ({ node, index, depth: depths[index] }))
    .sort((a, b) => (a.depth - b.depth) || (a.index - b.index))
    .map((entry) => entry.node);

  return { ordered, layers };
}

// How close the eraser has to pass to something to catch it, in canvas units.
const ERASER_RADIUS = 8;
// A fast drag fires mousemove only every so often, leaving gaps between
// sample points that could skip right over a small shape. Each move is
// walked in steps of this size so the stroke behaves like a continuous
// swipe rather than a handful of disconnected dots.
const ERASER_STEP = 6;

function pointHitsNode(point, node, radius) {
  return (
    point.x >= node.x - radius &&
    point.x <= node.x + node.w + radius &&
    point.y >= node.y - radius &&
    point.y <= node.y + node.h + radius
  );
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);

  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

// Connections are hit-tested against the path between the two node centers.
// When the connection has been bent with a control point, that path is a
// quadratic curve, so it's sampled into short segments rather than treated
// as a straight line.
function pointHitsConnection(point, connection, nodeMap, radius) {
  const fromNode = nodeMap[connection.from];
  const toNode = nodeMap[connection.to];
  if (!fromNode || !toNode) return false;

  const start = { x: fromNode.x + fromNode.w / 2, y: fromNode.y + fromNode.h / 2 };
  const end = { x: toNode.x + toNode.w / 2, y: toNode.y + toNode.h / 2 };
  const control = connection.controlPoint;

  // An elbow doesn't follow the straight line between centers at all, so it
  // has to be measured against its actual right-angle route or the eraser
  // would swipe straight through it without catching anything.
  if (isElbow(connection)) {
    const points = trimForArrow(getElbowPoints(connection, fromNode, toNode));
    return distanceToPolyline(point, points) <= radius;
  }

  // A connection switched to "straight" in the panel may still be carrying the
  // control point from when it was a curve. The renderer ignores it, so the
  // hit test has to ignore it too, or the clickable line would sit somewhere
  // the visible line isn't.
  if (!control || getArrowType(connection) === ARROW_TYPE.STRAIGHT) {
    return distanceToSegment(point, start, end) <= radius;
  }

  const SAMPLES = 12;
  let previous = start;

  for (let i = 1; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const inverse = 1 - t;
    const current = {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };

    if (distanceToSegment(point, previous, current) <= radius) return true;
    previous = current;
  }

  return false;
}

function getConnectionSide(fromNode, toNode) {
  const fromCenterX = fromNode.x + fromNode.w / 2;
  const fromCenterY = fromNode.y + fromNode.h / 2;
  const toCenterX = toNode.x + toNode.w / 2;
  const toCenterY = toNode.y + toNode.h / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'bottom' : 'top';
}


export default function Canvas({
  nodes,
  connections,
  selectedId,
  selectedIds,
  selectedConnectionId,
  theme,
  mode,
  activeShape,
  setActiveShape,
  connectFrom,
  matchedNodeIds,
  activeSearchNodeId,
  focusedNodeIds,
  onNodesChange,
  onConnectionsChange,
  onNodeDrop,
  onCreateNode,
  onCreateLine,
  onCreateTextNode,
  onCreateImage,
  insertImageRequest,
  autoEditNodeId,
  onAutoEditConsumed,
  onWrapTextInContainer,
  onChangeNodeLayer,
  onCreateArrowConnection,
  arrowDefaults,
  onNodeDragEnd,
  onToggle,
  onSelectNode,
  onSelectNodes,
  onSelectConnection,
  onConnect,
  onLabelChange,
  onTextsChange,
  onAutoResize,
  onErase,
  onQuickCreateFromNode,
  onFocusBranch,
  onConnectionControlEnd,
  onDeleteConnection,
  readMode,
  zoom,
  onZoomChange,
  showGrid,
  canvasBg,
  sessionUserData,
  onConnectionLabelChange,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragging = useRef(null);
  const panning = useRef(null);
  const selecting = useRef(null);
  const resizing = useRef(null);
  const draggingConnectionHandle = useRef(null);
  // Free-hand line drawing: set on mousedown while the Line tool is active,
  // holding the canvas point where the drag started; cleared on mouseup once
  // the finished line is handed off via onCreateLine. Separate from
  // `resizing` (which reshapes an EXISTING node's box) and
  // `resizingLineEndpoint` below (which drags one end of an existing line).
  const drawingLine = useRef(null);
  // Dragging one endpoint handle of an already-placed line (see Node.jsx's
  // two endpoint handles for a selected line, instead of the usual four
  // corner resize handles every other shape gets).
  const resizingLineEndpoint = useRef(null);
  // Eraser stroke in progress: the last sampled point, plus the sets of node
  // and connection ids swiped over so far. Nothing is actually deleted until
  // the button comes back up — until then they're only grayed out, so a
  // mis-swipe can be taken back with Alt.
  const erasing = useRef(null);
  // Elbow-arrow tool: the shape the drag started on, plus where it started.
  // Nothing is created until the drag is released over another shape.
  const drawingElbow = useRef(null);
  const didDrag = useRef(false);
  const [selectionRect, setSelectionRect] = React.useState(null);
  // Live preview of the line being drawn, in absolute canvas coordinates —
  // rendered as a dashed line that tracks the cursor until mouseup.
  const [linePreview, setLinePreview] = React.useState(null);
  // Ids currently marked by an in-progress eraser stroke, mirrored into state
  // so the affected shapes and connections can render grayed out.
  const [erasePreview, setErasePreview] = React.useState({ nodeIds: [], connectionIds: [] });
  // Open right-click menu: viewport coords plus which node (if any) was under
  // the cursor. null when closed.
  const [contextMenu, setContextMenu] = React.useState(null);
  // Live right-angle preview that tracks the cursor while an elbow arrow is
  // being dragged, plus the shape currently under it so it can be highlighted
  // as a valid drop target.
  const [elbowPreview, setElbowPreview] = React.useState(null);

  const lastPointerPos = useRef({ x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 });

  const handlePaste = useCallback((event) => {
    if (readMode) return;

    const activeEl = document.activeElement;
    const isEditingText =
      activeEl &&
      (activeEl.isContentEditable ||
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA');

    // Let the browser's native paste run when the user is actively typing
    // inside a node label or a text field — don't hijack that.
    if (isEditingText) return;

    // An image on the clipboard wins over any text flavour the same clipboard
    // may also carry (copying a picture from a browser or Word usually brings
    // along HTML/text too), so this has to be checked BEFORE the text path
    // below or the image would never be seen.
    const pastedImages = getImageFiles(event.clipboardData);
    if (pastedImages.length) {
      event.preventDefault();
      placeImageFiles(pastedImages, lastPointerPos.current, onCreateImage);
      return;
    }

    let clipboardText = event.clipboardData?.getData('text/plain') || '';

    // Some sources (Word, Google Docs) sometimes only populate HTML.
    if (!clipboardText.trim()) {
      const html = event.clipboardData?.getData('text/html') || '';
      if (html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        clipboardText = tempDiv.textContent || tempDiv.innerText || '';
      }
    }

    if (!clipboardText.trim()) return;

    event.preventDefault();

    const lines = clipboardText
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return;

    // Exactly one node selected -> paste text into it instead of creating new nodes.
    if (selectedIds.length === 1) {
      onLabelChange(selectedIds[0], lines.join('\n'));
      return;
    }

    const basePoint = lastPointerPos.current;

    lines.forEach((line, index) => {
      onNodeDrop({
        id: uid(),
        shape: 'text',
        x: basePoint.x,
        y: basePoint.y + index * 60,
        w: 160,
        h: 42,
        label: line,
        strokeColor: '#1f1f1f',
        fillColor: 'transparent',
        collapsed: false,
      });
    });
  }, [readMode, selectedIds, onLabelChange, onNodeDrop, onCreateImage]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // The toolbar's Image button bumps a counter rather than opening the picker
  // itself — placement happens here, where the scroll position and zoom
  // needed to work out canvas coordinates actually live. The initial 0 is
  // skipped so this doesn't fire a file dialog on mount.
  useEffect(() => {
    if (!insertImageRequest || readMode) return;

    (async () => {
      const files = await pickImageFiles();
      if (!files.length) return;

      const wrap = wrapRef.current;
      // Lands in the middle of what's currently on screen, not the middle of
      // the (much larger) canvas.
      const point = wrap
        ? {
          x: Math.round((wrap.scrollLeft + wrap.clientWidth / 2) / zoom),
          y: Math.round((wrap.scrollTop + wrap.clientHeight / 2) / zoom),
        }
        : lastPointerPos.current;

      placeImageFiles(files, point, onCreateImage);
    })();
    // Deliberately keyed only on the request counter: re-running whenever zoom
    // or the callback identity changed would pop the file dialog open again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertImageRequest]);

  // Which shape is under a canvas point. Walks backwards because later nodes
  // render on top, so the last match is the one the user can actually see.
  // Stacking order for drawing AND for hit-testing. The two have to come from
  // the same list or clicks land on whatever used to be on top.
  const stacking = React.useMemo(() => computeNodeStacking(nodes), [nodes]);
  const stackedNodes = stacking.ordered;

  const nodeAtPoint = useCallback((point) => {
    for (let i = stackedNodes.length - 1; i >= 0; i -= 1) {
      const node = stackedNodes[i];
      if (
        point.x >= node.x &&
        point.x <= node.x + node.w &&
        point.y >= node.y &&
        point.y <= node.y + node.h
      ) {
        return node;
      }
    }
    return null;
  }, [stackedNodes]);

  const getCanvasRectFromPoints = useCallback((a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }), []);

  const toCanvasPoint = useCallback((clientX, clientY) => {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const rect = wrap.getBoundingClientRect();
    return {
      x: Math.max(0, Math.round((clientX - rect.left + wrap.scrollLeft) / zoom)),
      y: Math.max(0, Math.round((clientY - rect.top + wrap.scrollTop) / zoom)),
    };
  }, [zoom]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const trackPointer = (event) => {
      lastPointerPos.current = toCanvasPoint(event.clientX, event.clientY);
    };
    wrap.addEventListener('mousemove', trackPointer);
    return () => wrap.removeEventListener('mousemove', trackPointer);
  }, [toCanvasPoint]);

  // Walks the eraser from one sampled point to the next, marking (or with
  // `reverting`, un-marking) everything along the way. Stepping the segment
  // rather than testing only the endpoints is what keeps a fast swipe from
  // jumping clean over a small shape.
  const applyEraserAlongSegment = useCallback((from, to, reverting) => {
    const state = erasing.current;
    if (!state) return;

    const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / ERASER_STEP));
    let changed = false;

    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 1 : i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };

      nodes.forEach((node) => {
        if (!pointHitsNode(point, node, ERASER_RADIUS)) return;

        if (reverting) {
          if (state.nodeIds.delete(node.id)) changed = true;
        } else if (!state.nodeIds.has(node.id)) {
          state.nodeIds.add(node.id);
          changed = true;
        }
      });

      connections.forEach((connection) => {
        if (!pointHitsConnection(point, connection, nodeMap, ERASER_RADIUS)) return;

        if (reverting) {
          if (state.connectionIds.delete(connection.id)) changed = true;
        } else if (!state.connectionIds.has(connection.id)) {
          state.connectionIds.add(connection.id);
          changed = true;
        }
      });
    }

    if (changed) {
      setErasePreview({
        nodeIds: Array.from(state.nodeIds),
        connectionIds: Array.from(state.connectionIds),
      });
    }
  }, [nodes, connections]);

  useEffect(() => {
    const onMouseMove = (event) => {
      if (dragging.current) {
        const dragState = dragging.current;
        if (!dragState) return;
        didDrag.current = true;
        const point = toCanvasPoint(event.clientX, event.clientY);
        const deltaX = point.x - dragState.startPoint.x;
        const deltaY = point.y - dragState.startPoint.y;
        onNodesChange((prev) => prev.map((node) => {
          const original = dragState.originalPositions[node.id];
          if (!original) return node;

          const nextX = Math.max(0, Math.round(original.x + deltaX));
          const nextY = Math.max(0, Math.round(original.y + deltaY));
          const next = { ...node, x: nextX, y: nextY };

          // A line's visible stroke is drawn from its own x1/y1/x2/y2 (see
          // Node.jsx's LineShape), not just its bounding box — so moving the
          // node has to shift those endpoints by the same (possibly
          // edge-clamped) delta the box just moved by, or the stroke would
          // stay behind while the box moves out from under it.
          if (node.shape === 'line' && original.x1 !== undefined) {
            const appliedDeltaX = nextX - original.x;
            const appliedDeltaY = nextY - original.y;
            next.x1 = Math.round(original.x1 + appliedDeltaX);
            next.y1 = Math.round(original.y1 + appliedDeltaY);
            next.x2 = Math.round(original.x2 + appliedDeltaX);
            next.y2 = Math.round(original.y2 + appliedDeltaY);
          }

          return next;
        }));
        return;
      }

      if (resizingLineEndpoint.current) {
        const state = resizingLineEndpoint.current;
        if (!state) return;
        didDrag.current = true;
        const point = toCanvasPoint(event.clientX, event.clientY);
        const { nodeId, endpointIndex, originalNode } = state;

        onNodesChange((prev) => prev.map((node) => {
          if (node.id !== nodeId) return node;

          const next = { ...node };
          if (endpointIndex === 0) {
            next.x1 = Math.round(point.x);
            next.y1 = Math.round(point.y);
            next.x2 = originalNode.x2;
            next.y2 = originalNode.y2;
          } else {
            next.x2 = Math.round(point.x);
            next.y2 = Math.round(point.y);
            next.x1 = originalNode.x1;
            next.y1 = originalNode.y1;
          }

          next.x = Math.min(next.x1, next.x2);
          next.y = Math.min(next.y1, next.y2);
          next.w = Math.max(2, Math.abs(next.x2 - next.x1));
          next.h = Math.max(2, Math.abs(next.y2 - next.y1));

          return next;
        }));
        return;
      }

      if (drawingLine.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        setLinePreview({
          x1: drawingLine.current.start.x,
          y1: drawingLine.current.start.y,
          x2: point.x,
          y2: point.y,
        });
        return;
      }

      if (drawingElbow.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        const { fromId, fromAnchor, start } = drawingElbow.current;
        const overNode = nodeAtPoint(point);
        const sourceNode = nodes.find((node) => node.id === fromId);

        // Straight and curved arrows don't route by side, so their preview is
        // just a line to the cursor. Only an elbow has a route worth
        // previewing in detail.
        const previewType = arrowDefaults?.arrowType || ARROW_TYPE.ELBOW;
        const previewIsElbow = previewType === ARROW_TYPE.ELBOW;

        // Once the cursor is over a valid target, the preview switches from a
        // loose line to the EXACT route that will be created — including the
        // side it will enter, which follows the cursor around the target.
        if (overNode && overNode.id !== fromId && sourceNode) {
          const toAnchor = nearestAnchor(overNode, point);
          drawingElbow.current.toAnchor = toAnchor;

          setElbowPreview({
            points: previewIsElbow
              ? routeElbowAnchors(sourceNode, overNode, fromAnchor, toAnchor)
              : [start, point],
            targetId: overNode.id,
          });
        } else {
          drawingElbow.current.toAnchor = null;
          setElbowPreview({
            points: previewIsElbow ? routeElbowPoints(start, point) : [start, point],
            targetId: null,
          });
        }

        return;
      }

      if (erasing.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        // Alt turns the stroke into an "un-eraser": swiping back over
        // something already marked takes it off the list.
        const reverting = event.altKey;
        applyEraserAlongSegment(erasing.current.lastPoint, point, reverting);
        erasing.current.lastPoint = point;
        return;
      }

      if (resizing.current) {
        const resizeState = resizing.current;
        if (!resizeState) return;
        didDrag.current = true;
        const point = toCanvasPoint(event.clientX, event.clientY);
        const { nodeId, handle, originalNode } = resizeState;
        onNodesChange((prev) => prev.map((node) => {
          if (node.id !== nodeId) return node;

          const nextNode = { ...originalNode };
          // A line is deliberately a thin, mostly-flat bounding box (see
          // createNode's default of h:4) — the generic 60/40/30 minimums
          // used by the other shapes would force it to snap to a fat box
          // the instant a resize handle is touched, making it impossible
          // to keep the line thin/near-flat.
          const minW = node.shape === 'circle' ? 60 : node.shape === 'line' ? 20 : 40;
          const minH = node.shape === 'circle' ? 60 : node.shape === 'line' ? 2 : 30;

          if (handle.includes('e')) {
            nextNode.w = Math.max(minW, Math.round(point.x - originalNode.x));
          }
          if (handle.includes('s')) {
            nextNode.h = Math.max(minH, Math.round(point.y - originalNode.y));
          }
          if (handle.includes('w')) {
            const nextX = Math.min(originalNode.x + originalNode.w - minW, point.x);
            nextNode.x = Math.max(0, Math.round(nextX));
            nextNode.w = Math.max(minW, Math.round(originalNode.x + originalNode.w - nextNode.x));
          }
          if (handle.includes('n')) {
            const nextY = Math.min(originalNode.y + originalNode.h - minH, point.y);
            nextNode.y = Math.max(0, Math.round(nextY));
            nextNode.h = Math.max(minH, Math.round(originalNode.y + originalNode.h - nextNode.y));
          }

          if (node.shape === 'circle') {
            const size = Math.max(nextNode.w, nextNode.h, 60);
            if (handle.includes('w')) {
              nextNode.x = originalNode.x + originalNode.w - size;
            }
            if (handle.includes('n')) {
              nextNode.y = originalNode.y + originalNode.h - size;
            }
            nextNode.w = size;
            nextNode.h = size;
          }

          return nextNode;
        }));
        return;
      }

      if (draggingConnectionHandle.current) {
        const handleState = draggingConnectionHandle.current;
        if (!handleState) return;
        didDrag.current = true;
        const point = toCanvasPoint(event.clientX, event.clientY);
        const { connectionId, kind, end, segmentIndex } = handleState;

        // Dragging an endpoint. The cursor is projected onto the shape's
        // outline, so the anchor can land anywhere along the border rather
        // than snapping to one of four edge midpoints.
        if (kind === 'endpoint') {
          onConnectionsChange((prev) => prev.map((connection) => {
            if (connection.id !== connectionId) return connection;

            const node = nodes.find((n) => (
              n.id === (end === 'from' ? connection.from : connection.to)
            ));
            if (!node) return connection;

            const other = nodes.find((n) => (
              n.id === (end === 'from' ? connection.to : connection.from)
            ));
            if (!other) return connection;

            const anchor = nearestAnchor(node, point);
            const key = end === 'from' ? 'fromAnchor' : 'toAnchor';

            const resolved = end === 'from'
              ? resolveAnchors(connection, node, other)
              : resolveAnchors(connection, other, node);
            const previous = end === 'from' ? resolved.from : resolved.to;

            // Hand-placed waypoints are kept while the arrow still leaves from
            // the same side — sliding the anchor along one edge doesn't
            // invalidate the route. Moving to a different side does: the whole
            // shape of the route changes, so it's recomputed from scratch
            // rather than left bent around a path that no longer makes sense.
            const sideChanged = !previous || previous.side !== anchor.side;

            return {
              ...connection,
              [key]: anchor,
              // The legacy bare-side field has to go, or normalizeAnchor would
              // keep preferring it over the anchor just placed.
              ...(end === 'from' ? { fromSide: undefined } : { toSide: undefined }),
              ...(sideChanged ? { waypoints: undefined } : {}),
            };
          }));
          return;
        }

        // Dragging a segment sideways. Every move is applied to the route as
        // it was when the drag began — never to the route as it currently
        // renders. Rebuilding the route can insert or merge corners, so
        // measuring against the live version meant the segment index drifted
        // onto a different segment mid-gesture and each move baked the
        // rebuilt corners in as fresh waypoints.
        if (kind === 'segment') {
          const base = handleState.basePoints;
          if (!base) return;

          onConnectionsChange((prev) => prev.map((connection) => {
            if (connection.id !== connectionId) return connection;

            // The first and last segments are the stubs attached to the two
            // shapes. Perpendicular for them means "along the border", so
            // dragging one slides the anchor instead of bending the route.
            if (handleState.segmentKind === 'start' || handleState.segmentKind === 'end') {
              const isStart = handleState.segmentKind === 'start';
              const key = isStart ? 'fromAnchor' : 'toAnchor';
              const nodeId = isStart ? connection.from : connection.to;
              const node = nodes.find((n) => n.id === nodeId);

              if (!node) return connection;

              const toNode = nodes.find((n) => n.id === connection.to);
              const fromNode = nodes.find((n) => n.id === connection.from);
              if (!fromNode || !toNode) return connection;

              // resolveAnchors, not normalizeAnchor: an arrow that never
              // stored anchors still has the ones it is being DRAWN with, and
              // those are what the stub is attached to.
              const resolved = resolveAnchors(connection, fromNode, toNode);
              const anchor = isStart ? resolved.from : resolved.to;
              if (!anchor) return connection;

              return {
                ...connection,
                [key]: { side: anchor.side, t: anchorTForCursor(node, anchor.side, point) },
                ...(isStart ? { fromSide: undefined } : { toSide: undefined }),
              };
            }

            return { ...connection, waypoints: moveSegment(base, segmentIndex, point) };
          }));
          return;
        }

        onConnectionsChange((prev) => prev.map((connection) => (
          connection.id === connectionId
            ? { ...connection, controlPoint: { x: point.x, y: point.y } }
            : connection
        )));
        return;
      }

      if (selecting.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        setSelectionRect(getCanvasRectFromPoints(selecting.current.startPoint, point));
        return;
      }

      if (panning.current && wrapRef.current) {
        wrapRef.current.scrollLeft = panning.current.scrollLeft - (event.clientX - panning.current.startX);
        wrapRef.current.scrollTop = panning.current.scrollTop - (event.clientY - panning.current.startY);
      }
    };

    const onMouseUp = (event) => {
      const shouldCommitDrag = (Boolean(dragging.current) || Boolean(resizing.current) || Boolean(resizingLineEndpoint.current)) && didDrag.current;
      const shouldCommitConnection = Boolean(draggingConnectionHandle.current) && didDrag.current;

      if (drawingLine.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        const { start } = drawingLine.current;
        const dx = Math.abs(point.x - start.x);
        const dy = Math.abs(point.y - start.y);

        // A plain click with no real drag would otherwise produce an
        // invisible zero-length line — give it a short, visible default
        // length instead so the click still does something useful.
        if (dx < 4 && dy < 4) {
          onCreateLine(start.x, start.y, start.x + 120, start.y);
        } else {
          onCreateLine(start.x, start.y, point.x, point.y);
        }

        setActiveShape(null);
      }

      // Releasing over a second shape is what turns the dragged line into a
      // real elbow connection. Released anywhere else, the drag is simply
      // abandoned — no stray arrow is left behind.
      if (drawingElbow.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        const target = nodeAtPoint(point);
        const { fromId, fromAnchor } = drawingElbow.current;

        drawingElbow.current = null;
        setElbowPreview(null);

        if (target && target.id !== fromId) {
          onCreateArrowConnection(fromId, target.id, fromAnchor, nearestAnchor(target, point));
        }
      }

      // Releasing the button is what actually commits an eraser stroke —
      // everything marked during the swipe goes in one deletion (and so one
      // undo step).
      if (erasing.current) {
        const { nodeIds, connectionIds } = erasing.current;
        erasing.current = null;
        setErasePreview({ nodeIds: [], connectionIds: [] });

        if (nodeIds.size || connectionIds.size) {
          onErase(Array.from(nodeIds), Array.from(connectionIds));
        }
      }

      if (selecting.current) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        const finalRect = getCanvasRectFromPoints(selecting.current.startPoint, point);
        const ids = nodes
          .filter((node) => (
            node.x < finalRect.x + finalRect.w &&
            node.x + node.w > finalRect.x &&
            node.y < finalRect.y + finalRect.h &&
            node.y + node.h > finalRect.y
          ))
          .map((node) => node.id);
        onSelectNodes(ids);
      }
      // Tidy the route once the handle is released. Mid-drag this would
      // renumber the segments under the cursor; here it just removes the
      // corners the gesture left behind, so the handles the user sees next
      // match the shape of the line and don't multiply with every edit.
      const releasedHandle = draggingConnectionHandle.current;
      if (releasedHandle && releasedHandle.kind === 'segment'
        && releasedHandle.segmentKind === 'middle' && didDrag.current) {
        const { connectionId } = releasedHandle;
        onConnectionsChange((prev) => prev.map((connection) => {
          if (connection.id !== connectionId) return connection;

          const fromNode = nodes.find((n) => n.id === connection.from);
          const toNode = nodes.find((n) => n.id === connection.to);
          if (!fromNode || !toNode) return connection;

          return { ...connection, waypoints: settleWaypoints(connection, fromNode, toNode) };
        }));
      }

      dragging.current = null;
      resizing.current = null;
      resizingLineEndpoint.current = null;
      draggingConnectionHandle.current = null;
      panning.current = null;
      selecting.current = null;
      drawingLine.current = null;
      erasing.current = null;
      drawingElbow.current = null;
      setSelectionRect(null);
      setLinePreview(null);
      setElbowPreview(null);
      if (shouldCommitDrag) onNodeDragEnd();
      if (shouldCommitConnection) onConnectionControlEnd();
      didDrag.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [getCanvasRectFromPoints, nodes, onConnectionControlEnd, onConnectionsChange, onCreateLine, onErase, onNodeDragEnd, onNodesChange, onSelectNodes, setActiveShape, applyEraserAlongSegment, toCanvasPoint, nodeAtPoint, onCreateArrowConnection, arrowDefaults]);

  useEffect(() => {
    if (!activeSearchNodeId || !wrapRef.current) return;
    const target = wrapRef.current.querySelector(`[data-nodeid="${activeSearchNodeId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [activeSearchNodeId]);


  const handleNodeMouseDown = useCallback((event, nodeId) => {
    if (mode !== 'select' || readMode) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (event.ctrlKey || event.metaKey) return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    const isAlreadySelected = selectedIds.includes(nodeId);

    const dragIds = isAlreadySelected
      ? selectedIds
      : [nodeId];

    if (!isAlreadySelected) {
      onSelectNodes([nodeId]);
    }

    dragging.current = {
      nodeIds: dragIds,
      startPoint: point,
      originalPositions: Object.fromEntries(
        nodes
          .filter((item) => dragIds.includes(item.id))
          .map((item) => [item.id, { x: item.x, y: item.y, x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2 }])
      ),
    };
    didDrag.current = false;
    event.preventDefault();
  }, [mode, nodes, readMode, selectedIds, toCanvasPoint, onSelectNodes]);

  const handleResizeStart = useCallback((event, nodeId, handle) => {
    if (mode !== 'select' || readMode) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    resizing.current = {
      nodeId,
      handle,
      originalNode: { ...node },
    };
    didDrag.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, [mode, nodes, readMode]);

  // Dragging one of a selected line's two endpoint handles (see Node.jsx —
  // a line gets these two instead of the usual four corner resize handles).
  const handleLineEndpointDragStart = useCallback((event, nodeId, endpointIndex) => {
    if (mode !== 'select' || readMode) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    // Older line nodes (e.g. dropped in from the toolbar rather than
    // free-drawn) may not carry explicit x1/y1/x2/y2 yet — only a plain
    // bounding box. Synthesize endpoints from that box's own diagonal so
    // there's always a real "other end" to keep fixed while dragging this one.
    const originalNode = {
      ...node,
      x1: node.x1 ?? node.x,
      y1: node.y1 ?? node.y,
      x2: node.x2 ?? node.x + node.w,
      y2: node.y2 ?? node.y + node.h,
    };

    resizingLineEndpoint.current = { nodeId, endpointIndex, originalNode };
    didDrag.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, [mode, nodes, readMode]);

  const handleConnectionControlDragStart = useCallback((event, connectionId) => {
    if (readMode) return;
    draggingConnectionHandle.current = { connectionId, kind: 'control' };
    didDrag.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, [readMode]);

  // Both of these ride the same global mousemove/mouseup pair the control
  // point already used; only the `kind` differs, which is what the move
  // handler branches on.
  const handleConnectionEndpointDragStart = useCallback((event, connectionId, end) => {
    if (readMode) return;
    draggingConnectionHandle.current = { connectionId, kind: 'endpoint', end };
    didDrag.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, [readMode]);

  // basePoints is the route exactly as it was drawn at the moment the handle
  // was grabbed. Freezing it here is what keeps the gesture stable from
  // mousedown to mouseup.
  const handleConnectionSegmentDragStart = useCallback((
    event,
    connectionId,
    segmentIndex,
    basePoints,
    segmentKind,
  ) => {
    if (readMode) return;
    draggingConnectionHandle.current = {
      connectionId,
      kind: 'segment',
      segmentIndex,
      segmentKind,
      basePoints: basePoints ? basePoints.map((p) => ({ x: p.x, y: p.y })) : null,
    };
    didDrag.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, [readMode]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    if (readMode) return;

    // Image files dragged in from the desktop or another window. Checked
    // before the shape payload below, since a file drop carries no 'shape'
    // data and would otherwise just be ignored.
    const droppedImages = getImageFiles(event.dataTransfer);
    if (droppedImages.length) {
      placeImageFiles(droppedImages, toCanvasPoint(event.clientX, event.clientY), onCreateImage);
      return;
    }

    const shape = event.dataTransfer.getData('shape');
    if (!shape) return;

    const point = toCanvasPoint(event.clientX, event.clientY);
    onNodeDrop({
      id: uid(),
      shape,
      x: point.x - 80,
      // A default line is only 4px tall (see createNode) — offsetting it
      // by the same -36 used for a ~72-144px-tall shape would drop it well
      // above the cursor instead of centered on it.
      y: point.y - (shape === 'line' ? 2 : 36),
      w: shape === 'diamond' ? 200 : shape === 'circle' ? 120 : shape === 'oval' ? 180 : 160,
      h: shape === 'circle' ? 120 : shape === 'diamond' ? 120 : shape === 'oval' ? 110 : shape === 'text' ? 42 : shape === 'line' ? 4 : 72,
      // No placeholder "Text" caption on a freshly dropped shape — see
      // createNode in flowbuilder2.js for the matching change on the
      // click-to-place path.
      label: '',
      strokeColor: '#1f1f1f',
      fillColor: 'transparent',
      collapsed: false,
    });
    setActiveShape(null);
  }, [onNodeDrop, readMode, toCanvasPoint, onCreateImage, setActiveShape]);

  const handleCanvasMouseDown = useCallback((event) => {
    const clickedOnCanvasSurface =
      event.target === canvasRef.current || event.target.classList.contains(styles.grid);

    // Elbow arrow tool: the drag has to START on a shape, since that shape is
    // one end of the connection. Pressing empty canvas with the tool active
    // does nothing rather than beginning a line that can't become an arrow.
    if (mode === 'arrow' && !readMode) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      const sourceNode = nodeAtPoint(point);

      if (sourceNode) {
        drawingElbow.current = {
          fromId: sourceNode.id,
          start: point,
          // The edge the drag began on decides where the arrow leaves from.
          // Where on the border the drag began, not just which edge — so a
          // new arrow attaches exactly where the user grabbed.
          fromAnchor: nearestAnchor(sourceNode, point),
        };
        setElbowPreview({ points: [point, point], targetId: null });
      }

      event.preventDefault();
      return;
    }

    // Eraser: begin a stroke wherever the button goes down — including
    // directly on top of a shape, which is the normal way to start one.
    if (mode === 'erase' && !readMode) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      erasing.current = { lastPoint: point, nodeIds: new Set(), connectionIds: new Set() };
      applyEraserAlongSegment(point, point, event.altKey);
      event.preventDefault();
      return;
    }

    if (mode === 'pan') {
      if (!clickedOnCanvasSurface) return;
      panning.current = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: wrapRef.current?.scrollLeft || 0,
        scrollTop: wrapRef.current?.scrollTop || 0,
      };
      return;
    }

    // Line tool active: unlike every other shape, a line isn't placed as a
    // fixed default box on a single click — the user drags from wherever
    // they click to wherever they release, and that drag becomes the line's
    // two endpoints (finished in onMouseUp's drawingLine branch above).
    if (activeShape === 'line' && !readMode) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      drawingLine.current = { start: point };
      setLinePreview({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
      return;
    }

    // Shape tool active: create the new node wherever the user clicks,
    // even on top of / inside an existing node.
    if (activeShape && !readMode) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      onCreateNode(activeShape, point);
      setActiveShape(null);
      return;
    }

    if (!readMode && mode === 'select' && clickedOnCanvasSurface) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      selecting.current = { startPoint: point };
      setSelectionRect({ x: point.x, y: point.y, w: 0, h: 0 });
      onSelectNode(null);
    }
  }, [activeShape, mode, onCreateNode, onSelectNode, readMode, setActiveShape, toCanvasPoint, applyEraserAlongSegment, nodeAtPoint]);

  const handleContextMenu = useCallback((event) => {
    if (readMode) return;

    event.preventDefault();

    // Right-clicking a shape acts on THAT shape, and selects it first so the
    // menu's actions and the visible selection can't disagree.
    const nodeEl = event.target.closest?.('[data-nodeid]');
    const nodeId = nodeEl?.dataset?.nodeid || null;

    // Connections are SVG paths rather than nodes, so they're identified by
    // their own marker on the transparent hit stroke.
    const connEl = nodeId ? null : event.target.closest?.('[data-connid]');
    const connectionId = connEl?.dataset?.connid || null;

    if (nodeId && !selectedIds.includes(nodeId)) {
      onSelectNodes([nodeId]);
    }
    if (connectionId) {
      onSelectConnection(connectionId);
    }

    setContextMenu({ x: event.clientX, y: event.clientY, nodeId, connectionId });
  }, [readMode, selectedIds, onSelectNodes, onSelectConnection]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleCanvasDoubleClick = useCallback((event) => {
    // Erase mode must not spawn a free text node on a double-click — two
    // quick erase clicks in the same spot would otherwise leave new text
    // behind instead of removing things.
    if (readMode || mode === 'pan' || mode === 'erase') return;

    // If the double-click landed on (or inside) an existing node,
    // let that node handle its own edit behavior — don't spawn a new text node.
    if (event.target.closest('[data-nodeid]')) return;

    const point = toCanvasPoint(event.clientX, event.clientY);
    onCreateTextNode(point);
  }, [mode, onCreateTextNode, readMode, toCanvasPoint]);

  const handleWheel = useCallback((event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    onZoomChange((prev) => {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(2, Math.max(0.5, Number((prev + delta).toFixed(2))));
    });
  }, [onZoomChange]);

  function getNodeCenter(node) {
    return {
      x: node.x + node.w / 2,
      y: node.y + node.h / 2,
    };
  }

  function getChildSide(parent, child) {
    const parentCenter = getNodeCenter(parent);
    const childCenter = getNodeCenter(child);

    const dx = childCenter.x - parentCenter.x;
    const dy = childCenter.y - parentCenter.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    }

    return dy > 0 ? "bottom" : "top";
  }

  function collectBranchNodeIds(rootId, connections) {
    const visited = new Set();
    const queue = [rootId];

    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      connections.forEach((conn) => {
        if (conn.from === current && !visited.has(conn.to)) {
          queue.push(conn.to);
        }
      });
    }

    return visited;
  }
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  const hiddenNodeIds = new Set();

  if (readMode) {
    nodes.forEach((node) => {
      const collapsedSides = node.collapsedSides || {};

      connections.forEach((conn) => {
        if (conn.from !== node.id) return;

        const child = nodeMap[conn.to];
        if (!child) return;

        const side = getChildSide(node, child);

        if (collapsedSides[side]) {
          const subtreeIds = collectBranchNodeIds(child.id, connections);
          subtreeIds.forEach((id) => hiddenNodeIds.add(id));
        }
      });
    });
  }


  return (
    <div className={styles.canvasShell}>
      {sessionUserData?.ImageUrl && (
        <div className={styles.fixedLogoLayer}>
          <div
            className={styles.fixedLogo}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              height: "100%",
              backgroundImage: `url(${BASE_IMAGE_API_GET}${sessionUserData.ImageUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "60%",
              opacity: 0.08,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        </div>
      )}

      <div
        ref={wrapRef}
        className={styles.wrap}
        id="canvas-wrap"
        onWheel={handleWheel}
        style={{
          cursor: mode === "pan" ? "grab" : mode === "erase" ? "cell" : (mode === "arrow" || activeShape) ? "crosshair" : "default",
        }}
      >
        <div
          className={styles.viewport}
          style={{ width: BASE_WIDTH * zoom, height: BASE_HEIGHT * zoom }}
        >
          <div
            ref={canvasRef}
            className={styles.canvas}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseDown={handleCanvasMouseDown}
            onDoubleClick={handleCanvasDoubleClick}
            onContextMenu={handleContextMenu}
            style={{
              width: BASE_WIDTH,
              height: BASE_HEIGHT,
              transform: `scale(${zoom})`,
              background: canvasBg,
            }}
          >
            {showGrid && <div className={styles.grid} />}

            {selectionRect && (
              <div
                className={styles.selectionRect}
                style={{
                  left: selectionRect.x,
                  top: selectionRect.y,
                  width: selectionRect.w,
                  height: selectionRect.h,
                }}
              />
            )}

            {linePreview && (
              <svg
                width={BASE_WIDTH}
                height={BASE_HEIGHT}
                style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
              >
                <line
                  x1={linePreview.x1}
                  y1={linePreview.y1}
                  x2={linePreview.x2}
                  y2={linePreview.y2}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {elbowPreview && (() => {
              const points = elbowPreview.points;
              const target = elbowPreview.targetId
                ? nodes.find((node) => node.id === elbowPreview.targetId)
                : null;

              return (
                <svg
                  width={BASE_WIDTH}
                  height={BASE_HEIGHT}
                  style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                  <path
                    d={buildPolylinePath(points)}
                    // Colour and weight of the arrow that is about to be
                    // created, so the preview is a true picture of what lands
                    // on release rather than a generic blue line.
                    stroke={
                      arrowDefaults?.stroke ||
                      (theme === 'dark' ? STROKE_PALETTE.dark[3] : STROKE_PALETTE.light[3])
                    }
                    strokeWidth={arrowDefaults?.strokeWidth || CONNECTION_WIDTH}
                    fill="none"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Outlines the shape the arrow would land on, so it's
                      obvious before releasing whether the drop will take. */}
                  {target && (
                    <rect
                      x={target.x - 3}
                      y={target.y - 3}
                      width={target.w + 6}
                      height={target.h + 6}
                      rx={8}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  )}
                </svg>
              );
            })()}

            {(() => {
              const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
              const hiddenNodeIds = new Set();

              const collectChildren = (parentId) => {
                connections.forEach((connection) => {
                  if (connection.from === parentId && !hiddenNodeIds.has(connection.to)) {
                    hiddenNodeIds.add(connection.to);
                    collectChildren(connection.to);
                  }
                });
              };

              // Removed the `if (readMode)` gate — collapsed branches should stay
              // hidden regardless of read/edit mode, since the collapse toggle is
              // available in both.
              nodes.forEach((node) => {
                const collapsedSides = node.collapsedSides || {};

                Object.keys(collapsedSides).forEach((side) => {
                  if (!collapsedSides[side]) return;

                  connections.forEach((connection) => {
                    if (connection.from !== node.id) return;

                    const child = nodeMap[connection.to];
                    if (!child) return;

                    const childSide = getConnectionSide(node, child);

                    if (childSide === side) {
                      hiddenNodeIds.add(child.id);
                      collectChildren(child.id);
                    }
                  });
                });
              });

              const visibleNodes = stackedNodes.filter((node) => !hiddenNodeIds.has(node.id));

              const visibleConnections = connections.filter((connection) => {
                if (hiddenNodeIds.has(connection.from) || hiddenNodeIds.has(connection.to)) {
                  return false;
                }

                const fromNode = nodeMap[connection.from];
                const toNode = nodeMap[connection.to];

                if (!fromNode || !toNode) return false;

                const side = getConnectionSide(fromNode, toNode);
                return !fromNode.collapsedSides?.[side];
              });

              return (
                <>
                  {visibleConnections.map((connection) => (
                    <Connections
                      key={connection.id}
                      connection={connection}
                      nodes={visibleNodes}
                      theme={theme}
                      selected={selectedConnectionId === connection.id}
                      dimmed={
                        erasePreview.connectionIds.includes(connection.id) ||
                        (focusedNodeIds.length > 0 &&
                          (!focusedNodeIds.includes(connection.from) ||
                            !focusedNodeIds.includes(connection.to)))
                      }
                      onSelectConnection={onSelectConnection}
                      onControlPointDragStart={handleConnectionControlDragStart}
                      onEndpointDragStart={handleConnectionEndpointDragStart}
                      onSegmentDragStart={handleConnectionSegmentDragStart}
                      onDeleteConnection={onDeleteConnection}
                      onLabelChange={onConnectionLabelChange}
                    />
                  ))}

                  {visibleNodes.map((node) => {
                    const sideControls = ["top", "right", "bottom", "left"]
                      .map((side) => {
                        const hasChildren = connections.some((connection) => {
                          if (connection.from !== node.id) return false;
                          const child = nodeMap[connection.to];
                          return child ? getConnectionSide(node, child) === side : false;
                        });

                        return hasChildren
                          ? { side, collapsed: Boolean(node.collapsedSides?.[side]) }
                          : null;
                      })
                      .filter(Boolean);

                    return (
                      <Node
                        key={node.id}
                        node={node}
                        layer={stacking.layers[node.id]}
                        sideControls={sideControls}
                        dimmed={
                          readMode &&
                          focusedNodeIds.length > 0 &&
                          !focusedNodeIds.includes(node.id)
                        }
                        searchMatched={matchedNodeIds.includes(node.id)}
                        searchActive={activeSearchNodeId === node.id}
                        onToggle={onToggle}
                        selected={selectedIds.includes(node.id)}
                        mode={mode}
                        connectFrom={connectFrom}
                        onMouseDown={handleNodeMouseDown}
                        onResizeStart={handleResizeStart}
                        onLineEndpointDragStart={handleLineEndpointDragStart}
                        onSelect={onSelectNode}
                        onConnect={onConnect}
                        onQuickCreateFromNode={onQuickCreateFromNode}
                        onReadModeDoubleClick={onFocusBranch}
                        onLabelChange={onLabelChange}
                        onTextsChange={onTextsChange}
                        onAutoResize={onAutoResize}
                        markedForErase={erasePreview.nodeIds.includes(node.id)}
                        autoEdit={autoEditNodeId === node.id}
                        onAutoEditConsumed={onAutoEditConsumed}
                        readMode={readMode}
                        theme={theme}
                      />
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {contextMenu && (() => {
        const targetNode = contextMenu.nodeId
          ? nodes.find((node) => node.id === contextMenu.nodeId)
          : null;
        const isTextNode = targetNode?.shape === 'text';

        const targetConnection = contextMenu.connectionId
          ? connections.find((c) => c.id === contextMenu.connectionId)
          : null;

        const items = [];

        if (targetConnection) {
          items.push({
            label: 'Delete',
            shortcut: 'Del',
            danger: true,
            onClick: () => onDeleteConnection(targetConnection.id),
          });

          return (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              items={items}
              theme={theme}
              onClose={closeContextMenu}
            />
          );
        }

        // Only meaningful for a free text node — everything else already has a
        // container. Shown greyed rather than hidden so the menu doesn't
        // reshuffle depending on what was clicked.
        if (targetNode) {
          items.push({
            label: 'Wrap text in a container',
            disabled: !isTextNode,
            onClick: () => onWrapTextInContainer(contextMenu.nodeId),
          });
          items.push({ separator: true });
          items.push({
            label: 'Bring to front',
            onClick: () => onChangeNodeLayer(contextMenu.nodeId, 'front'),
          });
          items.push({
            label: 'Send to back',
            onClick: () => onChangeNodeLayer(contextMenu.nodeId, 'back'),
          });
          items.push({ separator: true });
          items.push({
            label: 'Delete',
            shortcut: 'Del',
            danger: true,
            onClick: () => onErase([contextMenu.nodeId], []),
          });
        } else {
          items.push({
            label: 'Add text here',
            onClick: () => onCreateTextNode(toCanvasPoint(contextMenu.x, contextMenu.y)),
          });
          items.push({
            label: 'Insert image...',
            onClick: async () => {
              const files = await pickImageFiles();
              if (!files.length) return;
              placeImageFiles(files, toCanvasPoint(contextMenu.x, contextMenu.y), onCreateImage);
            },
          });
        }

        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={items}
            theme={theme}
            onClose={closeContextMenu}
          />
        );
      })()}
    </div>
  );
}