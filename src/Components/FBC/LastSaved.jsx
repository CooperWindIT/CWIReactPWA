import React, { useEffect, useState } from 'react';

// When the diagram was last written down, shown beside the search button.
//
// There are two different "saves" in this app and they mean very different
// things to the user:
//
//   * the draft — written to localStorage every 800ms while editing. It
//     survives a reload of this browser and nothing else.
//   * the real save — the diagram stored on the server, which is what
//     survives a different machine, a cleared cache, or a colleague opening
//     the file.
//
// Both get a timestamp, and the newest one is shown. They are deliberately
// worded differently: calling an autosaved draft "Saved" would tell someone
// their work is safe on the server when it is sitting in one browser's
// localStorage, which is exactly the misunderstanding the recovery toast
// already exists to prevent.
//
// The draft time is a SNAPSHOT taken when the page loaded, not a live reading.
// The autosave fires 800ms after every edit, so following it meant the label
// sat at "just now" permanently — technically accurate and completely
// useless, since a clock that only ever reads the current time tells you
// nothing. Frozen, it answers the question actually being asked: where was
// this diagram when I last left it? A real Save is what moves it on.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function formatSavedAt(savedAt, now) {
  const elapsed = now - savedAt;
  const date = new Date(savedAt);

  if (elapsed < 0) {
    // A clock that has been moved backwards, or a timestamp from a server in
    // a different time zone. Better to show the time than a negative age.
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (elapsed < 45 * 1000) return 'just now';
  if (elapsed < HOUR) {
    const minutes = Math.round(elapsed / MINUTE);
    return `${minutes} min ago`;
  }

  const sameDay = new Date().toDateString() === date.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ClockIcon = () => (
  <svg
    width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" style={{ flexShrink: 0, opacity: 0.85 }}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

// A cloud with a line through it: kept here, not sent anywhere.
const DraftIcon = () => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" style={{ flexShrink: 0, opacity: 0.9 }}
  >
    <path d="M17.5 19H7a5 5 0 0 1-.5-9.98" />
    <path d="M8.5 6.5A5.5 5.5 0 0 1 18 9a4 4 0 0 1 1.9 7.4" />
    <path d="m3 3 18 18" />
  </svg>
);

export default function LastSaved({ savedAt, draftSavedAt, theme }) {
  // A relative label goes stale on its own, with nothing in the app changing
  // to trigger a re-render — so this keeps its own clock rather than waiting
  // for the next edit to refresh it.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, [savedAt, draftSavedAt]);

  const isDark = theme === 'dark';

  const hasSave = typeof savedAt === 'number';
  const hasDraft = typeof draftSavedAt === 'number';

  // A draft only matters while it is NEWER than the last real save. Once the
  // diagram has been saved, an older draft is just the trail that led up to
  // it and saying so would be noise.
  const draftIsAhead = hasDraft && (!hasSave || draftSavedAt > savedAt);

  let label;
  let title;
  let tone;
  let icon;

  if (draftIsAhead) {
    label = `Draft saved ${formatSavedAt(draftSavedAt, now)}`;
    // Worded carefully: the browser copy IS still being kept up to date in
    // the background. The time shown is where this page picked up from, not
    // the age of the backup, and the tooltip has to say so or a stale-looking
    // "45 min ago" reads as a backup that stopped working.
    title = `Unsaved changes. This page picked up from ${new Date(draftSavedAt).toLocaleString()}.`
      + '\nYour browser keeps saving them as you work, but only on this machine.'
      + '\nClick Save to store them on the server.';
    // Amber rather than the muted grey: this is the state where something is
    // still owed, and it should not look like everything is settled.
    tone = isDark ? '#e8a33d' : '#b45309';
    icon = <DraftIcon />;
  } else if (hasSave) {
    label = `Saved ${formatSavedAt(savedAt, now)}`;
    title = `Last saved to the server ${new Date(savedAt).toLocaleString()}`;
    tone = isDark ? '#b8b5cc' : '#6b6880';
    icon = <ClockIcon />;
  } else {
    label = 'Not saved yet';
    title = 'This diagram has not been saved yet';
    tone = isDark ? '#b8b5cc' : '#6b6880';
    icon = <ClockIcon />;
  }

  return (
    <span
      // The exact moment is always one hover away, whatever the label says.
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        whiteSpace: 'nowrap',
        fontSize: 12.5,
        lineHeight: 1.2,
        color: tone,
        fontWeight: draftIsAhead ? 500 : 400,
        userSelect: 'none',
        cursor: 'default',
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}