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

const DRAFT_KEY_PREFIX = 'fc_diagram_draft_';

function getDraftStorageKey() {
  try {
    const raw = sessionStorage.getItem('userData');
    const parsed = raw ? JSON.parse(raw) : null;
    // Adjust this to whatever field actually identifies the user in your userData payload.
    const userId = parsed?.id || parsed?.userId || parsed?.UserId || 'anon';
    return `${DRAFT_KEY_PREFIX}${userId}`;
  } catch (e) {
    return `${DRAFT_KEY_PREFIX}anon`;
  }
}

function readDraft() {
  try {
    const raw = localStorage.getItem(getDraftStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeDraft(payload) {
  try {
    localStorage.setItem(getDraftStorageKey(), JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch (e) {
    // Quota exceeded or storage unavailable (e.g. private browsing) — fail silently.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(getDraftStorageKey());
  } catch (e) {}
}

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
    // Same rounded treatment as a circle, but free to be wider than it is
    // tall — the resize handler only forces a square aspect for 'circle'.
    oval: { w: 180, h: 110 },
    parallelogram: { w: 180, h: 82 },
    hexagon: { w: 180, h: 88 },
    cylinder: { w: 160, h: 88 },
    // A line is modeled as a diagonal stroke drawn corner-to-corner inside
    // its own bounding box (same x/y/w/h model as every other shape, so it
    // reuses the existing move/resize handles for free). Defaulting the
    // height to just 4px keeps a freshly-placed line looking flat/horizontal
    // rather than a steep diagonal; dragging a corner handle up or down
    // tilts it.
    line: { w: 160, h: 4 },
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
    // Every shape starts with a blank label now — no more placeholder
    // "Text" caption pre-filled on a freshly placed rect/diamond/etc. (or
    // on a free text node). The user double-clicks a shape, or double-clicks
    // empty canvas for a floating text node, to type a label wherever and
    // whenever they actually want one (see Node.jsx's handleDoubleClick and
    // Canvas.jsx's handleCanvasDoubleClick — neither depends on the label
    // starting non-empty).
    label: '',
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
    label: '',
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
  const hasRestoredDraftRef = useRef(false);
  const lastHandledFileIdRef = useRef(undefined); // sentinel distinct from null
  const restoredDraftFileIdRef = useRef(undefined); // sentinel: no draft restored yet
  const draftDebounceRef = useRef(null);

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
  const [isViewMode, setIsViewMode] = useState(false);


  const navigate = useNavigate();
  const clipboardRef = useRef(null);

  const handleCopy = useCallback(() => {
    if (!selectedIds.length) return;

    const copiedNodes = nodes
      .filter(n => selectedIds.includes(n.id))
      .map(n => ({ ...n }));

    const copiedConnections = connections
      .filter(
        c =>
          selectedIds.includes(c.from) &&
          selectedIds.includes(c.to)
      )
      .map(c => ({ ...c }));

    clipboardRef.current = {
      nodes: copiedNodes,
      connections: copiedConnections,
    };
  }, [nodes, connections, selectedIds]);

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

  const commitCurrentSnapshot = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentConnections = connectionsRef.current;
    const latest = history.current[historyIdx.current];
    const nextSnap = snapshot(currentNodes, currentConnections);
    if (latest && JSON.stringify(latest) === JSON.stringify(nextSnap)) return;
    pushHistory(currentNodes, currentConnections);
  }, [pushHistory]);

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode);
    setActiveShape(null);
    setSelectedConnectionId(null);
    if (nextMode === 'select' || nextMode === 'pan') {
      setConnectFrom(null);
    }
  }, []);

  const handleEscape = useCallback(() => {
    handleModeChange('select');

    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);

    setActiveShape(null);
    setShowShapeHint(false);

    setConnectFrom(null);
    setFocusedBranchRootId(null);
  }, [handleModeChange]);


  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;

    const idMap = {};

    const pastedNodes = clipboardRef.current.nodes.map(node => {
      const newId = uid();

      idMap[node.id] = newId;

      return normalizeNode({
        ...structuredClone(node),
        id: newId,
        x: node.x + 40,
        y: node.y + 40,
      });
    });

    const pastedConnections =
      clipboardRef.current.connections.map(conn => ({
        ...structuredClone(conn),
        id: uid(),
        from: idMap[conn.from],
        to: idMap[conn.to],
      }));

    const nextNodes = [...nodes, ...pastedNodes];
    const nextConnections = [...connections, ...pastedConnections];

    setNodes(nextNodes);
    setConnections(nextConnections);

    /*
     * First perform the same reset that happens when ESC is pressed.
     */
    handleEscape();

    /*
     * Then select the newly pasted nodes.
     */
    const newSelectedIds = pastedNodes.map(n => n.id);

    setSelectedIds(newSelectedIds);
    setSelectedId(newSelectedIds[0]);
    setSelectedConnectionId(null);

    pushHistory(nextNodes, nextConnections);

  }, [
    nodes,
    connections,
    normalizeNode,
    pushHistory,
    handleEscape
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC
      if (e.key === "Escape") {
        e.preventDefault();
        handleEscape();
        return;
      }

      // Don't hijack native copy/paste while the user is typing in a
      // node label, the filename field, or a connection label —
      // this listener is only for duplicating selected shapes.
      const activeEl = document.activeElement;
      const isEditingText =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      if (isEditingText) return;

      // CTRL / CMD shortcuts
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopy();
      }

      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);

  }, [handleCopy, handlePaste, handleEscape]);

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

  useEffect(() => {
    setReadMode(isViewMode);
  }, [isViewMode]);

  const handleSave = useCallback(async () => {
    const updatedConnections = connections.map((connection) => ({
      ...connection,
      isNew: false,
    }));

    setConnections(updatedConnections);

    const savedInfo = await saveFileWithPdf(
      currentFileId,
      fileName,
      nodes,
      updatedConnections,
    );

    if (savedInfo) {
      await loadFileFromServer(currentFileId);
    }

    clearDraft(); // now safely persisted server-side; drop the local safety-net copy

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

  // Keeps autosave's "flush on unload" handler reading the freshest state
  // without needing to re-subscribe its window listeners on every change.
  const latestDraftRef = useRef({
    nodes: [],
    connections: [],
    fileName: 'Untitled diagram',
    currentFileId: null,
    readMode: false,
  });

  useEffect(() => {
    latestDraftRef.current = { nodes, connections, fileName, currentFileId, readMode };
  });

  useEffect(() => {
    const flushDraftNow = () => {
      const { nodes, connections, fileName, currentFileId, readMode } = latestDraftRef.current;
      if (readMode) return;
      if (nodes.length === 0 && connections.length === 0 && fileName === 'Untitled diagram') return;
      writeDraft({ fileId: currentFileId, fileName, nodes, connections });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraftNow();
    };

    window.addEventListener('beforeunload', flushDraftNow);
    window.addEventListener('pagehide', flushDraftNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushDraftNow);
      window.removeEventListener('pagehide', flushDraftNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // registered once; reads fresh state via the ref above

  // Debounced autosave: writes the in-progress diagram to localStorage a
  // short idle moment after each change, as a periodic safety net (e.g.
  // a browser/tab crash where no unload event fires at all). The
  // beforeunload/pagehide flush above is what actually guarantees no data
  // loss on a normal reload/close.
  useEffect(() => {
    // Don't start autosaving until the initial load/restore pass below has
    // run — otherwise we'd immediately stomp a real draft with an empty state.
    if (!hasRestoredDraftRef.current) return;
    // Nothing to protect in read-only / shared-view contexts.
    if (readMode) return;

    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);

    draftDebounceRef.current = setTimeout(() => {
      if (nodes.length === 0 && connections.length === 0 && fileName === 'Untitled diagram') {
        clearDraft();
        return;
      }

      writeDraft({
        fileId: currentFileId,
        fileName,
        nodes,
        connections,
      });
    }, 800);

    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [nodes, connections, fileName, currentFileId, readMode]);

  // getFile's identity can change across unrelated re-renders (e.g. once
  // fetchBackendFiles() resolves inside useFiles()). Reading it through a
  // ref — rather than depending on it directly — keeps the effect below
  // from re-firing (and clobbering freshly restored/loaded state back to
  // empty) whenever that happens.
  const getFileRef = useRef(getFile);
  useEffect(() => {
    getFileRef.current = getFile;
  });

  // The ONE effect responsible for loading/restoring the diagram whenever
  // currentFileId changes — including the very first mount, which is where
  // draft recovery kicks in.
  useEffect(() => {
    if (skipFileLoadEffect.current) {
      skipFileLoadEffect.current = false;
      hasRestoredDraftRef.current = true;
      lastHandledFileIdRef.current = currentFileId;
      return;
    }

    // In development, React StrictMode intentionally invokes effects twice
    // on mount (setup → cleanup → setup) to surface missing cleanup logic.
    // currentFileId doesn't actually change between those two synthetic
    // passes — so once we've fully handled a given currentFileId once,
    // treat an immediate repeat as a no-op instead of re-running load logic
    // and wiping state (e.g. a just-restored draft) that was just set.
    //
    // restoredDraftFileIdRef covers a second, trickier case: when a
    // restored draft belongs to an existing server file, we call
    // setCurrentFileId(draft.fileId) below, which makes this same effect
    // fire again with the NEW currentFileId. That follow-up invocation
    // needs to also be a no-op (otherwise it would look up and reload the
    // server's pre-edit copy right over the draft we just restored) — but
    // it can't be, because currentFileId has genuinely changed value, so
    // it wouldn't match lastHandledFileIdRef. Comparing against
    // restoredDraftFileIdRef instead catches it directly, and — unlike a
    // one-shot flag such as skipFileLoadEffect — can't be prematurely
    // consumed by an intervening StrictMode replay that still has the old
    // currentFileId in its closure.
    if (
      hasRestoredDraftRef.current &&
      (lastHandledFileIdRef.current === currentFileId || restoredDraftFileIdRef.current === currentFileId)
    ) {
      return;
    }
    lastHandledFileIdRef.current = currentFileId;

    let loadedNodes = [];
    let loadedConnections = [];
    let loadedName = "Untitled diagram";

    if (currentFileId) {
      const file = getFileRef.current(currentFileId);
      if (file) {
        loadedNodes = (file.nodes || []).map(normalizeNode);
        loadedConnections = (file.connections || []).map((connection) => ({
          ...connection,
          isNew: false,
        }));
        loadedName = file.name || "Untitled diagram";
      }
    }

    // Only ever attempt draft recovery once, right after the screen first
    // mounts — this is what protects against an accidental refresh/reload/
    // tab-close before Save was clicked. Later, deliberate file switches
    // within the same session (New File, opening a different diagram) load
    // normally and don't re-trigger this. Deliberately not gated on the
    // draft's fileId matching currentFileId: whatever file the app would
    // otherwise auto-select on load, recovering unsaved work takes priority
    // at this one moment.
    if (!hasRestoredDraftRef.current) {
      hasRestoredDraftRef.current = true;
      const draft = readDraft();

      if (draft && Array.isArray(draft.nodes) && draft.nodes.length > 0) {
        const draftNodes = draft.nodes.map(normalizeNode);
        const draftConnections = (draft.connections || []).map((c) => ({ ...c, isNew: false }));

        setNodes(draftNodes);
        setConnections(draftConnections);
        setFileName(draft.fileName || loadedName);
        setSelectedId(null);
        setSelectedIds([]);
        setSelectedConnectionId(null);
        history.current = [snapshot(draftNodes, draftConnections)];
        historyIdx.current = 0;
        // Made deliberately more explicit than a typical short toast (e.g.
        // "Saved!") — this one is telling the user something they could
        // easily miss and act on wrongly (keep editing on top of a
        // recovered draft without realizing it wasn't their last saved
        // state), so it spells out what happened and what to do next
        // instead of a terse "Restored!".
        setToast("We recovered unsaved changes from your last session. Review the diagram, then click Save to keep them.");

        // The draft may belong to an existing server diagram (draft.fileId),
        // not just a brand-new/unsaved one. Remember which fileId this
        // restore applies to (see restoredDraftFileIdRef above) before
        // updating currentFileId to match — that's what keeps the follow-up
        // invocation of this effect from reloading the server's pre-edit
        // copy over what we just restored, and it's what makes Save
        // afterwards correctly call EditDrafts instead of CreateDraft.
        restoredDraftFileIdRef.current = draft.fileId || null;

        if (draft.fileId && draft.fileId !== currentFileId) {
          setCurrentFileId(draft.fileId);
        }

        return;
      }
    }

    setNodes(loadedNodes);
    setConnections(loadedConnections);
    setFileName(loadedName);
    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
    history.current = [snapshot(loadedNodes, loadedConnections)];
    historyIdx.current = 0;
  }, [currentFileId]); // getFile deliberately excluded — see getFileRef above.

  const handleGridToggle = () => {
    setShowGrid((prev) => !prev);
  };

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

  const appendNode = useCallback((newNode, options = {}) => {
    const { skipAutoArrow = false } = options;

    setNodes((prevNodes) => {
      const expandedPrevNodes = expandNodes(prevNodes);
      const nextNodes = [...expandedPrevNodes, { ...newNode, collapsed: false, collapsedSides: { ...DEFAULT_COLLAPSED_SIDES } }];

      setConnections((prevConnections) => {
        let nextConnections = prevConnections;

        // A free-drawn line is an annotation, not a flowchart step — it
        // shouldn't automatically wire itself to whatever the last-created
        // node happened to be the way a new rect/diamond/etc. does.
        if (!skipAutoArrow && autoArrowEnabled && expandedPrevNodes.length > 0) {
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

  // Free-hand line drawing: the user clicks-and-drags on the canvas with the
  // Line tool active (see Canvas.jsx's drawingLine handling), and the two
  // points they dragged between arrive here as absolute canvas coordinates.
  // Unlike every other shape, a line is NOT placed as a fixed default box —
  // its endpoints (x1,y1)-(x2,y2) are exactly what the user drew, at
  // whatever angle and length they chose. x/y/w/h are still kept as the
  // endpoints' bounding box purely so the rest of the app (selection-rect
  // hit testing, connection routing, the properties panel, etc.) keeps
  // working with every node the same way, regardless of shape.
  const handleCanvasCreateLine = useCallback((x1, y1, x2, y2) => {
    if (readMode) return;
    setShowShapeHint(false);

    const roundedX1 = Math.round(x1);
    const roundedY1 = Math.round(y1);
    const roundedX2 = Math.round(x2);
    const roundedY2 = Math.round(y2);

    const newNode = {
      id: uid(),
      shape: 'line',
      x: Math.min(roundedX1, roundedX2),
      y: Math.min(roundedY1, roundedY2),
      w: Math.max(2, Math.abs(roundedX2 - roundedX1)),
      h: Math.max(2, Math.abs(roundedY2 - roundedY1)),
      x1: roundedX1,
      y1: roundedY1,
      x2: roundedX2,
      y2: roundedY2,
      label: '',
      strokeColor: DEFAULT_STROKE,
      fillColor: DEFAULT_FILL,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: DEFAULT_FONT_SIZE,
      collapsed: false,
      collapsedSides: { ...DEFAULT_COLLAPSED_SIDES },
    };

    appendNode(newNode, { skipAutoArrow: true });
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
        const nextConnections = [...currentConnections, { id: uid(), from: prev, to: nodeId, label: "", ...(isNew ? { isNew: true } : {}) }];

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

  // Replaces a node's whole set of independently placed text blocks (see
  // Node.jsx — a shape can hold several captions, each at its own spot).
  //
  // `label` is kept in sync as the joined text of every block, because plenty
  // of the app still reads node.label rather than the blocks: label search
  // (labelMatches above), the PDF export, and anything consuming a saved
  // diagram. Keeping it current means none of that has to change.
  const handleTextsChange = useCallback((id, texts) => {
    setNodes((prev) => {
      const next = prev.map((node) => (
        node.id === id
          ? {
            ...node,
            texts,
            label: texts.map((t) => t.value).filter(Boolean).join(' '),
          }
          : node
      ));
      pushHistory(next, connections);
      return next;
    });
  }, [connections, pushHistory]);

  // Eraser: removes everything the user dragged the eraser across in one
  // stroke (Canvas.jsx collects them and grays them out as a preview, then
  // commits on mouse release). Deleting a node also takes its connections
  // with it, same as the normal delete path — a connection dangling from a
  // shape that no longer exists would never render anyway.
  //
  // One history entry per stroke, not per erased element, so a single undo
  // brings the whole stroke back.
  const handleEraseElements = useCallback((nodeIds, connectionIds) => {
    if (readMode) return;
    if (!nodeIds.length && !connectionIds.length) return;

    const nodeIdSet = new Set(nodeIds);
    const connectionIdSet = new Set(connectionIds);

    setNodes((prevNodes) => {
      const nextNodes = prevNodes.filter((node) => !nodeIdSet.has(node.id));

      setConnections((prevConnections) => {
        const nextConnections = prevConnections.filter((connection) => (
          !connectionIdSet.has(connection.id) &&
          !nodeIdSet.has(connection.from) &&
          !nodeIdSet.has(connection.to)
        ));

        prevConnections.forEach((connection) => {
          if (connectionIdSet.has(connection.id)) {
            deletedConnectionsRef.current.add(`${connection.from}->${connection.to}`);
          }
        });

        pushHistory(nextNodes, nextConnections);
        return nextConnections;
      });

      return nextNodes;
    });

    setSelectedId(null);
    setSelectedIds([]);
    setSelectedConnectionId(null);
  }, [pushHistory, readMode]);

  // Grows a shape so the text inside it fits (Node.jsx measures what's
  // needed). Only ever grows: a box the user deliberately dragged larger
  // keeps that size, and text being deleted doesn't yank the shape smaller
  // underneath them.
  //
  // Deliberately does NOT push a history entry — this is a layout consequence
  // of typing, and the text edit that triggered it already recorded one.
  // Returning `prev` untouched when nothing changed is what keeps the
  // measure → resize → re-measure cycle from looping.
  const handleAutoResizeNode = useCallback((id, size) => {
    setNodes((prev) => {
      let changed = false;

      const next = prev.map((node) => {
        if (node.id !== id) return node;

        const nextH = Math.max(node.h, Math.round(size.h));
        if (nextH === node.h) return node;

        changed = true;
        return { ...node, h: nextH };
      });

      return changed ? next : prev;
    });
  }, []);

  // Setting a node's text wholesale (used by paste-into-selected-node): this
  // collapses the node down to a single centered block, which is what an
  // incoming pasted value should look like.
  const handleLabelChange = useCallback((id, label) => {
    setNodes((prev) => {
      const next = prev.map((node) => (
        node.id === id
          ? {
            ...node,
            label,
            texts: label
              ? [{ id: `${id}-t0`, x: null, y: null, value: label }]
              : [],
          }
          : node
      ));
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

      if (event.key === 'e' || event.key === 'E') handleModeChange('erase');
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

  const handleConnectionLabelChange = useCallback((id, label) => {

    setConnections(prev => {

      const next = prev.map(c =>
        c.id === id
          ? { ...c, label }
          : c
      );

      pushHistory(nodes, next);

      return next;
    });

  }, [nodes, pushHistory]);

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

        onOpenView={(value) => setIsViewMode(value)}
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

          autoArrowEnabled={autoArrowEnabled}
          onToggleAutoArrow={() => setAutoArrowEnabled((prev) => !prev)}

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

        {mode === 'erase' && !readMode && (
          <div className="fc-connect-hint">
            Hold the left mouse button and drag across anything you want to remove. Hold Alt to un-mark.
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
            onCreateLine={readMode ? () => { } : handleCanvasCreateLine}
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
            onTextsChange={readMode ? () => { } : handleTextsChange}
            onAutoResize={readMode ? () => { } : handleAutoResizeNode}
            onErase={readMode ? () => { } : handleEraseElements}
            onConnectionControlEnd={readMode ? () => { } : commitCurrentSnapshot}
            onDeleteConnection={readMode ? () => { } : handleDeleteConnection}
            readMode={readMode}
            zoom={zoom}
            onZoomChange={setZoom}
            theme={theme}
            showGrid={showGrid}
            canvasBg={canvasBg}
            sessionUserData={sessionUserData}
            onConnectionLabelChange={handleConnectionLabelChange}
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