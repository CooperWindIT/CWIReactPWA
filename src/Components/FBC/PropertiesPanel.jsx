import React from 'react';
import styles from './PropertiesPanel.module.css';

const AUTO_STROKE = 'theme-auto';
const FONT_FAMILIES = ['Segoe UI', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
const STROKE_COLORS = [AUTO_STROKE, '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#7048e8'];
const FILL_COLORS = ['transparent', '#fdeaea', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff'];

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

function Swatch({ color, active, onClick, transparent, autoStrokePreview }) {
  return (
    <button
      type="button"
      className={[styles.swatch, active ? styles.swatchActive : '', transparent ? styles.swatchTransparent : '', color === AUTO_STROKE ? styles.swatchAutoStroke : ''].join(' ')}
      style={
        transparent
          ? undefined
          : color === AUTO_STROKE
            ? { background: autoStrokePreview }
            : { background: color }
      }
      onClick={onClick}
      aria-label={transparent ? 'Transparent' : color === AUTO_STROKE ? 'Automatic stroke' : color}
    />
  );
}

export default function PropertiesPanel({ node, onUpdate, onDelete, readMode, theme }) {
  if (!node || readMode) return <div className={styles.panel} />;

  const autoStrokePreview = theme === 'dark' ? '#ffffff' : '#1f1f1f';

  return (
    <div className={[styles.panel, styles.open].join(' ')}>
      <div className={styles.header}>Shape properties</div>

      <div className={styles.content}>
        <div className={styles.field}>
          <div className={styles.label}>Label</div>
          <input
            className={styles.input}
            value={node.label || ''}
            onChange={(event) => onUpdate({ label: event.target.value })}
            placeholder="Shape label"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <div className={styles.label}>Font family</div>
            <select
              className={styles.input}
              value={node.fontFamily || 'Segoe UI'}
              onChange={(event) => onUpdate({ fontFamily: event.target.value })}
            >
              {FONT_FAMILIES.map((fontFamily) => (
                <option key={fontFamily} value={fontFamily}>
                  {fontFamily}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Font size</div>
            <input
              className={styles.input}
              type="number"
              min={10}
              value={node.fontSize || 16}
              onChange={(event) => onUpdate({ fontSize: Math.max(10, +event.target.value) })}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Stroke</div>
          <div className={styles.swatches}>
            {STROKE_COLORS.map((color) => (
              <Swatch
                key={color}
                color={color}
                autoStrokePreview={autoStrokePreview}
                active={(!node.strokeColor ? AUTO_STROKE : node.strokeColor) === color}
                onClick={() => onUpdate({ strokeColor: color })}
              />
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Background</div>
          <div className={styles.swatches}>
            {FILL_COLORS.map((color) => (
              <Swatch
                key={color}
                color={color}
                transparent={color === 'transparent'}
                active={(node.fillColor || 'transparent') === color}
                onClick={() => onUpdate({ fillColor: color })}
              />
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <div className={styles.label}>Width</div>
            <input
              className={styles.input}
              type="number"
              min={40}
              value={node.w}
              onChange={(event) => onUpdate({ w: Math.max(40, +event.target.value) })}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Height</div>
            <input
              className={styles.input}
              type="number"
              min={30}
              value={node.h}
              onChange={(event) => onUpdate({ h: Math.max(30, +event.target.value) })}
            />
          </div>
        </div>

        <button type="button" className={styles.deleteBtn} onClick={onDelete}>
          <TrashIcon />
          <span>Delete shape</span>
        </button>
      </div>
    </div>
  );
}
