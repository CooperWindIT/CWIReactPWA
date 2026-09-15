import React, { useRef, useCallback, useEffect } from 'react';
import Node from './Node';
import Connections from './Connections';
import styles from './Canvas.module.css';
import { uid } from './Geometry';
import { BASE_IMAGE_API_GET } from '../Config/Config';

const BASE_WIDTH = 3200;
const BASE_HEIGHT = 2400;

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
  onNodeDragEnd,
  onToggle,
  onSelectNode,
  onSelectNodes,
  onSelectConnection,
  onConnect,
  onLabelChange,
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
  const didDrag = useRef(false);
  const [selectionRect, setSelectionRect] = React.useState(null);
  // Live preview of the line being drawn, in absolute canvas coordinates —
  // rendered as a dashed line that tracks the cursor until mouseup.
  const [linePreview, setLinePreview] = React.useState(null);

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
  }, [readMode, selectedIds, onLabelChange, onNodeDrop]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

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
        const { connectionId } = handleState;
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
      dragging.current = null;
      resizing.current = null;
      resizingLineEndpoint.current = null;
      draggingConnectionHandle.current = null;
      panning.current = null;
      selecting.current = null;
      drawingLine.current = null;
      setSelectionRect(null);
      setLinePreview(null);
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
  }, [getCanvasRectFromPoints, nodes, onConnectionControlEnd, onConnectionsChange, onCreateLine, onNodeDragEnd, onNodesChange, onSelectNodes, setActiveShape, toCanvasPoint]);

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
    // const dragIds = selectedIds.includes(nodeId) ? selectedIds : [nodeId];
    const isAlreadySelected = selectedIds.includes(nodeId);

const dragIds = isAlreadySelected
    ? selectedIds
    : [nodeId];

if (!isAlreadySelected) {
    onSelectNodes([nodeId]);   // <-- important
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
  }, [mode, nodes, readMode, selectedIds, toCanvasPoint]);

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
    draggingConnectionHandle.current = { connectionId };
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
      w: shape === 'diamond' ? 200 : shape === 'circle' ? 120 : 160,
      h: shape === 'circle' ? 120 : shape === 'diamond' ? 120 : shape === 'text' ? 42 : shape === 'line' ? 4 : 72,
      label: shape === 'line' ? '' : 'Text',
      strokeColor: '#1f1f1f',
      fillColor: 'transparent',
      collapsed: false,
    });
    setActiveShape(null);
  }, [onNodeDrop, readMode, toCanvasPoint]);

  const handleCanvasMouseDown = useCallback((event) => {
    const clickedOnCanvasSurface =
      event.target === canvasRef.current || event.target.classList.contains(styles.grid);

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
  }, [activeShape, mode, onCreateNode, onSelectNode, readMode, setActiveShape, toCanvasPoint]);

  const handleCanvasDoubleClick = useCallback((event) => {
    if (readMode || mode === 'pan') return;

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
          cursor: mode === "pan" ? "grab" : activeShape ? "crosshair" : "default",
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

              const visibleNodes = nodes.filter((node) => !hiddenNodeIds.has(node.id));

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
                        focusedNodeIds.length > 0 &&
                        (!focusedNodeIds.includes(connection.from) ||
                          !focusedNodeIds.includes(connection.to))
                      }
                      onSelectConnection={onSelectConnection}
                      onControlPointDragStart={handleConnectionControlDragStart}
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
    </div>
  );
}