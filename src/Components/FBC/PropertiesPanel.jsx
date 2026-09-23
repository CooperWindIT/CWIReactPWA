import React, { useState } from 'react';
import { Tooltip } from 'antd';
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

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Sliders icon — reads as "adjust this thing's settings".
const SlidersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 21v-7" />
    <path d="M4 10V3" />
    <path d="M12 21v-9" />
    <path d="M12 8V3" />
    <path d="M20 21v-5" />
    <path d="M20 12V3" />
    <path d="M1 14h6" />
    <path d="M9 8h6" />
    <path d="M17 16h6" />
  </svg>
);

// Keyframes can't be expressed as inline styles, so the floating button's
// animations ship with the component rather than depending on an edit to
// PropertiesPanel.module.css. Class names are prefixed to avoid collisions.
const FAB_STYLES = `
@keyframes fcPropsFabFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes fcPropsFabGlow {
  0%, 100% { box-shadow: 0 8px 22px rgba(79, 70, 229, 0.45), 0 0 0 0 rgba(139, 92, 246, 0.55); }
  50%      { box-shadow: 0 10px 26px rgba(79, 70, 229, 0.55), 0 0 0 12px rgba(139, 92, 246, 0); }
}
@keyframes fcPropsFabSheen {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.fcPropsFab {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 60;
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(120deg, #6366f1, #8b5cf6, #ec4899, #6366f1);
  background-size: 300% 300%;
  animation:
    fcPropsFabFloat 3.2s ease-in-out infinite,
    fcPropsFabGlow 2.4s ease-in-out infinite,
    fcPropsFabSheen 6s ease infinite;
  transition: transform 120ms ease;
}
.fcPropsFab:hover { transform: scale(1.08); }
.fcPropsFab:active { transform: scale(0.96); }
/* Nothing selected: stays put and stops calling for attention, since there's
   nothing for it to open yet. */
.fcPropsFab.fcPropsFabIdle {
  background: #94a3b8;
  background-size: auto;
  animation: none;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
  opacity: 0.75;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: reduce) {
  .fcPropsFab { animation: none; }
}
`;

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

export default function PropertiesPanel({ node, onUpdate, onDelete, onClose, readMode, theme }) {
  // The panel no longer springs open the moment a shape is selected — it used
  // to sit on top of the canvas and block the very shapes being worked on.
  // It's opened deliberately from the floating button, and stays open across
  // selections until it's closed again.
  const [open, setOpen] = useState(false);

  // Read mode has nothing to edit, so neither the panel nor the button apply.
  if (readMode) return <div className={styles.panel} />;

  const hasNode = Boolean(node);

  const handleClose = () => {
    setOpen(false);
    // The selection is deliberately left alone: closing is about getting the
    // panel off the canvas, and the shape should still be selected so the
    // button reopens straight onto it.
    if (typeof onClose === 'function') onClose();
  };

  if (!open || !hasNode) {
    return (
      <>
        <style>{FAB_STYLES}</style>
        <div className={styles.panel} />

        <Tooltip
          title={hasNode ? 'Edit shape properties' : 'Select a shape first, then open its properties'}
          placement="left"
        >
          <button
            type="button"
            className={['fcPropsFab', hasNode ? '' : 'fcPropsFabIdle'].join(' ')}
            onClick={() => hasNode && setOpen(true)}
            disabled={!hasNode}
            aria-label="Open shape properties"
          >
            <SlidersIcon />
          </button>
        </Tooltip>
      </>
    );
  }

  const autoStrokePreview = theme === 'dark' ? '#ffffff' : '#1f1f1f';

  return (
    <div className={[styles.panel, styles.open].join(' ')}>
      <div
        className={styles.header}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <span>Shape properties</span>

        <Tooltip title="Close" placement="left">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close shape properties"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0.75,
              flexShrink: 0,
            }}
            onMouseEnter={(event) => { event.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(event) => { event.currentTarget.style.opacity = '0.75'; }}
          >
            <CloseIcon />
          </button>
        </Tooltip>
      </div>

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