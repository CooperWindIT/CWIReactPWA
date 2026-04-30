import React, { useEffect, useState } from 'react';

export default function Toast({ message, onDone, theme }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    setVisible(true);

    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 1500);

    return () => clearTimeout(t);
  }, [message, onDone]);

  const isDark = theme === 'dark';

  const styles = {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: isDark ? '#ffffff' : '#000000', 
    color: isDark ? '#000000' : '#ffffff',
    padding: '7px 20px',
    borderRadius: 20,
    fontSize: 13,
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.3s ease',
    boxShadow: isDark
      ? '0 4px 12px rgba(255,255,255,0.15)'
      : '0 4px 12px rgba(0,0,0,0.2)',
  };

  return <div style={styles}>{message}</div>;
}