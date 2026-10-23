import React, { useMemo, useState, useEffect } from 'react';
import styles from './Toolbar.module.css';
import { ArrowsAltOutlined, SearchOutlined, ShrinkOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Input, Popover, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';

const SHAPE_TOOLS = [
  { id: 'rect', label: 'Rectangle', short: '2' },
  { id: 'rounded', label: 'Rounded', short: '3' },
  { id: 'diamond', label: 'Diamond', short: '4' },
  { id: 'circle', label: 'Circle', short: '5' },
  { id: 'oval', label: 'Oval', short: '1' },
  { id: 'parallelogram', label: 'Parallelogram', short: '6' },
  { id: 'hexagon', label: 'Hexagon', short: '7' },
  { id: 'cylinder', label: 'Cylinder', short: '8' },
  { id: 'line', label: 'Line', short: '9' },
  { id: 'text', label: 'Text', short: '0' },
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

const AutoArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4" width="6" height="5" rx="1" />
    <rect x="15.5" y="15" width="6" height="5" rx="1" />
    <path d="M8.5 6.5h4a2 2 0 0 1 2 2v7" />
    <path d="m12.2 13.2 2.3 2.3 2.3-2.3" />
  </svg>
);

const EraserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 20H20" />
    <path d="M14.5 4.5 4.6 14.4a2 2 0 0 0 0 2.8l2.6 2.6a2 2 0 0 0 2.8 0l9.9-9.9a2 2 0 0 0 0-2.8l-2.6-2.6a2 2 0 0 0-2.8 0z" />
    <path d="M9.5 9.5 16 16" />
  </svg>
);

// A plain arrow rather than an elbow: the tool no longer draws one fixed
// shape, it draws whatever the arrow panel has selected.
function ArrowToolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M3.5,16.5 L16,4"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M16.8,3.2 L10.6,4.6 L15.4,9.4 Z" fill="currentColor" />
    </svg>
  );
}

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </svg>
);

function ShapeIcon({ shapeId }) {
  if (shapeId === 'rect') return <rect x="3" y="5" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'rounded') return <rect x="3" y="5" width="18" height="14" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'diamond') return <polygon points="12,3 21,12 12,21 3,12" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'circle') return <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'oval') return <ellipse cx="12" cy="12" rx="9.5" ry="6" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'parallelogram') return <polygon points="6,5 21,5 18,19 3,19" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'hexagon') return <polygon points="7,4 17,4 22,12 17,20 7,20 2,12" fill="none" stroke="currentColor" strokeWidth="1.8" />;
  if (shapeId === 'cylinder') {
    return (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 6v9c0 1.7 3.1 3 7 3s7-1.3 7-3V6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    );
  }
  if (shapeId === 'line') {
    return <line x1="4" y1="19" x2="20" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />;
  }
  return <text x="7" y="17" fontSize="16" fill="currentColor" fontWeight="700">A</text>;
}

function ToolButton({ active, children, label, onClick, onDragStart, disabled, className }) {
  return (
    <button
      type="button"
      className={[styles.toolButton, active ? styles.toolButtonActive : '', className || ''].join(' ')}
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
  allExpanded,
  onToggleAll,
  searchQuery,
  onSearchQueryChange,
  searchCaseSensitive,
  onSearchCaseSensitiveChange,
  searchWholeWord,
  onSearchWholeWordChange,
  searchResultCount,
  activeSearchIndex,
  onSearchNext,
  onSearchPrev,

  autoArrowEnabled,
  onToggleAutoArrow,

  isVersionMode,
  onSubmitVersion,
  isVersionEditMode,
  isVersionViewMode,
  onSubmitEditVersion,
  sharedWriteAccess

}) {
  const navigate = useNavigate();

  const [searchActive, setSearchActive] = useState(false);

  const searchLabel = useMemo(() => {
    if (!searchQuery.trim()) return '0 results';
    if (searchResultCount === 0) return 'No results';
    return `${activeSearchIndex + 1} of ${searchResultCount}`;
  }, [activeSearchIndex, searchQuery, searchResultCount]);

  const content = (
    <div className={styles.searchPopover}>
      <div style={{ width: 250 }}>
        <Input
          autoFocus
          placeholder="Search nodes by label..."
          allowClear
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          prefix={<SearchOutlined />}
        />

        <div className={styles.searchOptions}>
          <span className={styles.searchMeta}>{searchLabel}</span>

          <button type="button" className={styles.searchNavBtn} onClick={onSearchPrev} disabled={searchResultCount === 0}>
            Prev
          </button>

          <button type="button" className={styles.searchNavBtn} onClick={onSearchNext} disabled={searchResultCount === 0}>
            Next
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!searchActive) {
      onSearchQueryChange('');
      onSearchCaseSensitiveChange(false);
      onSearchWholeWordChange(false);
    }
  }, [searchActive]);

  return (
    <div>
      <div className={styles.shell}>
        <div className={styles.centerDock}>
          <div className={styles.toolRail}>
            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center"
              onClick={() => navigate("/user-modules")}
            >
              <ArrowLeftOutlined className="me-1" />
              Portal
            </button>
            <ToolButton active={readMode} label={readMode ? 'Unlock Edit mode' : 'Lock Read mode'} onClick={onToggleReadMode}>
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

            <ToolButton
              active={mode === 'erase'}
              label="Eraser — hold and drag over items to delete them"
              onClick={() => onModeChange('erase')}
              disabled={readMode}
            >
              <EraserIcon />
            </ToolButton>

            <Tooltip title="Arrow — drag from one shape to another">
  <span style={{ display: 'inline-block' }}>
    <ToolButton
      active={mode === 'arrow'}
      label="Arrow"
      // Clicking the active tool drops back to select, so the user can get out
      // of arrow mode without hunting for the pointer button.
      onClick={() => onModeChange(mode === 'arrow' ? 'select' : 'arrow')}
      disabled={readMode}
    >
      <ArrowToolIcon />
    </ToolButton>
  </span>
</Tooltip>

            <Tooltip
              title={
                autoArrowEnabled
                  ? 'Auto arrow is ON — each new shape connects to the previous one. Click to turn off.'
                  : 'Auto arrow is OFF — new shapes are placed unconnected. Click to turn on.'
              }
            >
              <span style={{ display: 'inline-block' }}>
                <ToolButton
                  active={autoArrowEnabled}
                  label="Auto arrow"
                  onClick={onToggleAutoArrow}
                  disabled={readMode}
                >
                  <AutoArrowIcon />
                </ToolButton>
              </span>
            </Tooltip>

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
              onClick={onToggleAll}
              title={allExpanded ? 'Collapse All' : 'Expand All'}
            >
              {allExpanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
            </button>
            {isVersionEditMode ? (
              <button
                type="button"
                className={styles.saveButton}
                onClick={onSubmitEditVersion}
                data-bs-toggle="offcanvas"
                data-bs-target="#offcanvasRightEditDocVer"
              >
                <SaveIcon />
                <span>Submit Edit Version</span>
              </button>
            ) : isVersionMode ? (
              <button
                type="button"
                className={styles.saveButton}
                onClick={onSubmitVersion}
                data-bs-toggle="offcanvas"
                data-bs-target="#offcanvasRightAddDocVersion"
              >
                <SaveIcon />
                <span>Submit Version</span>
              </button>
            ) : (
              <Tooltip
                title={
                  isVersionViewMode
                    ? "You can't save in View Mode. Please choose Edit Version to make changes."
                    : "Save"
                }
              >
                <span style={{ display: "inline-block" }}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={onSave}
                    disabled={isVersionViewMode || !sharedWriteAccess}
                  >
                    <SaveIcon />
                    <span>Save</span>
                  </button>
                </span>
              </Tooltip>
            )}
          </div>

          <div className={styles.toolRail}>
            <Popover
              content={content}
              trigger="click"
              open={searchActive}
              onOpenChange={(visible) => {
                if (visible) { setSearchActive(visible); }
              }}
              className='searchpopover'
              placement="bottomRight"
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            >
              <Tooltip title="Search node labels">
                <div>
                  <ToolButton
                    active={searchActive || Boolean(searchQuery)}
                    className={styles.actionButton}
                    onClick={() => setSearchActive((prev) => !prev)}
                    label="Search"
                  >
                    <SearchOutlined />
                  </ToolButton>
                </div>
              </Tooltip>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}