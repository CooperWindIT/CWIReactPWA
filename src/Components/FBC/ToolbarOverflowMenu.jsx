import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The ⋮ at the end of the toolbar. Tools that are used occasionally live in
// here rather than taking a permanent slot: the toolbar is already long, and
// a row of buttons nobody recognises is worse than a short list with names on
// it. Everything in here is reachable by its own key as well, which is what
// the letters down the right-hand side are for.
//
// The menu is rendered into the page body, not inside the toolbar: the
// toolbar is a rounded, clipped bar, and a panel hanging out of the bottom of
// it would be cut off at the edge.

const MENU_WIDTH = 236;

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <circle cx="7" cy="8" r="1.4" />
      <path d="M3 14l4-3.5 3.5 3 2.5-2 4 3.5" strokeLinejoin="round" />
    </svg>
  );
}

function BucketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2.5l7.5 7.5-5.5 5.5a2 2 0 0 1-2.8 0L3 11.3a2 2 0 0 1 0-2.8L8 2.5Z" strokeLinejoin="round" />
      <path d="M5.4 6.2l7.4 7.4" />
      <path d="M17.2 12.4c.9 1.3.9 2.6 0 3.3a1.9 1.9 0 0 1-2.4 0c-.9-.7-.9-2 0-3.3l1.2-1.7 1.2 1.7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LassoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="10" cy="8" rx="7" ry="5" />
      <path d="M6.5 12.6c-.6 1.4-.3 2.6.8 3.1" strokeLinecap="round" />
      <circle cx="8" cy="16.6" r="1.3" />
    </svg>
  );
}

function LaserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16.5 3.5 8 12" strokeLinecap="round" />
      <path d="M11 3.2v2M14.8 7.8h2M13.9 4.4l1.4-1.4" strokeLinecap="round" />
      <path d="M7.6 11.6 3.4 16.6l5-4.2a1 1 0 0 0-.8-.8Z" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="4.5" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.5" r="1.4" />
    </svg>
  );
}

export default function ToolbarOverflowMenu({
  mode,
  onModeChange,
  onInsertImage,
  theme,
  readMode,
}) {
  const isDark = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const colors = {
    bg: isDark ? '#2b2840' : '#ffffff',
    border: isDark ? '#413d5c' : '#e4e4ef',
    ink: isDark ? '#f1f1f5' : '#1f1f1f',
    muted: isDark ? '#b8b5cc' : '#6b6880',
    hover: isDark ? '#38344f' : '#f1f0f7',
    activeBg: isDark ? '#4a4284' : '#e0dfff',
    accent: '#696eff',
  };

  // Choosing a tool that is already the active one drops back to select, the
  // way the Arrow button in the toolbar does — otherwise the only way out of
  // a tool is to know which button turns it off.
  const pickMode = (id) => onModeChange(mode === id ? 'select' : id);

  const allItems = [
    {
      id: 'image',
      label: 'Insert image',
      // Not 9: the Line tool already prints 9 in the toolbar, and now that
      // those numbers actually do something the two would fight.
      hint: 'I',
      icon: <ImageIcon />,
      run: () => onInsertImage?.(),
    },
    {
      id: 'fill',
      label: 'Bucket fill',
      hint: 'B',
      icon: <BucketIcon />,
      run: () => pickMode('fill'),
    },
    {
      id: 'lasso',
      label: 'Lasso selection',
      hint: 'Q',
      icon: <LassoIcon />,
      run: () => pickMode('lasso'),
    },
    {
      id: 'laser',
      label: 'Laser pointer',
      hint: 'K',
      icon: <LaserIcon />,
      // The one tool that survives a locked diagram. It draws nothing and
      // changes nothing — it is for pointing at things while explaining them,
      // which is exactly what a locked diagram is usually open for.
      allowInReadMode: true,
      run: () => pickMode('laser'),
    },
  ];

  const items = readMode
    ? allItems.filter((item) => item.allowInReadMode)
    : allItems;

  // The ⋮ lights up while one of its own tools is the active one, so a tool
  // chosen in here doesn't look like no tool at all from the toolbar.
  const holdsActiveTool = items.some((item) => item.id !== 'image' && item.id === mode);

  useEffect(() => {
    if (!open) return undefined;

    const onDocDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      // Stopped before the editor's own Escape handler, which would clear the
      // selection as well as closing this.
      event.stopPropagation();
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onDocDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 8;

    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - MENU_WIDTH - margin),
    );

    let top = rect.bottom + margin;
    if (top + menu.offsetHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - menu.offsetHeight - margin);
    }

    setPosition({ top, left });
  }, [open]);

  const choose = useCallback((item) => {
    setOpen(false);
    item.run();
  }, []);

  if (!items.length) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="More tools"
        aria-label="More tools"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: 36,
          height: 36,
          boxSizing: 'border-box',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: 'none',
          borderRadius: 9,
          cursor: 'pointer',
          background: (open || holdsActiveTool) ? colors.activeBg : 'transparent',
          color: holdsActiveTool ? colors.accent : colors.ink,
        }}
      >
        <DotsIcon />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 4000,
            boxSizing: 'border-box',
            width: MENU_WIDTH,
            padding: 6,
            borderRadius: 12,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
            color: colors.ink,
            fontSize: 13,
            userSelect: 'none',
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {items.map((item) => {
            const active = item.id === mode;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => choose(item)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 8,
                  background: active ? colors.activeBg : 'transparent',
                  color: colors.ink,
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(event) => {
                  if (!active) event.currentTarget.style.background = colors.hover;
                }}
                onMouseLeave={(event) => {
                  if (!active) event.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', color: active ? colors.accent : colors.muted }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ color: colors.muted, fontSize: 11 }}>{item.hint}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}