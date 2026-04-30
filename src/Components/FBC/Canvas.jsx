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
  theme,
  mode,
  activeShape,
  connectFrom,
  onNodesChange,
  onNodeDrop,
  onCreateNode,
  onToggle,
  onSelectNode,
  onConnect,
  onLabelChange,
  onQuickCreateFromNode,
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
  const dragOffset = useRef({ x: 0, y: 0 });
  const panning = useRef(null);
  const didDrag = useRef(false);

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
        didDrag.current = true;
        const point = toCanvasPoint(event.clientX, event.clientY);
        onNodesChange((prev) => prev.map((node) => (
          node.id === dragging.current
            ? {
              ...node,
              x: Math.max(0, Math.round(point.x - dragOffset.current.x)),
              y: Math.max(0, Math.round(point.y - dragOffset.current.y)),
            }
            : node
        )));
        return;
      }

      if (panning.current && wrapRef.current) {
        wrapRef.current.scrollLeft = panning.current.scrollLeft - (event.clientX - panning.current.startX);
        wrapRef.current.scrollTop = panning.current.scrollTop - (event.clientY - panning.current.startY);
      }
    };

    const onMouseUp = () => {
      dragging.current = null;
      panning.current = null;
      didDrag.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onNodesChange, toCanvasPoint]);

  const handleNodeMouseDown = useCallback((event, nodeId) => {
    if (mode !== 'select' || readMode) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    dragging.current = nodeId;
    didDrag.current = false;
    dragOffset.current = {
      x: point.x - node.x,
      y: point.y - node.y,
    };
    event.preventDefault();
  }, [mode, nodes, readMode, toCanvasPoint]);

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

    if (activeShape && !readMode) {
      const point = toCanvasPoint(event.clientX, event.clientY);
      onCreateNode(activeShape, point);
      return;
    }

    if (!readMode) onSelectNode(null);
  }, [activeShape, mode, onCreateNode, onSelectNode, readMode, toCanvasPoint]);

  const handleWheel = useCallback((event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    onZoomChange((prev) => {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(2, Math.max(0.5, Number((prev + delta).toFixed(2))));
    });
  }, [onZoomChange]);

  const isVisible = useCallback((node) => {
    let current = node;

    while (true) {
      const parentConnection = connections.find((connection) => connection.to === current.id);
      if (!parentConnection) return true;

      const parent = nodes.find((item) => item.id === parentConnection.from);
      if (!parent) return false;
      const side = getConnectionSide(parent, current);
      if (parent.collapsedSides?.[side]) return false;
      current = parent;
    }
  }, [connections, nodes]);

  return (
    <div className={styles.canvasShell}>
      {sessionUserData?.ImageUrl && (
        <div className={styles.fixedLogoLayer}>
          <div
            className={styles.fixedLogo}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              backgroundImage: `url(${BASE_IMAGE_API_GET}${sessionUserData.ImageUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: '60%',
              opacity: 0.08,
              pointerEvents: 'none',
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
          cursor: mode === 'pan' ? 'grab' : activeShape ? 'crosshair' : 'default',
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
            style={{
              width: BASE_WIDTH,
              height: BASE_HEIGHT,
              transform: `scale(${zoom})`,
              background: canvasBg,
            }}
          >

            {/* ✅ GRID TOGGLE */}
            {showGrid && <div className={styles.grid} />}

            {connections
              .filter((connection) => {
                const fromNode = nodes.find((node) => node.id === connection.from);
                const toNode = nodes.find((node) => node.id === connection.to);

                if (!fromNode || !toNode) return false;

                const side = getConnectionSide(fromNode, toNode);
                return !fromNode.collapsedSides?.[side] && isVisible(toNode);
              })
              .map((connection) => (
                <Connections
                  key={connection.id}
                  connection={connection}
                  nodes={nodes}
                  theme={theme}
                  onDeleteConnection={onDeleteConnection}
                />
              ))}

            {nodes.map((node) => {
              const sideControls = ['top', 'right', 'bottom', 'left']
                .map((side) => {
                  const hasChildren = connections.some((connection) => {
                    if (connection.from !== node.id) return false;
                    const child = nodes.find((item) => item.id === connection.to);
                    return child ? getConnectionSide(node, child) === side : false;
                  });

                  return hasChildren
                    ? { side, collapsed: Boolean(node.collapsedSides?.[side]) }
                    : null;
                })
                .filter(Boolean);

              return isVisible(node) ? (
                <Node
                  key={node.id}
                  node={node}
                  sideControls={sideControls}
                  onToggle={onToggle}
                  selected={selectedId === node.id}
                  mode={mode}
                  connectFrom={connectFrom}
                  onMouseDown={handleNodeMouseDown}
                  onSelect={onSelectNode}
                  onConnect={onConnect}
                  onQuickCreateFromNode={onQuickCreateFromNode}
                  onLabelChange={onLabelChange}
                  readMode={readMode}
                  theme={theme}
                />
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}