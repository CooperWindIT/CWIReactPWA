import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import PropertiesPanel from './PropertiesPanel';
import Toast from './Toast';
import { useFiles } from './hooks/useFiles';
import { uid, snapshot } from './Geometry';
import './flow.css';
import { useNavigate } from 'react-router-dom';

const DEFAULT_STROKE = 'theme-auto';
const DEFAULT_FILL = 'transparent';
const DEFAULT_THEME = 'light';
const DEFAULT_FONT_FAMILY = 'Segoe UI';
const DEFAULT_FONT_SIZE = 16;
const ZOOM_STEPS = [50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];
const DEFAULT_COLLAPSED_SIDES = { top: false, right: false, bottom: false, left: false };

const DEFAULT_NODES = [
  { id: uid(), shape: 'rounded', x: 534, y: 127, w: 160, h: 64, label: 'Start', strokeColor: DEFAULT_STROKE, fillColor: DEFAULT_FILL, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } },
  { id: uid(), shape: 'rect', x: 533, y: 252, w: 160, h: 64, label: 'Process', strokeColor: DEFAULT_STROKE, fillColor: DEFAULT_FILL, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } },
  { id: uid(), shape: 'diamond', x: 480, y: 372, w: 268, h: 148, label: 'Start with your idea', strokeColor: DEFAULT_STROKE, fillColor: DEFAULT_FILL, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } },
  { id: uid(), shape: 'rounded', x: 534, y: 576, w: 160, h: 64, label: 'End', strokeColor: DEFAULT_STROKE, fillColor: DEFAULT_FILL, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } },
  { id: uid(), shape: 'rect', x: 860, y: 248, w: 160, h: 64, label: 'Intermediate', strokeColor: DEFAULT_STROKE, fillColor: DEFAULT_FILL, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } },
  { id: uid(), shape: 'rect', x: 1150, y: 247, w: 160, h: 64, label: 'Exit', strokeColor: DEFAULT_STROKE, fillColor: DEFAULT_FILL, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } },
];

const LEGACY_COLOR_MAP = {
  'c-blue': { strokeColor: '#1971c2', fillColor: '#d0ebff' },
  'c-green': { strokeColor: '#2f9e44', fillColor: '#d3f9d8' },
  'c-amber': { strokeColor: '#f08c00', fillColor: '#fff3bf' },
  'c-red': { strokeColor: '#e03131', fillColor: '#fdeaea' },
  'c-purple': { strokeColor: '#7048e8', fillColor: '#e5dbff' },
};

function makeDefaultConnections(nodes) {
  return [
    { id: uid(), from: nodes[0].id, to: nodes[1].id },
    { id: uid(), from: nodes[1].id, to: nodes[2].id },
    { id: uid(), from: nodes[2].id, to: nodes[3].id },
    { id: uid(), from: nodes[1].id, to: nodes[4].id },
    { id: uid(), from: nodes[4].id, to: nodes[5].id },
  ];
}

function createNode(shape, x, y) {
  const sizeMap = {
    rect: { w: 160, h: 72 },
    rounded: { w: 160, h: 72 },
    diamond: { w: 200, h: 120 },
    circle: { w: 120, h: 120 },
    parallelogram: { w: 180, h: 82 },
    hexagon: { w: 180, h: 88 },
    cylinder: { w: 160, h: 88 },
    text: { w: 180, h: 42 },
  };

  const labelMap = {
    rect: 'Rectangle',
    rounded: 'Rounded',
    diamond: 'Decision',
    circle: 'Circle',
    parallelogram: 'Input / Output',
    hexagon: 'Hexagon',
    cylinder: 'Database',
    text: 'Text',
  };

  const size = sizeMap[shape] || sizeMap.rect;

  return {
    id: uid(),
    shape,
    x: Math.round(x - size.w / 2),
    y: Math.round(y - size.h / 2),
    w: size.w,
    h: size.h,
    label: 'Text',
    strokeColor: DEFAULT_STROKE,
    fillColor: DEFAULT_FILL,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: shape === 'text' ? 20 : DEFAULT_FONT_SIZE,
    collapsed: false,
    collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
  };
}

function createChildNodeFromSource(sourceNode, position) {
  const gap = 120;
  let x = sourceNode.x;
  let y = sourceNode.y;

  if (position === 'top') {
    x = sourceNode.x + sourceNode.w / 2;
    y = sourceNode.y - gap;
  } else if (position === 'right') {
    x = sourceNode.x + sourceNode.w + gap;
    y = sourceNode.y + sourceNode.h / 2;
  } else if (position === 'bottom') {
    x = sourceNode.x + sourceNode.w / 2;
    y = sourceNode.y + sourceNode.h + gap;
  } else if (position === 'left') {
    x = sourceNode.x - gap;
    y = sourceNode.y + sourceNode.h / 2;
  }

  return {
    ...createNode(sourceNode.shape, x, y),
    w: sourceNode.w,
    h: sourceNode.h,
    strokeColor: sourceNode.strokeColor || DEFAULT_STROKE,
    fillColor: sourceNode.fillColor || DEFAULT_FILL,
    fontFamily: sourceNode.fontFamily || DEFAULT_FONT_FAMILY,
    fontSize: sourceNode.fontSize || DEFAULT_FONT_SIZE,
    label: 'Text',
    collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
  };
}

function normalizeNode(node) {
  const legacyColors = LEGACY_COLOR_MAP[node.color] || {};

  const shouldUseAutoStroke =
    !node.strokeColor ||
    node.strokeColor === 'theme-auto' ||
    node.strokeColor === '#1f1f1f' ||
    node.strokeColor === '#ffffff';

  return {
    strokeColor: DEFAULT_STROKE,
    fillColor: DEFAULT_FILL,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: DEFAULT_FONT_SIZE,
    collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
    ...legacyColors,
    ...node,
    strokeColor: shouldUseAutoStroke ? DEFAULT_STROKE : (node.strokeColor || legacyColors.strokeColor || DEFAULT_STROKE),
    fillColor: node.fillColor || legacyColors.fillColor || DEFAULT_FILL,
    fontFamily: node.fontFamily || DEFAULT_FONT_FAMILY,
    fontSize: Math.max(10, Number(node.fontSize || DEFAULT_FONT_SIZE)),
    collapsedSides: { ...DEFAULT_COLLAPSED_SIDES, ...(node.collapsedSides || {}) },
  };
}

function stepZoom(current, direction) {
  const percent = Math.round(current * 100);
  const currentIndex = ZOOM_STEPS.findIndex((value) => value >= percent);
  const safeIndex = currentIndex === -1 ? ZOOM_STEPS.length - 1 : currentIndex;

  if (direction > 0) {
    const nextIndex = ZOOM_STEPS.findIndex((value) => value > percent);
    return (ZOOM_STEPS[nextIndex === -1 ? safeIndex : nextIndex] || percent) / 100;
  }

  for (let index = safeIndex; index >= 0; index -= 1) {
    if (ZOOM_STEPS[index] < percent) return ZOOM_STEPS[index] / 100;
  }

  return ZOOM_STEPS[0] / 100;
}

export default function FlowBuilderC() {
  const deletedConnectionsRef = useRef(new Set());
  const history = useRef([]);
  const historyIdx = useRef(-1);

  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('select');
  const [activeShape, setActiveShape] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [fileName, setFileName] = useState('Untitled diagram');
  const [toast, setToast] = useState('');
  const [readMode, setReadMode] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [zoom, setZoom] = useState(0.9);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [canvasBg, setCanvasBg] = useState(null);
  const [sessionUserData, setSessionUserData] = useState(null);

  const navigate = useNavigate();

  const pushHistory = useCallback((n, c) => {
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(snapshot(n, c));
    if (history.current.length > 60) history.current.shift();
    historyIdx.current = history.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    const snap = history.current[historyIdx.current];
    setNodes(snap.nodes);
    setConnections(snap.connections);
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current += 1;
    const snap = history.current[historyIdx.current];
    setNodes(snap.nodes);
    setConnections(snap.connections);
    setSelectedId(null);
  }, []);

  const { files, currentFileId, setCurrentFileId, saveFile, saveFileWithPdf, newFile, getFile, deleteFile } = useFiles();

  const handleSave = useCallback(() => {
    const updatedConnections = connections.map((connection) => ({ ...connection, isNew: false }));
    setConnections(updatedConnections);
    saveFileWithPdf(currentFileId, fileName, nodes, updatedConnections);
    setToast('Saved as PDF!');
  }, [connections, currentFileId, fileName, nodes, saveFileWithPdf]);

  const resetWithDefaultDiagram = useCallback((fileId) => {
    const defaultNodes = DEFAULT_NODES.map((node) => ({ ...node, id: uid() }));
    const defaultConnections = makeDefaultConnections(defaultNodes);
    setNodes(defaultNodes);
    setConnections(defaultConnections);
    setFileName('Untitled diagram');
    setSelectedId(null);
    setMode('select');
    setActiveShape(null);
    setConnectFrom(null);
    setCurrentFileId(fileId);
    history.current = [snapshot(defaultNodes, defaultConnections)];
    historyIdx.current = 0;
  }, [setCurrentFileId]);

  const handleNewFile = useCallback(() => {
    if (currentFileId) saveFile(currentFileId, fileName, nodes, connections);
    const file = newFile();
    resetWithDefaultDiagram(file.id);
  }, [connections, currentFileId, fileName, newFile, nodes, resetWithDefaultDiagram, saveFile]);

  const handleLoadFile = useCallback((id) => {
    if (id === currentFileId) return;
    if (currentFileId) saveFile(currentFileId, fileName, nodes, connections);

    const file = getFile(id);
    if (!file) return;

    const loadedNodes = (file.nodes || []).map(normalizeNode);
    const loadedConnections = (file.connections || []).map((connection) => ({ ...connection, isNew: false }));

    setNodes(loadedNodes);
    setConnections(loadedConnections);
    setFileName(file.name || 'Untitled diagram');
    setSelectedId(null);
    setMode('select');
    setActiveShape(null);
    setConnectFrom(null);
    setCurrentFileId(id);
    history.current = [snapshot(loadedNodes, loadedConnections)];
    historyIdx.current = 0;
  }, [connections, currentFileId, fileName, getFile, nodes, saveFile, setCurrentFileId]);

  useEffect(() => {
    if (files.length > 0 && currentFileId) {
      const file = getFile(currentFileId);
      if (file) {
        const loadedNodes = (file.nodes || []).map(normalizeNode);
        setNodes(loadedNodes);
        setConnections(file.connections || []);
        setFileName(file.name || 'Untitled diagram');
        history.current = [snapshot(loadedNodes, file.connections || [])];
        historyIdx.current = 0;
        return;
      }
    }

    const defaultNodes = DEFAULT_NODES.map((node) => ({ ...node, id: uid() }));
    const defaultConnections = makeDefaultConnections(defaultNodes);
    setNodes(defaultNodes);
    setConnections(defaultConnections);
    history.current = [snapshot(defaultNodes, defaultConnections)];
    historyIdx.current = 0;
  }, [currentFileId, files.length, getFile]);

  const handleGridToggle = () => {
    setShowGrid((prev) => !prev);
  };

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode);
    setActiveShape(null);
    if (nextMode === 'select' || nextMode === 'pan') {
      setConnectFrom(null);
    }
  }, []);

  const handleShapeSelect = useCallback((shapeId) => {
    setActiveShape((prev) => (prev === shapeId ? null : shapeId));
    setMode('select');
    setConnectFrom(null);
    setSelectedId(null);
  }, []);

  const appendNode = useCallback((newNode) => {
    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, newNode];

      setConnections((prevConnections) => {
        let nextConnections = prevConnections;

        if (prevNodes.length > 0) {
          const lastNodeId = prevNodes[prevNodes.length - 1].id;
          const alreadyExists = prevConnections.some((connection) => connection.from === lastNodeId && connection.to === newNode.id);

          if (!alreadyExists) {
            const key = `${lastNodeId}->${newNode.id}`;
            const isNew = !deletedConnectionsRef.current.has(key);
            nextConnections = [
              ...prevConnections,
              { id: uid(), from: lastNodeId, to: newNode.id, ...(isNew ? { isNew: true } : {}) },
            ];
            if (!isNew) deletedConnectionsRef.current.delete(key);
          }
        }

        pushHistory(nextNodes, nextConnections);
        return nextConnections;
      });

      return nextNodes;
    });
  }, [pushHistory]);

  const handleCanvasCreateNode = useCallback((shape, position) => {
    if (readMode) return;
    appendNode(createNode(shape, position.x, position.y));
  }, [appendNode, readMode]);

  const handleQuickCreateFromNode = useCallback((sourceNodeId, position) => {
    if (readMode) return;

    setNodes((prevNodes) => {
      const sourceNode = prevNodes.find((node) => node.id === sourceNodeId);
      if (!sourceNode) return prevNodes;

      const newNode = createChildNodeFromSource(sourceNode, position);
      const nextNodes = [...prevNodes, newNode];

      setConnections((prevConnections) => {
        const nextConnections = [
          ...prevConnections,
          { id: uid(), from: sourceNodeId, to: newNode.id, isNew: true },
        ];
        pushHistory(nextNodes, nextConnections);
        return nextConnections;
      });

      return nextNodes;
    });
  }, [pushHistory, readMode]);

  const handleConnect = useCallback((nodeId) => {
    setMode('connect');
    setActiveShape(null);
    setConnectFrom((prev) => {
      if (!prev) return nodeId;
      if (prev === nodeId) return null;

      setConnections((currentConnections) => {
        const key = `${prev}->${nodeId}`;
        const isNew = !deletedConnectionsRef.current.has(key);
        const nextConnections = [...currentConnections, { id: uid(), from: prev, to: nodeId, ...(isNew ? { isNew: true } : {}) }];

        if (!isNew) deletedConnectionsRef.current.delete(key);
        setNodes((currentNodes) => {
          pushHistory(currentNodes, nextConnections);
          return currentNodes;
        });

        return nextConnections;
      });

      setMode('select');
      return null;
    });
  }, [pushHistory]);

  const handleNodesChange = useCallback((updater) => {
    setNodes((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const handleNodeDrop = useCallback((newNode) => {
    if (readMode) return;
    appendNode({
      ...normalizeNode(newNode),
      collapsed: newNode.collapsed || false,
    });
  }, [appendNode, readMode]);

  const handleLabelChange = useCallback((id, label) => {
    setNodes((prev) => {
      const next = prev.map((node) => (node.id === id ? { ...node, label } : node));
      pushHistory(next, connections);
      return next;
    });
  }, [connections, pushHistory]);

  const handleSelectNode = useCallback((id) => {
    if (readMode) return;
    setSelectedId(id);
  }, [readMode]);

  const handleUpdateNode = useCallback((updates) => {
    setNodes((prev) => {
      const next = prev.map((node) => (
        node.id === selectedId
          ? { ...node, ...updates }
          : node
      ));
      pushHistory(next, connections);
      return next;
    });
  }, [connections, pushHistory, selectedId]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedId) return;

    setNodes((prevNodes) => {
      const nextNodes = prevNodes.filter((node) => node.id !== selectedId);
      setConnections((prevConnections) => {
        const nextConnections = prevConnections.filter((connection) => connection.from !== selectedId && connection.to !== selectedId);
        pushHistory(nextNodes, nextConnections);
        return nextConnections;
      });
      return nextNodes;
    });

    setSelectedId(null);
  }, [pushHistory, selectedId]);

  const handleDeleteConnection = useCallback((id) => {
    setConnections((prevConnections) => {
      const connection = prevConnections.find((item) => item.id === id);
      const nextConnections = prevConnections.filter((item) => item.id !== id);
      if (connection) deletedConnectionsRef.current.add(`${connection.from}->${connection.to}`);
      pushHistory(nodes, nextConnections);
      return nextConnections;
    });
  }, [nodes, pushHistory]);

  const expandAll = useCallback(() => {
    setNodes((prev) => prev.map((node) => ({
      ...node,
      collapsed: false,
      collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
    })));
  }, []);

  const collapseAll = useCallback(() => {
    setNodes((prev) => prev.map((node) => ({
      ...node,
      collapsed: true,
      collapsedSides: { top: true, right: true, bottom: true, left: true },
    })));
  }, []);

  const handleToggleReadMode = useCallback(() => {
    setReadMode((prev) => {
      const nextReadMode = !prev;
      setSelectedId(null);
      setMode('select');
      setActiveShape(null);
      setConnectFrom(null);
      if (nextReadMode) {
        collapseAll();
      } else {
        expandAll();
      }
      return nextReadMode;
    });
  }, [collapseAll, expandAll]);

  const handleToggleNode = useCallback((id, side) => {
    setNodes((prev) => prev.map((node) => {
      if (node.id !== id) return node;

      if (!side) {
        const nextCollapsed = !node.collapsed;
        const nextCollapsedSides = nextCollapsed
          ? { top: true, right: true, bottom: true, left: true }
          : { ...DEFAULT_COLLAPSED_SIDES };

        return {
          ...node,
          collapsed: nextCollapsed,
          collapsedSides: nextCollapsedSides,
        };
      }

      const nextCollapsedSides = {
        ...DEFAULT_COLLAPSED_SIDES,
        ...(node.collapsedSides || {}),
        [side]: !node.collapsedSides?.[side],
      };

      return {
        ...node,
        collapsedSides: nextCollapsedSides,
        collapsed: Object.values(nextCollapsedSides).every(Boolean),
      };
    }));
  }, []);

  const zoomIn = useCallback(() => setZoom((prev) => stepZoom(prev, 1)), []);
  const zoomOut = useCallback(() => setZoom((prev) => stepZoom(prev, -1)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      const editable = document.activeElement?.contentEditable === 'true';
      if (['INPUT', 'TEXTAREA'].includes(tag) || editable) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedId && !readMode) handleDeleteNode();
      }

      if (event.key === 'v' || event.key === 'V') handleModeChange('select');
      if (event.key === 'c' || event.key === 'C') handleModeChange('connect');
      if (event.key === 'h' || event.key === 'H') handleModeChange('pan');

      if (event.key === 'Escape') {
        handleModeChange('select');
        setSelectedId(null);
        setActiveShape(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDeleteNode, handleModeChange, handleSave, readMode, redo, selectedId, undo]);

  const selectedNode = nodes.find((node) => node.id === selectedId) || null;
  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < history.current.length - 1;

  const UndoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14H4V9" />
      <path d="M20 20a8 8 0 0 0-8-8H4" />
    </svg>
  );

  const RedoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14h5V9" />
      <path d="M4 20a8 8 0 0 1 8-8h8" />
    </svg>
  );

  const allExpanded = nodes.every(node => !node.collapsed);

  const handleToggleAll = () => {
    if (allExpanded) {
      collapseAll();
    } else {
      expandAll();
    }
  };


  useEffect(() => {
    const userDataString = sessionStorage.getItem("userData");
    if (userDataString) {
      setSessionUserData(JSON.parse(userDataString));
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="fc-app" data-theme={theme}>
      <Sidebar
        open={menuOpen}
        onToggle={() => setMenuOpen((prev) => !prev)}
        files={files}
        currentFileId={currentFileId}
        onNewFile={handleNewFile}
        onLoadFile={handleLoadFile}
        onDeleteFile={deleteFile}
        theme={theme}
        onThemeChange={setTheme}
        handleGridToggle={handleGridToggle}
        showGrid={showGrid}
        onChangeCanvasBg={setCanvasBg}
      />

      <div className="fc-main">
        <Toolbar
          mode={mode}
          activeShape={activeShape}
          onModeChange={handleModeChange}
          onShapeSelect={handleShapeSelect}
          fileName={fileName}
          onFileNameChange={setFileName}
          onSave={handleSave}
          canUndo={canUndo}
          canRedo={canRedo}
          readMode={readMode}
          onToggleReadMode={handleToggleReadMode}
          expandAll={expandAll}
          collapseAll={collapseAll}
          allExpanded={allExpanded}
          onToggleAll={handleToggleAll}
        />

        {mode === 'connect' && !readMode && (
          <div className="fc-connect-hint">
            {connectFrom
              ? 'Click another shape to create the connection.'
              : 'Click a shape to start the connection.'}
          </div>
        )}

        {activeShape && !readMode && (
          <div className="fc-connect-hint fc-shape-hint">
            Click on the canvas to place a new {activeShape} shape, or drag the tool into the diagram.
          </div>
        )}

        <div className="fc-body">
          <Canvas
            nodes={nodes}
            connections={connections}
            selectedId={selectedId}
            mode={readMode ? 'view' : mode}
            activeShape={readMode ? null : activeShape}
            connectFrom={readMode ? null : connectFrom}
            onNodesChange={readMode ? () => { } : handleNodesChange}
            onNodeDrop={readMode ? () => { } : handleNodeDrop}
            onCreateNode={handleCanvasCreateNode}
            onToggle={handleToggleNode}
            onSelectNode={handleSelectNode}
            onConnect={readMode ? () => { } : handleConnect}
            onQuickCreateFromNode={readMode ? () => { } : handleQuickCreateFromNode}
            onLabelChange={readMode ? () => { } : handleLabelChange}
            onDeleteConnection={readMode ? () => { } : handleDeleteConnection}
            readMode={readMode}
            zoom={zoom}
            onZoomChange={setZoom}
            theme={theme}
            showGrid={showGrid}
            canvasBg={canvasBg}
            sessionUserData={sessionUserData}
          />

          <PropertiesPanel
            node={selectedNode}
            onUpdate={readMode ? null : handleUpdateNode}
            onDelete={readMode ? null : handleDeleteNode}
            readMode={readMode}
            theme={theme}
          />
        </div>

        <div className="fc-zoomDock">
          <button type="button" className="fc-zoomBtn" onClick={zoomOut} title="Zoom out">-</button>
          <button type="button" className="fc-zoomValue" onClick={resetZoom} title="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="fc-zoomBtn" onClick={zoomIn} title="Zoom in">+</button>
        </div>

        <div className="fc-actionDock">
          <button type="button" className="fc-zoomBtn" onClick={undo} disabled={!canUndo} title="Undo">
            <UndoIcon />
          </button>

          <button type="button" className="fc-zoomBtn" onClick={redo} disabled={!canRedo} title="Redo">
            <RedoIcon />
          </button>

        </div>
      </div>

      <Toast message={toast} theme={theme} onDone={() => setToast('')} />
    </div>
  );
}
