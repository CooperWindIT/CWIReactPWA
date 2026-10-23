import React, { useEffect, useRef } from 'react';

// A small right-click menu for the canvas. Rendered at fixed viewport
// coordinates rather than inside the canvas, so the canvas's zoom transform
// doesn't scale or clip it.
//
// `items` is a flat list; an entry of { separator: true } draws a divider,
// and a disabled entry still renders (greyed) so the menu doesn't jump around
// depending on what happens to be selected.
export default function ContextMenu({ x, y, items, onClose, theme }) {
  const menuRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    // Any press outside, any scroll, Escape, or another right-click closes it.
    // Listening in the capture phase means the menu is gone before whatever
    // was clicked underneath starts handling the event.
    const handlePointerDown = (event) => {
      if (menuRef.current && menuRef.current.contains(event.target)) return;
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('contextmenu', handlePointerDown, true);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('contextmenu', handlePointerDown, true);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Keep the menu on screen when it's opened near the right or bottom edge.
  const MENU_W = 230;
  const estimatedH = items.length * 34 + 12;
  const left = Math.min(x, (window.innerWidth || 0) - MENU_W - 8);
  const top = Math.min(y, (window.innerHeight || 0) - estimatedH - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: Math.max(8, left),
        top: Math.max(8, top),
        zIndex: 100,
        minWidth: MENU_W,
        padding: '6px 0',
        borderRadius: 10,
        background: isDark ? '#232136' : '#ffffff',
        border: `1px solid ${isDark ? '#3a3750' : '#e4e4ef'}`,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
        fontSize: 13,
        color: isDark ? '#f1f1f5' : '#1f1f1f',
        userSelect: 'none',
      }}
      // The menu lives above the canvas; without this a click inside it would
      // also reach the canvas and clear the very selection being acted on.
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${index}`}
              style={{
                height: 1,
                margin: '5px 0',
                background: isDark ? '#3a3750' : '#eeeef4',
              }}
            />
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '7px 14px',
              border: 'none',
              background: 'transparent',
              color: item.danger
                ? '#e03131'
                : (isDark ? '#f1f1f5' : '#1f1f1f'),
              opacity: item.disabled ? 0.4 : 1,
              cursor: item.disabled ? 'default' : 'pointer',
              textAlign: 'left',
              font: 'inherit',
            }}
            onMouseEnter={(event) => {
              if (item.disabled) return;
              event.currentTarget.style.background = isDark ? '#312e47' : '#f3f3fa';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent';
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ opacity: 0.5, fontSize: 12 }}>{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}