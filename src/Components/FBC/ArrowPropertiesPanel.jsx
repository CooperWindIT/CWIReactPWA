import React from 'react';
import {
  ARROW_TYPE,
  STROKE_WIDTHS,
  STROKE_STYLE,
  SLOPPINESS,
  STROKE_PALETTE,
  ARROWHEAD,
  ARROWHEAD_OPTIONS,
  resolveArrowStyle,
} from './connectionRouting';

// A tiny stub of line ending in the head being offered, so the choice is made
// by looking at the shape rather than by reading its name.
//
// The start-of-line previews are mirrored rather than given their own
// geometry: a head on the start of a line is the same shape pointing the other
// way, and drawing it twice would be two things to keep in step.
function ArrowheadPreview({ type, pointingLeft }) {
  const body = type === ARROWHEAD.NONE
    ? <line x1="5" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    : <line x1="2" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />;

  let head = null;

  if (type === ARROWHEAD.ARROW) {
    head = (
      <path
        d="M13,5.5 L18.5,10 L13,14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  } else if (type === ARROWHEAD.TRIANGLE) {
    head = <path d="M12.5,5.5 L18.5,10 L12.5,14.5 Z" fill="currentColor" />;
  } else if (type === ARROWHEAD.TRIANGLE_OUTLINE) {
    head = (
      <path
        d="M12.5,5.5 L18.5,10 L12.5,14.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    );
  } else {
    // "No head" is shown as the line simply stopping, with a small cross to
    // say it was a deliberate choice rather than a blank button.
    head = (
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <line x1="2" y1="7" x2="6" y2="13" />
        <line x1="6" y1="7" x2="2" y2="13" />
      </g>
    );
  }

  return (
    <svg
      width="21"
      height="20"
      viewBox="0 0 21 20"
      style={pointingLeft ? { transform: 'scaleX(-1)' } : undefined}
    >
      {body}
      {head}
    </svg>
  );
}

// Section and OptionButton are defined at module scope on purpose. Declared
// inside the component they'd be a brand new component type on every render,
// so React would tear down and rebuild every control each time a value
// changed — which shows up as the colour picker closing itself and the opacity
// slider dropping the drag halfway through.
function Section({ title, labelColor, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: labelColor,
          marginBottom: 7,
          letterSpacing: 0.1,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

// One button shape for every option row, so the panel reads as a single
// control set rather than six different widgets.
function OptionButton({ active, onClick, title, children, disabled, colors }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: 9,
        cursor: disabled ? 'default' : 'pointer',
        background: active ? colors.btnActiveBg : colors.btnBg,
        border: `1px solid ${active ? colors.btnActiveBorder : 'transparent'}`,
        color: colors.ink,
        opacity: disabled ? 0.35 : 1,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      {children}
    </button>
  );
}

// The arrow styling island. It appears in two situations, and the difference
// matters:
//
//   * an arrow is selected   → edits apply to that arrow, immediately
//   * the arrow tool is live → edits set the defaults for the next arrow drawn
//
// Same controls either way, so the user learns one panel, but the heading says
// which mode they're in so a change never lands somewhere unexpected.
export default function ArrowPropertiesPanel({
  connection,
  arrowDefaults,
  theme,
  onChange,
  onDelete,
  onClose,
}) {
  const isDark = theme === 'dark';
  const palette = STROKE_PALETTE[isDark ? 'dark' : 'light'];

  const editingExisting = Boolean(connection);

  // Which settings the controls display. With an arrow selected it has to be
  // that arrow's own style — merging the defaults in would light up buttons
  // the arrow doesn't actually use, and the user would see "dashed" selected
  // on a solid line. With nothing selected the defaults ARE the subject.
  const style = editingExisting
    ? resolveArrowStyle(connection)
    : resolveArrowStyle({}, arrowDefaults);

  const colors = {
    panelBg: isDark ? '#232136' : '#ffffff',
    border: isDark ? '#3a3750' : '#e4e4ef',
    label: isDark ? '#b8b5cc' : '#6b6880',
    btnBg: isDark ? '#2b2840' : '#f1f0f7',
    btnActiveBg: isDark ? '#4a4284' : '#e0dfff',
    btnActiveBorder: '#696eff',
    ink: isDark ? '#f1f1f5' : '#1f1f1f',
  };

  const set = (patch) => onChange(patch);

  const stroke = style.stroke || (isDark ? '#e9ecef' : '#1e1e1e');

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 30,
        width: 232,
        maxHeight: 'calc(100% - 32px)',
        overflowY: 'auto',
        padding: '16px 16px 18px',
        borderRadius: 14,
        background: colors.panelBg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 12px 34px rgba(0,0,0,0.22)',
        fontSize: 13,
        color: colors.ink,
        userSelect: 'none',
      }}
      // The panel floats over the canvas; without this a click inside it would
      // also reach the canvas and clear the very arrow being styled.
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: colors.label }}>
          {editingExisting ? 'Arrow' : 'Arrow defaults'}
        </span>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: colors.label,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <Section labelColor={colors.label} title="Stroke">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => set({ stroke: color })}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              borderRadius: 7,
              background: color,
              cursor: 'pointer',
              border: stroke.toLowerCase() === color.toLowerCase()
                ? `2px solid ${colors.btnActiveBorder}`
                : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              outline: stroke.toLowerCase() === color.toLowerCase()
                ? `2px solid ${colors.panelBg}`
                : 'none',
              outlineOffset: -4,
            }}
          />
        ))}

        <div
          style={{
            width: 1,
            height: 24,
            margin: '0 2px',
            background: colors.border,
          }}
        />

        {/* Anything outside the five swatches. The native picker is the quickest
            way to offer the full range without building a second popover. */}
        <label
          title="Custom colour"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: stroke,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
            cursor: 'pointer',
            display: 'block',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <input
            type="color"
            value={stroke}
            onChange={(event) => set({ stroke: event.target.value })}
            style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none' }}
          />
        </label>
      </Section>

      <Section labelColor={colors.label} title="Stroke width">
        {STROKE_WIDTHS.map((option) => (
          <OptionButton colors={colors}
            key={option.id}
            title={option.label}
            active={Math.abs(style.strokeWidth - option.value) < 0.01}
            onClick={() => set({ strokeWidth: option.value })}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <line
                x1="3" y1="10" x2="17" y2="10"
                stroke="currentColor"
                strokeWidth={option.value}
                strokeLinecap="round"
              />
            </svg>
          </OptionButton>
        ))}
      </Section>

      <Section labelColor={colors.label} title="Stroke style">
        {[
          { id: STROKE_STYLE.SOLID, label: 'Solid', dash: undefined },
          { id: STROKE_STYLE.DASHED, label: 'Dashed', dash: '4 3' },
          { id: STROKE_STYLE.DOTTED, label: 'Dotted', dash: '0.01 3.2' },
        ].map((option) => (
          <OptionButton colors={colors}
            key={option.id}
            title={option.label}
            active={style.strokeStyle === option.id}
            onClick={() => set({ strokeStyle: option.id })}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <line
                x1="3" y1="10" x2="17" y2="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={option.dash}
              />
            </svg>
          </OptionButton>
        ))}
      </Section>

      <Section labelColor={colors.label} title="Sloppiness">
        {[
          { id: SLOPPINESS.ARCHITECT, label: 'Architect', d: 'M3,12 C7,9 13,9 17,12' },
          { id: SLOPPINESS.ARTIST, label: 'Artist', d: 'M3,12 C6,8 8,14 11,10 C13,7.5 15,12 17,10' },
          { id: SLOPPINESS.CARTOONIST, label: 'Cartoonist', d: 'M3,13 C5,7 7,15 9,9 C11,5 13,15 15,9 C16,7 16.5,11 17,10' },
        ].map((option) => (
          <OptionButton colors={colors}
            key={option.id}
            title={option.label}
            active={style.sloppiness === option.id}
            onClick={() => set({ sloppiness: option.id })}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d={option.d} stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </svg>
          </OptionButton>
        ))}
      </Section>

      <Section labelColor={colors.label} title="Arrow type">
        {[
          {
            id: ARROW_TYPE.STRAIGHT,
            label: 'Straight',
            body: <path d="M4,16 L16,4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
            head: 'M16,4 L11.5,5 L15,8.5 Z',
          },
          {
            id: ARROW_TYPE.CURVE,
            label: 'Curved',
            body: <path d="M4,16 C4,8 9,4 16,4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
            head: 'M16,4 L11.5,2.2 L12,6.5 Z',
          },
          {
            id: ARROW_TYPE.ELBOW,
            label: 'Elbow',
            body: <path d="M4,16 L10,16 L10,5 L16,5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
            head: 'M16,5 L12,3 L12,7 Z',
          },
        ].map((option) => (
          <OptionButton colors={colors}
            key={option.id}
            title={option.label}
            active={style.arrowType === option.id}
            onClick={() => set({ arrowType: option.id })}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              {option.body}
              <path d={option.head} fill="currentColor" />
            </svg>
          </OptionButton>
        ))}
      </Section>

      <Section labelColor={colors.label} title="Arrowhead — start">
        {ARROWHEAD_OPTIONS.map((option) => (
          <OptionButton
            colors={colors}
            key={`start-${option.id}`}
            title={option.label}
            active={style.startArrowhead === option.id}
            onClick={() => set({ startArrowhead: option.id })}
          >
            <ArrowheadPreview type={option.id} pointingLeft />
          </OptionButton>
        ))}
      </Section>

      <Section labelColor={colors.label} title="Arrowhead — end">
        {ARROWHEAD_OPTIONS.map((option) => (
          <OptionButton
            colors={colors}
            key={`end-${option.id}`}
            title={option.label}
            active={style.endArrowhead === option.id}
            onClick={() => set({ endArrowhead: option.id })}
          >
            <ArrowheadPreview type={option.id} />
          </OptionButton>
        ))}
      </Section>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: colors.label, marginBottom: 7 }}>
          Opacity
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={10}
          value={style.opacity}
          onChange={(event) => set({ opacity: Number(event.target.value) })}
          style={{ width: '100%', accentColor: colors.btnActiveBorder, cursor: 'pointer' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: colors.label,
            marginTop: 2,
          }}
        >
          <span>10</span>
          <span>{style.opacity}</span>
          <span>100</span>
        </div>
      </div>

      {editingExisting && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(connection.id)}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '8px 0',
            borderRadius: 9,
            border: 'none',
            background: isDark ? 'rgba(224,49,49,0.16)' : '#fdeaea',
            color: '#e03131',
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 500,
          }}
        >
          Delete arrow
        </button>
      )}
    </div>
  );
}