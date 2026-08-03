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
import { exportDiagramAsPdf } from './hooks/pdfUtils';
import UplaodDocument from '../EDM/Documents/UploadDoc';
import LZString from "lz-string";

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function labelMatches(label, query, caseSensitive, wholeWord) {
  const source = `${label || ''}`;
  const search = `${query || ''}`;
  if (!search.trim()) return false;

  if (wholeWord) {
    const flags = caseSensitive ? '' : 'i';
    const pattern = new RegExp(`\\b${escapeRegExp(search.trim())}\\b`, flags);
    return pattern.test(source);
  }

  if (caseSensitive) {
    return source.includes(search);
  }

  return source.toLowerCase().includes(search.toLowerCase());
}

function collectSubtreeIds(rootId, connections) {
  const visited = new Set([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    connections.forEach((connection) => {
      if (connection.from === currentId && !visited.has(connection.to)) {
        visited.add(connection.to);
        queue.push(connection.to);
      }
    });
  }

  return visited;
}

export default function FlowBuilderC() {
  const deletedConnectionsRef = useRef(new Set());
  const history = useRef([]);
  const historyIdx = useRef(-1);
  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);

  const [nodes, setNodes] = useState([]);
  const [selectedFlowChartName, setSelectedFlowChartName] = useState(null);
  const [selectedFlowChartUrl, setSelectedFlowChartUrl] = useState(null);
  const [selectedFlowChartId, setSelectedFlowChartId] = useState(null);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
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
  const [autoArrowEnabled, setAutoArrowEnabled] = useState(true);
  const [canvasBg, setCanvasBg] = useState(null);
  const [sessionUserData, setSessionUserData] = useState(null);
  const [showShapeHint, setShowShapeHint] = useState(false);


  const [searchQuery, setSearchQuery] = useState('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchWholeWord, setSearchWholeWord] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [focusedBranchRootId, setFocusedBranchRootId] = useState(null);
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [isVersionViewMode, setIsVersionViewMode] = useState(false);
  const [isVersionEditMode, setIsVersionEditMode] = useState(false);
  const [versionJson, setVersionJson] = useState(null);
  const [sharedWriteAccess, setSharedWriteAccess] = useState(true);


  const navigate = useNavigate();

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const matchedNodeIds = nodes
    .filter((node) => labelMatches(node.label, searchQuery, searchCaseSensitive, searchWholeWord))
    .map((node) => node.id);

  const activeSearchNodeId = matchedNodeIds.length > 0
    ? matchedNodeIds[((activeSearchIndex % matchedNodeIds.length) + matchedNodeIds.length) % matchedNodeIds.length]
    : null;

  const focusedNodeIds = focusedBranchRootId
    ? Array.from(collectSubtreeIds(focusedBranchRootId, connections))
    : [];

  const allExpanded = nodes.every((node) => !node.collapsed && Object.values(node.collapsedSides || DEFAULT_COLLAPSED_SIDES).every((value) => !value));
  const skipFileLoadEffect = useRef(false);


  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveSearchIndex(0);
      return;
    }

    setActiveSearchIndex((prev) => {
      if (matchedNodeIds.length === 0) return 0;
      return Math.min(prev, matchedNodeIds.length - 1);
    });
  }, [matchedNodeIds.length, searchQuery]);

  const { files, currentFileId, setCurrentFileId, fetchBackendFiles, loadFileFromServer, saveFile, saveFileWithPdf, newFile, getFile, deleteFile, draftFiles, edmDocuments, sharedDraftFiles, fetchSharedDrafts, fetchEDMDocuments, loadDiagramFromUrl } = useFiles();

  useEffect(() => {
    fetchBackendFiles();   // populate sidebar on load
  }, [fetchBackendFiles]);

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
    setSelectedIds([]);
    setSelectedConnectionId(null);
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current += 1;
    const snap = history.current[historyIdx.current];
    setNodes(snap.nodes);
    setConnections(snap.connections);
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  }, []);

  const handleSave = useCallback(async () => {
    const updatedConnections = connections.map((connection) => ({
      ...connection,
      isNew: false,
    }));

    setConnections(updatedConnections);

    const savedInfo = await saveFileWithPdf(   // hook alias still named saveFileWithPdf
      currentFileId,
      fileName,
      nodes,
      updatedConnections,
    );

    if (savedInfo) {
      // Reload the file we just saved so local state has the server URL
      await loadFileFromServer(currentFileId);
    }

    setToast('Saved!');
  }, [connections, currentFileId, fileName, nodes, saveFileWithPdf, loadFileFromServer]);

  const edmOffcanvasRef = useRef(null);
  const [edmPdfPayload, setEdmPdfPayload] = useState(null); // { file, name }

  const handleNewFile = useCallback(() => {
    if (currentFileId) saveFile(currentFileId, fileName, nodes, connections);
    const file = newFile();

    setNodes([]);
    setConnections([]);
    setFileName(file.name || "Untitled diagram");
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    setMode("select");
    setActiveShape(null);
    setConnectFrom(null);
    setFocusedBranchRootId(null);
    setCurrentFileId(file.id);
    history.current = [snapshot([], [])];
    historyIdx.current = 0;
  }, [connections, currentFileId, fileName, newFile, nodes, saveFile, setCurrentFileId]);

  const handleLoadFile = useCallback(
    (fileId) => {
      const file =
        draftFiles.find((f) => f.id === fileId) ||
        files.find((f) => f.id === fileId);

      if (!file) return;

      skipFileLoadEffect.current = true;

      setCurrentFileId(fileId);
      setNodes((file.nodes || []).map(normalizeNode));
      setConnections(
        (file.connections || []).map((c) => ({
          ...c,
          isNew: false,
        }))
      );
      setFileName(file.name || "Untitled diagram");
      setSelectedId(null);
      setSelectedIds([]);
      setSelectedConnectionId(null);
      setMode("select");
      setConnectFrom(null);

      history.current = [
        snapshot(
          (file.nodes || []).map(normalizeNode),
          file.connections || []
        ),
      ];
      historyIdx.current = 0;
    },
    [files, draftFiles]
  );

  const handleLoadDiagram = useCallback((diagram) => {
    if (!diagram) return;
  
    skipFileLoadEffect.current = true;
  
    setNodes((diagram.nodes || []).map(normalizeNode));
  
    setConnections(
      (diagram.connections || []).map((c) => ({
        ...c,
        isNew: false,
      }))
    );
  
    setFileName(diagram.name || "Untitled diagram");
  
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  
    setMode("select");
    setConnectFrom(null);
  
    history.current = [
      snapshot(
        (diagram.nodes || []).map(normalizeNode),
        diagram.connections || []
      ),
    ];
  
    historyIdx.current = 0;
  }, []);

  useEffect(() => {
    if (skipFileLoadEffect.current) {
      skipFileLoadEffect.current = false;
      return;
    }

    if (currentFileId) {
      const file = getFile(currentFileId);
      if (file) {
        const loadedNodes = (file.nodes || []).map(normalizeNode);
        const loadedConnections = (file.connections || []).map((connection) => ({
          ...connection,
          isNew: false,
        }));

        setNodes(loadedNodes);
        setConnections(loadedConnections);
        setFileName(file.name || "Untitled diagram");
        history.current = [snapshot(loadedNodes, loadedConnections)];
        historyIdx.current = 0;
        return;
      }
    }

    setNodes([]);
    setConnections([]);
    setFileName("Untitled diagram");
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    history.current = [snapshot([], [])];
    historyIdx.current = 0;
  }, [currentFileId, getFile]);

  const handleGridToggle = () => {
    setShowGrid((prev) => !prev);
  };

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode);
    setActiveShape(null);
    setSelectedConnectionId(null);
    if (nextMode === 'select' || nextMode === 'pan') {
      setConnectFrom(null);
    }
  }, []);

  const handleShapeSelect = useCallback((shapeId) => {
    setActiveShape((prev) => {
      const nextShape = prev === shapeId ? null : shapeId;
      setShowShapeHint(Boolean(nextShape));
      return nextShape;
    });
    setMode('select');
    setConnectFrom(null);
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  }, []);

  const expandNodes = useCallback((inputNodes) => inputNodes.map((node) => ({
    ...node,
    collapsed: false,
    collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
  })), []);

  const appendNode = useCallback((newNode) => {
    setNodes((prevNodes) => {
      const expandedPrevNodes = expandNodes(prevNodes);
      const nextNodes = [...expandedPrevNodes, { ...newNode, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } }];

      setConnections((prevConnections) => {
        let nextConnections = prevConnections;

        if (autoArrowEnabled && expandedPrevNodes.length > 0) {
          const lastNodeId = expandedPrevNodes[expandedPrevNodes.length - 1].id;
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
    setSelectedId(newNode.id);
    setSelectedIds([newNode.id]);
    setSelectedConnectionId(null);
  }, [autoArrowEnabled, expandNodes, pushHistory]);

  const handleCanvasCreateNode = useCallback((shape, position) => {
    if (readMode) return;
    setShowShapeHint(false);
    appendNode(createNode(shape, position.x, position.y));
  }, [appendNode, readMode]);

  const handleCanvasCreateTextNode = useCallback((position) => {
    if (readMode) return;
    const newNode = { ...createNode('text', position.x, position.y), collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } };
    setNodes((prevNodes) => {
      const nextNodes = [...expandNodes(prevNodes), newNode];
      pushHistory(nextNodes, connectionsRef.current);
      return nextNodes;
    });
    setSelectedId(newNode.id);
    setSelectedIds([newNode.id]);
    setSelectedConnectionId(null);
    setFocusedBranchRootId(null);
  }, [expandNodes, pushHistory, readMode]);

  const handleQuickCreateFromNode = useCallback((sourceNodeId, position) => {
    if (readMode) return;

    setNodes((prevNodes) => {
      const expandedPrevNodes = expandNodes(prevNodes);
      const sourceNode = expandedPrevNodes.find((node) => node.id === sourceNodeId);
      if (!sourceNode) return expandedPrevNodes;

      const newNode = createChildNodeFromSource(sourceNode, position);
      const nextNodes = [...expandedPrevNodes, { ...newNode, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } }];

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
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    setFocusedBranchRootId(null);
  }, [expandNodes, pushHistory, readMode]);

  const handleConnect = useCallback((nodeId) => {
    setMode('connect');
    setActiveShape(null);
    setSelectedConnectionId(null);
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
    setFocusedBranchRootId(null);
  }, [pushHistory]);

  const handleNodesChange = useCallback((updater) => {
    setNodes((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const handleConnectionsChange = useCallback((updater) => {
    setConnections((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const handleNodeDrop = useCallback((newNode) => {
    if (readMode) return;
    setShowShapeHint(false);
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

  const handleSelectNode = useCallback((id, options = {}) => {
    if (readMode) return;
    const { additive = false } = options;

    if (id == null) {
      setSelectedId(null);
      setSelectedIds([]);
      setSelectedConnectionId(null);
      return;
    }

    setSelectedConnectionId(null);
    setSelectedIds((prev) => {
      let next;
      if (additive) {
        next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      } else if (prev.includes(id)) {
        next = prev;
      } else {
        next = [id];
      }
      setSelectedId(next.length === 1 ? next[0] : (next[0] || null));
      return next;
    });
  }, [readMode]);

  const handleSelectNodes = useCallback((ids) => {
    if (readMode) return;
    setSelectedIds(ids);
    setSelectedId(ids.length === 1 ? ids[0] : (ids[0] || null));
    setSelectedConnectionId(null);
  }, [readMode]);

  const handleSelectConnection = useCallback((connectionId) => {
    if (readMode) return;
    setSelectedConnectionId(connectionId);
    setSelectedId(null);
    setSelectedIds([]);
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
    const idsToDelete = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (idsToDelete.length === 0) return;

    setNodes((prevNodes) => {
      const nextNodes = prevNodes.filter((node) => !idsToDelete.includes(node.id));
      setConnections((prevConnections) => {
        const nextConnections = prevConnections.filter((connection) => !idsToDelete.includes(connection.from) && !idsToDelete.includes(connection.to));
        pushHistory(nextNodes, nextConnections);
        return nextConnections;
      });
      return nextNodes;
    });

    setSelectedId(null);
    setSelectedIds([]);
  }, [pushHistory, selectedId, selectedIds]);

  const handleDeleteConnection = useCallback((id) => {
    setConnections((prevConnections) => {
      const connection = prevConnections.find((item) => item.id === id);
      const nextConnections = prevConnections.filter((item) => item.id !== id);
      if (connection) deletedConnectionsRef.current.add(`${connection.from}->${connection.to}`);
      pushHistory(nodes, nextConnections);
      return nextConnections;
    });
    setSelectedConnectionId((prev) => (prev === id ? null : prev));
  }, [nodes, pushHistory]);

  const commitCurrentSnapshot = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentConnections = connectionsRef.current;
    const latest = history.current[historyIdx.current];
    const nextSnap = snapshot(currentNodes, currentConnections);
    if (latest && JSON.stringify(latest) === JSON.stringify(nextSnap)) return;
    pushHistory(currentNodes, currentConnections);
  }, [pushHistory]);

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
    setFocusedBranchRootId(null);
  }, []);

  const focusBranch = useCallback((nodeId) => {
    if (!readMode) return;
    const subtreeIds = collectSubtreeIds(nodeId, connectionsRef.current);
    if (subtreeIds.size <= 1) return;

    setNodes((prev) => prev.map((node) => (
      subtreeIds.has(node.id)
        ? {
          ...node,
          collapsed: false,
          collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
        }
        : node
    )));

    setFocusedBranchRootId((prev) => (prev === nodeId ? null : nodeId));
  }, [readMode]);

  const handleToggleReadMode = useCallback(() => {
    try {
      document.activeElement?.blur?.();
      const sel = window.getSelection?.();
      sel?.removeAllRanges();
    } catch (e) { }

    setReadMode((prev) => {
      const nextReadMode = !prev;

      setSelectedId(null);
      setSelectedIds([]);
      setSelectedConnectionId(null);
      setMode("select");
      setActiveShape(null);
      setConnectFrom(null);
      setFocusedBranchRootId(null);

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

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !readMode) {
        event.preventDefault();
        const allIds = nodesRef.current.map((node) => node.id);
        setSelectedIds(allIds);
        setSelectedId(allIds.length === 1 ? allIds[0] : null);
        setSelectedConnectionId(null);
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedConnectionId && !readMode) {
          handleDeleteConnection(selectedConnectionId);
        } else if ((selectedIds.length > 0 || selectedId) && !readMode) {
          handleDeleteNode();
        }
      }

      if (event.key === 'v' || event.key === 'V') handleModeChange('select');
      if (event.key === 'c' || event.key === 'C') handleModeChange('connect');
      if (event.key === 'h' || event.key === 'H') handleModeChange('pan');

      if (event.key === 'Escape') {
        handleModeChange('select');
        setSelectedId(null);
        setSelectedIds([]);
        setSelectedConnectionId(null);
        setActiveShape(null);
        setShowShapeHint(false);
        setFocusedBranchRootId(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDeleteConnection, handleDeleteNode, handleModeChange, handleSave, readMode, redo, selectedConnectionId, selectedId, selectedIds.length, undo]);

  const selectedNode = selectedIds.length === 1 ? (nodes.find((node) => node.id === selectedIds[0]) || null) : null;
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

  // const allExpanded = nodes.every(node => !node.collapsed);

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

  useEffect(() => {
    setReadMode(!sharedWriteAccess);
}, [sharedWriteAccess]);


  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setActiveSearchIndex(0);
    if (value.trim()) {
      expandAll();
    }
  }, [expandAll]);

  const handleSearchNext = useCallback(() => {
    if (matchedNodeIds.length === 0) return;
    setActiveSearchIndex((prev) => (prev + 1) % matchedNodeIds.length);
  }, [matchedNodeIds.length]);

  const handleSearchPrev = useCallback(() => {
    if (matchedNodeIds.length === 0) return;
    setActiveSearchIndex((prev) => (prev - 1 + matchedNodeIds.length) % matchedNodeIds.length);
  }, [matchedNodeIds.length]);

  const handleGetFileData = useCallback((fileId) => {
    if (fileId === currentFileId) {
      // Return live state for current file
      return { nodes, connections };
    }
    return getFile(fileId);
  }, [currentFileId, nodes, connections, getFile]);

  const handleUploadToEdm = useCallback(async (file) => {

    setSelectedFlowChartName(file.filename);
    setSelectedFlowChartUrl(file.jsonData);
    setSelectedFlowChartId(file.id);
    const data = handleGetFileData(file.id);

    // Generate PDF doc
    const doc = await exportDiagramAsPdf({
      name: file.name || 'diagram',
      nodes: data?.nodes || file.nodes || [],
      connections: data?.connections || file.connections || [],
    });

    // Convert to File object
    const pdfBlob = doc.output('blob');
    const pdfFile = new File(
      [pdfBlob],
      `${file.name || 'diagram'}.pdf`,
      { type: 'application/pdf' }
    );

    // Store payload so offcanvas can pick it up
    setEdmPdfPayload({ file: pdfFile, name: file.name || 'diagram' });

    // Open the offcanvas
    const offcanvasEl = document.getElementById('offcanvasRightUploadDoc');
    if (offcanvasEl) {
      const bsOffcanvas = new window.bootstrap.Offcanvas(offcanvasEl);
      bsOffcanvas.show();
    }
  }, [handleGetFileData]);

  const handleLoadDocument = useCallback(async (doc) => {
    const diagram = await loadDiagramFromUrl(doc.url);

    if (!diagram) return;

    skipFileLoadEffect.current = true;

    setNodes(diagram.nodes.map(normalizeNode));
    setConnections(
      diagram.connections.map(c => ({
        ...c,
        isNew: false,
      }))
    );

    setFileName(diagram.name);
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    setMode("select");
    setConnectFrom(null);

    history.current = [
      snapshot(
        diagram.nodes.map(normalizeNode),
        diagram.connections
      ),
    ];

    historyIdx.current = 0;
  }, [loadDiagramFromUrl]);

  const handleSubmitVersion = () => {
    const diagram = {
      name: fileName,
      nodes,
      connections,
      savedAt: Date.now(),
      version: 1,
  };
  
  const compressedJson = LZString.compressToBase64(
      JSON.stringify(diagram)
  );
  
  setVersionJson(compressedJson);
  };

  const handleSubmitEditVersion = () => {
    const diagram = {
      name: fileName,
      nodes,
      connections,
      savedAt: Date.now(),
      version: 1,
  };
  
  const compressedJson = LZString.compressToBase64(
      JSON.stringify(diagram)
  );
  
  setVersionJson(compressedJson);
  };

  
  return (
    <div className="fc-app" data-theme={theme}>
      <Sidebar
        open={menuOpen}
        onToggle={() => setMenuOpen((prev) => !prev)}

        files={files}
        draftFiles={draftFiles}
        sharedDraftFiles={sharedDraftFiles}
        edmDocuments={edmDocuments}
        fetchEDMDocuments={fetchEDMDocuments}
        fetchSharedDrafts={fetchSharedDrafts}
        // onLoadDocument={handleLoadDocument}
        onLoadDocument={handleLoadDiagram}
        onStartVersion={() => setIsVersionMode(true)}
        onViewVersion={() => setIsVersionViewMode(true)}
        onStartEditVersion={() => setIsVersionEditMode(true)}
        versionJson={versionJson}
        onSharedPermission={setSharedWriteAccess}

        currentFileId={currentFileId}
        onNewFile={handleNewFile}
        onLoadFile={handleLoadFile}
        onDeleteFile={deleteFile}
        theme={theme}
        onThemeChange={setTheme}
        handleGridToggle={handleGridToggle}
        showGrid={showGrid}
        autoArrowEnabled={autoArrowEnabled}
        onToggleAutoArrow={() => setAutoArrowEnabled((prev) => !prev)}
        onChangeCanvasBg={setCanvasBg}
        onGetFileData={handleGetFileData}
        onUploadToEdm={handleUploadToEdm}
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
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchChange}
          searchCaseSensitive={searchCaseSensitive}
          onSearchCaseSensitiveChange={setSearchCaseSensitive}
          searchWholeWord={searchWholeWord}
          onSearchWholeWordChange={setSearchWholeWord}
          searchResultCount={matchedNodeIds.length}
          activeSearchIndex={activeSearchNodeId ? activeSearchIndex : -1}
          onSearchNext={handleSearchNext}
          onSearchPrev={handleSearchPrev}

          isVersionViewMode={isVersionViewMode}
          isVersionMode={isVersionMode}
          onSubmitVersion={handleSubmitVersion}
          isVersionEditMode={isVersionEditMode}
          onSubmitEditVersion={handleSubmitEditVersion}
          sharedWriteAccess={sharedWriteAccess}
        />

        {mode === 'connect' && !readMode && (
          <div className="fc-connect-hint">
            {connectFrom
              ? 'Click another shape to create the connection.'
              : 'Click a shape to start the connection.'}
          </div>
        )}

        {activeShape && !readMode && showShapeHint && (
          <div className="fc-connect-hint">
            Click on the canvas to place a new {activeShape} shape, or drag the tool into the diagram.
          </div>
        )}

        <div className="fc-body">
          <Canvas
            nodes={nodes}
            connections={connections}
            selectedId={selectedId}
            selectedIds={selectedIds}
            selectedConnectionId={selectedConnectionId}
            mode={readMode ? 'view' : mode}
            activeShape={readMode ? null : activeShape}
            setActiveShape={setActiveShape}
            connectFrom={readMode ? null : connectFrom}
            matchedNodeIds={matchedNodeIds}
            activeSearchNodeId={activeSearchNodeId}
            focusedNodeIds={focusedNodeIds}
            onNodesChange={readMode ? () => { } : handleNodesChange}
            onConnectionsChange={readMode ? () => { } : handleConnectionsChange}
            onNodeDrop={readMode ? () => { } : handleNodeDrop}
            onCreateNode={handleCanvasCreateNode}
            onCreateTextNode={readMode ? () => { } : handleCanvasCreateTextNode}
            onNodeDragEnd={readMode ? () => { } : commitCurrentSnapshot}
            onToggle={handleToggleNode}
            onSelectNode={handleSelectNode}
            onSelectNodes={handleSelectNodes}
            onSelectConnection={handleSelectConnection}
            onConnect={readMode ? () => { } : handleConnect}
            onQuickCreateFromNode={readMode ? () => { } : handleQuickCreateFromNode}
            onFocusBranch={focusBranch}
            onLabelChange={readMode ? () => { } : handleLabelChange}
            onConnectionControlEnd={readMode ? () => { } : commitCurrentSnapshot}
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

      <UplaodDocument
        autoAttachFile={edmPdfPayload}        // ✅ new prop
        onAutoAttachConsumed={() => setEdmPdfPayload(null)}  // ✅ clear after use
        flowChartName={selectedFlowChartName}
        flowChartUrl={selectedFlowChartUrl}
        flowChartId={selectedFlowChartId}
      />
    </div>

  );
}
