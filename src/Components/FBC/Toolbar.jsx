import React from 'react';
import styles from './Toolbar.module.css';
import { ArrowsAltOutlined, ShrinkOutlined } from '@ant-design/icons';

const SHAPE_TOOLS = [
  { id: 'rect', label: 'Rectangle', short: '2' },
  { id: 'rounded', label: 'Rounded', short: '3' },
  { id: 'diamond', label: 'Diamond', short: '4' },
  { id: 'circle', label: 'Circle', short: '5' },
  { id: 'parallelogram', label: 'Parallelogram', short: '6' },
  { id: 'hexagon', label: 'Hexagon', short: '7' },
  { id: 'cylinder', label: 'Cylinder', short: '8' },
  { id: 'text', label: 'Text', short: '9' },
];

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const SelectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4l11 8-5 1.5L9.5 19z" />
  </svg>
);

const HandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 11V5a1 1 0 0 1 2 0v5" />
    <path d="M10 11V4a1 1 0 0 1 2 0v7" />
    <path d="M13 11V5a1 1 0 0 1 2 0v8" />
    <path d="M16 12V8a1 1 0 0 1 2 0v7a5 5 0 0 1-5 5h-1.5a5.5 5.5 0 0 1-4.3-2.1L5 15.1A1.2 1.2 0 0 1 6.8 13.5L9 16V11a1 1 0 0 1 1-1h5" />
  </svg>
);

const ConnectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="12" r="2.5" />
    <path d="M8.5 12h7" />
  </svg>
);

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

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </svg>
);

function ShapeIcon({ shapeId }) {
  if (shapeId === 'rect') {
    return <rect x="3" y="5" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  }

  if (shapeId === 'rounded') {
    return <rect x="3" y="5" width="18" height="14" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  }

  if (shapeId === 'diamond') {
    return <polygon points="12,3 21,12 12,21 3,12" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  }

  if (shapeId === 'circle') {
    return <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  }

  if (shapeId === 'parallelogram') {
    return <polygon points="6,5 21,5 18,19 3,19" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  }

  if (shapeId === 'hexagon') {
    return <polygon points="7,4 17,4 22,12 17,20 7,20 2,12" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  }

  if (shapeId === 'cylinder') {
    return (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 6v9c0 1.7 3.1 3 7 3s7-1.3 7-3V6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    );
  }

  return <text x="7" y="17" fontSize="16" fill="currentColor" fontWeight="700">A</text>;
}

function ToolButton({ active, children, label, onClick, onDragStart, disabled }) {
  return (
    <button
      type="button"
      className={[styles.toolButton, active ? styles.toolButtonActive : ''].join(' ')}
      title={label}
      onClick={onClick}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default function Toolbar({
  mode,
  activeShape,
  onModeChange,
  onShapeSelect,
  fileName,
  onFileNameChange,
  onSave,
  canUndo,
  canRedo,
  readMode,
  onToggleReadMode,
  expandAll,
  collapseAll,
  allExpanded,
  onToggleAll,
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.centerDock}>
        <div className={styles.toolRail}>
          <ToolButton active={readMode} label={readMode ? "Unlock Edit mode" : "Lock Read mode"} onClick={onToggleReadMode}>
            <LockIcon />
          </ToolButton>

          <div className={styles.sep} />

          <input
            className={styles.fileNameInput}
            value={fileName}
            onChange={(event) => onFileNameChange(event.target.value)}
            placeholder="Untitled diagram"
          />

          <div className={styles.sep} />

          <ToolButton active={mode === 'pan'} label="Hand tool" onClick={() => onModeChange('pan')} disabled={readMode}>
            <HandIcon />
          </ToolButton>

          <ToolButton active={mode === 'select' && !activeShape} label="Select tool" onClick={() => onModeChange('select')}>
            <SelectIcon />
          </ToolButton>

          <ToolButton active={mode === 'connect'} label="Connect tool" onClick={() => onModeChange('connect')} disabled={readMode}>
            <ConnectIcon />
          </ToolButton>

          <div className={styles.sep} />

          {SHAPE_TOOLS.map((shape) => (
            <ToolButton
              key={shape.id}
              active={activeShape === shape.id}
              label={shape.label}
              disabled={readMode}
              onClick={() => onShapeSelect(shape.id)}
              onDragStart={(event) => {
                event.dataTransfer.setData('shape', shape.id);
                event.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <ShapeIcon shapeId={shape.id} />
              </svg>
              <span className={styles.toolIndex}>{shape.short}</span>
            </ToolButton>
          ))}

          <div className={styles.sep} />

          <button
            type="button"
            className={styles.actionTextButton}
            onClick={onToggleAll}   // ✅ REQUIRED
            title={allExpanded ? 'Collapse All' : 'Expand All'}
          >
            {allExpanded ? (
              <ShrinkOutlined
              // style={{ marginRight: 6 }}
              />
            ) : (
              <ArrowsAltOutlined
              // style={{ marginRight: 6 }} 
              />
            )}
            {/* {allExpanded ? 'Collapse All' : 'Expand All'} */}
          </button>

          <button type="button" className={styles.saveButton} onClick={onSave}>
            <SaveIcon />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
