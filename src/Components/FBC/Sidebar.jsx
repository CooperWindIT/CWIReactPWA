import React from 'react';
import styles from './Sidebar.module.css';
import { CloudDownloadOutlined, DeleteOutlined } from '@ant-design/icons';

const FILL_COLORS = ['transparent', '#fdeaea', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff'];
const FILL_Dark_COLORS = ['transparent', '#fdeaea', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff'];

function fmt(ts) {
  const date = new Date(ts);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const AUTO_STROKE = 'auto';

function Swatch({ color, active, onClick, transparent, autoStrokePreview }) {
  return (
    <button
      type="button"
      className={[
        styles.swatch,
        active ? styles.swatchActive : '',
        transparent ? styles.swatchTransparent : '',
        color === AUTO_STROKE ? styles.swatchAutoStroke : ''
      ].join(' ')}
      style={
        transparent
          ? undefined
          : color === AUTO_STROKE
            ? { background: autoStrokePreview }
            : { background: color }
      }
      onClick={onClick}
      aria-label={
        transparent
          ? 'Transparent'
          : color === AUTO_STROKE
            ? 'Automatic stroke'
            : color
      }
    />
  );
}



export default function Sidebar({
  open,
  onToggle,
  files,
  currentFileId,
  onNewFile,
  onLoadFile,
  onDeleteFile,
  theme,
  onThemeChange,
  showGrid,
  handleGridToggle,
  onChangeCanvasBg,
}) {
  const autoStrokePreview = theme === 'dark' ? '#696969' : '#1f1f1f';

  return (
    <>
      <button type="button" className={styles.menuButton} onClick={onToggle} aria-label="Open menu">
        <MenuIcon />
      </button>

      {open && <button type="button" className={styles.backdrop} onClick={onToggle} aria-label="Close menu" />}

      <aside className={[styles.drawer, open ? styles.open : ''].join(' ')}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Files</div>

          <button type="button" className={styles.primaryAction} onClick={onNewFile}>
            <FolderIcon />
            <span>New diagram</span>
          </button>

          <div className={styles.fileList}>
            {files.length === 0 && <div className={styles.empty}>No saved files yet</div>}

            {files.map((file) => (
              <div
                key={file.id}
                className={[styles.fileItem, currentFileId === file.id ? styles.fileItemActive : ''].join(' ')}
              >
                <button
                  type="button"
                  className={styles.fileMain}
                  onClick={() => {
                    onLoadFile(file.id);
                    onToggle();
                  }}
                >
                  <span className={styles.fileName}>{file.name || 'Untitled diagram'}</span>
                  <span className={styles.fileMeta}>{fmt(file.updatedAt)}</span>
                </button>

                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => onDeleteFile(file.id)}
                  aria-label="Delete file"
                >
                  <DeleteOutlined />
                </button>

                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Download file"
                >
                  <CloudDownloadOutlined />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Theme</div>

          <div className={styles.themeRow}>
            <button
              type="button"
              className={[styles.themeBtn, theme === 'light' ? styles.themeBtnActive : ''].join(' ')}
              onClick={() => onThemeChange('light')}
            >
              <SunIcon />
              <span>Light</span>
            </button>

            <button
              type="button"
              className={[styles.themeBtn, theme === 'dark' ? styles.themeBtnActive : ''].join(' ')}
              onClick={() => onThemeChange('dark')}
            >
              <MoonIcon />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <div
            onClick={handleGridToggle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
              fontSize: 14,
            }}
          >
            <span style={{ color: theme === "dark" ? "#fff" : "#000" }}>
              Grid
            </span>

            <span
              style={{
                fontSize: 16,
                fontWeight: "bold",
                opacity: showGrid ? 1 : 0.1,
                transition: "opacity 0.2s ease",
                color: theme === "dark" ? "#fff" : "#000", // ✅ FIX
              }}
            >
              ✓
            </span>
          </div>
        </div>


        <div className={styles.section}>
          <div className={styles.bgSection}>
            <div className={styles.bgLabel}>Canvas Background</div>

            <div className={styles.bgSwatches}>
              {FILL_COLORS.map((color) => (
                <button
                  key={color}
                  className={[
                    styles.bgSwatch,
                    color === 'transparent' ? styles.bgSwatchTransparent : ''
                  ].join(' ')}
                  style={color !== 'transparent' ? { background: color } : undefined}
                  onClick={() => onChangeCanvasBg(color === 'transparent' ? 'transparent' : color)}
                />
              ))}
            </div>
          </div>
        </div>
      </aside >
    </>
  );
}
