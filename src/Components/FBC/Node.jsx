import React, { useRef, useState, useCallback, useEffect } from 'react';
import NodeShape from './NodeShape';
import styles from './Node.module.css';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

const SVG_SHAPES = ['diamond', 'parallelogram', 'hexagon', 'cylinder'];
const CP_POSITIONS = [
  { left: '50%', top: '0%', pos: 'top' },
  { left: '100%', top: '50%', pos: 'right' },
  { left: '50%', top: '100%', pos: 'bottom' },
  { left: '0%', top: '50%', pos: 'left' },
];

export default function Node({
  node,
  sideControls,
  selected,
  theme,
  dimmed,
  searchMatched,
  searchActive,
  mode,
  connectFrom,
  onMouseDown,
  onResizeStart,
  onQuickCreateFromNode,
  onReadModeDoubleClick,
  onSelect,
  onToggle,
  onConnect,
  onLabelChange,
  readMode,
}) {
  const [editing, setEditing] = useState(false);
  const [hoveredCp, setHoveredCp] = useState(null);
  const innerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const openQuickAdd = useCallback((position) => {
    clearHoverTimeout();
    setHoveredCp(position);
  }, [clearHoverTimeout]);

  const closeQuickAddSoon = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCp(null);
      hoverTimeoutRef.current = null;
    }, 160);
  }, [clearHoverTimeout]);

  const handleMouseDown = useCallback((event) => {
    if (event.target.classList.contains(styles.cp) || event.target.classList.contains(styles.resizeHandle)) return;

    if (mode === 'connect') {
      onConnect(node.id);
      return;
    }

    if (mode === 'select' && !readMode) {
      onSelect(node.id, { additive: event.ctrlKey || event.metaKey });
      onMouseDown(event, node.id);
    }
    
  }, [mode, node.id, onConnect, onMouseDown, onSelect, readMode]);

  const handleDoubleClick = useCallback(() => {
    if (readMode || mode !== "select") return;

    setEditing(true);

    setTimeout(() => {
      if (!innerRef.current) return;
      innerRef.current.focus();

      const range = document.createRange();
      range.selectNodeContents(innerRef.current);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 0);
  }, [mode, readMode]);

  const handleBlur = useCallback(() => {
    if (innerRef.current) {
      onLabelChange(node.id, innerRef.current.textContent?.trim() || "");
    }
    setEditing(false);
  }, [node.id, onLabelChange]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      innerRef.current?.blur();
    }
  }, []);

  const isConnectSource = connectFrom === node.id;
  const strokeColor = !node.strokeColor || node.strokeColor === 'theme-auto'
    ? (theme === 'dark' ? '#ffffff' : '#1f1f1f')
    : node.strokeColor;
  const fillColor = node.fillColor || 'transparent';
  const fontFamily = node.fontFamily || 'Segoe UI';
  const fontSize = Math.max(10, Number(node.fontSize || 16));
  const shapeClass = styles[`shape_${node.shape}`] || styles.shape_rect;

  useEffect(() => {
    if (!readMode && mode === "select") return;

    if (editing && innerRef.current) {
      onLabelChange(node.id, innerRef.current.textContent?.trim() || "");
    }

    setEditing(false);
    innerRef.current?.blur();

    try {
      const sel = window.getSelection?.();
      sel?.removeAllRanges();
    } catch (e) { }

    try {
      document.activeElement?.blur?.();
    } catch (e) { }
  }, [readMode, mode, editing, node.id, onLabelChange]);
  const isTextShape = node.shape === "text";

  const textReadOnlyStyle =
    readMode && isTextShape
      ? {
        width: Math.max(node.w || 0, 130),
        minHeight: 54,
        padding: "10px 16px",
        border: `2px solid ${strokeColor}`,
        borderRadius: "16px",
        background: theme === "dark" ? "rgba(30,30,30,0.95)" : "#ffffff",
        boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
      : {};
  const textReadOnlyInnerStyle =
    readMode && isTextShape
      ? {
        width: "100%",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
      }
      : {};
  return (
    <div
      className={[
        styles.node,
        shapeClass,
        selected ? styles.selected : '',
        isConnectSource ? styles.connectSource : '',
        readMode ? styles.readOnly : '',
        isTextShape && readMode ? styles.textShapeReadOnly : '',
        dimmed ? styles.dimmed : '',
        searchMatched ? styles.searchMatched : '',
        searchActive ? styles.searchActive : '',
      ].join(' ')}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        '--node-stroke': strokeColor,
        '--node-fill': fillColor,
        ...textReadOnlyStyle,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      data-nodeid={node.id}
    >
      {SVG_SHAPES.includes(node.shape) && (
        <NodeShape shape={node.shape} w={node.w} h={node.h} strokeColor={strokeColor} fillColor={fillColor} />
      )}

      <div
        ref={innerRef}
        className={styles.nodeInner}
        contentEditable={editing && !readMode}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        tabIndex={readMode ? -1 : 0}
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
          ...textReadOnlyInnerStyle,
        }}
      >
        {node.label}
      </div>

      {!readMode && CP_POSITIONS.map((cp) => (

        <React.Fragment key={cp.pos}>
          <div
            className={styles.cp}
            style={{ left: cp.left, top: cp.top }}
            onMouseDown={(event) => {
              event.stopPropagation();
              onConnect(node.id);
            }}
            onMouseEnter={() => openQuickAdd(cp.pos)}
            onMouseLeave={closeQuickAddSoon}
            data-pos={cp.pos}
          />

          {hoveredCp === cp.pos && (
            <button
              type="button"
              className={[styles.quickAdd, styles[`quickAdd_${cp.pos}`]].join(' ')}
              onMouseEnter={() => openQuickAdd(cp.pos)}
              onMouseLeave={closeQuickAddSoon}
              onMouseDown={(event) => {
                clearHoverTimeout();
                event.stopPropagation();
                event.preventDefault();
                onQuickCreateFromNode(node.id, cp.pos);
                setHoveredCp(null);
              }}
              title={`Create ${node.shape} node`}
            >
              <PlusOutlined />
            </button>
          )}
        </React.Fragment>
      ))}

      {!readMode && selected && mode === 'select' && (
        <>
          {['nw', 'ne', 'se', 'sw'].map((handle) => (
            <div
              key={handle}
              className={[styles.resizeHandle, styles[`resizeHandle_${handle}`]].join(' ')}
              onMouseDown={(event) => onResizeStart(event, node.id, handle)}
            />
          ))}
        </>
      )}


      {readMode && sideControls?.map((control) => (
        <button
          type="button"
          key={control.side}
          className={[
            styles.expandHint,
            styles[`expandHint_${control.side}`],
            control.collapsed ? styles.expandBtnOpen : styles.expandBtnClose
          ].join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node.id, control.side);
          }}
          title={`${control.collapsed ? 'Open' : 'Close'} ${control.side} branch`}
        >
          {control.collapsed ? <PlusOutlined /> : <MinusOutlined />}
        </button>
      ))}
    </div>
  );
}
