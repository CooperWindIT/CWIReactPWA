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
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragging = useRef(null);
  const panning = useRef(null);
  const selecting = useRef(null);
  const resizing = useRef(null);
  const draggingConnectionHandle = useRef(null);
  const didDrag = useRef(false);
  const [selectionRect, setSelectionRect] = React.useState(null);

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
          return original
            ? {
              ...node,
              x: Math.max(0, Math.round(original.x + deltaX)),
              y: Math.max(0, Math.round(original.y + deltaY)),
            }
            : node;
        }));
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
          const minW = node.shape === 'circle' ? 60 : 40;
          const minH = node.shape === 'circle' ? 60 : 30;

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
      const shouldCommitDrag = (Boolean(dragging.current) || Boolean(resizing.current)) && didDrag.current;
      const shouldCommitConnection = Boolean(draggingConnectionHandle.current) && didDrag.current;
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
      draggingConnectionHandle.current = null;
      panning.current = null;
      selecting.current = null;
      setSelectionRect(null);
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
  }, [getCanvasRectFromPoints, nodes, onConnectionControlEnd, onConnectionsChange, onNodeDragEnd, onNodesChange, onSelectNodes, toCanvasPoint]);

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
    const dragIds = selectedIds.includes(nodeId) ? selectedIds : [nodeId];
    dragging.current = {
      nodeIds: dragIds,
      startPoint: point,
      originalPositions: Object.fromEntries(
        nodes
          .filter((item) => dragIds.includes(item.id))
          .map((item) => [item.id, { x: item.x, y: item.y }])
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
      y: point.y - 36,
      w: shape === 'diamond' ? 200 : shape === 'circle' ? 120 : 160,
      h: shape === 'circle' ? 120 : shape === 'diamond' ? 120 : shape === 'text' ? 42 : 72,
      label: "Text",
      strokeColor: '#1f1f1f',
      fillColor: 'transparent',
      collapsed: false,
    });
    setActiveShape(null);
  }, [onNodeDrop, readMode, toCanvasPoint]);

  const handleCanvasMouseDown = useCallback((event) => {
    if (event.target !== canvasRef.current && !event.target.classList.contains(styles.grid)) return;

    if (mode === 'pan') {
      panning.current = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: wrapRef.current?.scrollLeft || 0,
        scrollTop: wrapRef.current?.scrollTop || 0,
      };
      return;
    }

    // if (activeShape && !readMode) {
    //   const point = toCanvasPoint(event.clientX, event.clientY);
    //   onCreateNode(activeShape, point);
    //   return;
    // }

    if (activeShape && !readMode) {
      const point = toCanvasPoint(event.clientX, event.clientY);
  
      onCreateNode(activeShape, point);
  
      // Automatically switch back to Select tool
      setActiveShape(null);
  
      return;
  }

    if (!readMode && mode === 'select') {
      const point = toCanvasPoint(event.clientX, event.clientY);
      selecting.current = { startPoint: point };
      setSelectionRect({ x: point.x, y: point.y, w: 0, h: 0 });
      onSelectNode(null);
    }
  }, [activeShape, mode, onCreateNode, onSelectNode, readMode, toCanvasPoint]);

  const handleCanvasDoubleClick = useCallback((event) => {
    if (readMode) return;
    if (event.target !== canvasRef.current && !event.target.classList.contains(styles.grid)) return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    onCreateTextNode(point);
  }, [onCreateTextNode, readMode, toCanvasPoint]);

  const handleWheel = useCallback((event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    onZoomChange((prev) => {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(2, Math.max(0.5, Number((prev + delta).toFixed(2))));
    });
  }, [onZoomChange]);

  // const isVisible = useCallback((node) => {
  //   let current = node;

  //   while (true) {
  //     const parentConnection = connections.find((connection) => connection.to === current.id);
  //     if (!parentConnection) return true;

  //     const parent = nodes.find((item) => item.id === parentConnection.from);
  //     if (!parent) return false;
  //     const side = getConnectionSide(parent, current);
  //     if (parent.collapsedSides?.[side]) return false;
  //     current = parent;
  //   }
  // }, [connections, nodes]);

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

  if (readMode) {
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
  }

  const visibleNodes = readMode
    ? nodes.filter((node) => !hiddenNodeIds.has(node.id))
    : nodes;

  const visibleConnections = readMode
    ? connections.filter((connection) => {
        if (hiddenNodeIds.has(connection.from) || hiddenNodeIds.has(connection.to)) {
          return false;
        }

        const fromNode = nodeMap[connection.from];
        const toNode = nodeMap[connection.to];

        if (!fromNode || !toNode) return false;

        const side = getConnectionSide(fromNode, toNode);
        return !fromNode.collapsedSides?.[side];
      })
    : connections;

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
