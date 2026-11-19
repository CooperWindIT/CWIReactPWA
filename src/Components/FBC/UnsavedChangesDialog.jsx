import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

// Shown when something would replace the diagram on screen while it still has
// changes that were never saved to the server.
//
// The autosave draft is not a safety net here. It is keyed to one slot in
// localStorage, so loading another diagram overwrites it — by the time the
// user notices, the recovery copy of their work is already gone. This dialog
// is the only thing standing between an unsaved diagram and that.

// What each entry point is about to do, in the second person. `rank` decides
// which wording wins when one click triggers several guarded calls at once —
// the Sidebar's version buttons call onLoadDocument AND a mode setter, and
// "Edit this version" describes that better than "Open this document".
export const GUARD_ACTIONS = {
  new: { rank: 1, verb: 'Starting a new diagram', confirm: 'Start new diagram' },
  open: { rank: 2, verb: 'Opening another diagram', confirm: 'Open it' },
  openFileEdit: { rank: 3, verb: 'Opening that diagram for editing', confirm: 'Open it' },
  openFileView: { rank: 3, verb: 'Opening that diagram in view mode', confirm: 'Open it' },
  sharedDraft: { rank: 4, verb: 'Opening that shared draft', confirm: 'Open it' },
  openDocument: { rank: 4, verb: 'Opening that document', confirm: 'Open it' },
  addVersion: { rank: 5, verb: 'Adding a version of that document', confirm: 'Add version' },
  viewVersion: { rank: 5, verb: 'Opening that version', confirm: 'View version' },
  editVersion: { rank: 5, verb: 'Opening that version for editing', confirm: 'Edit version' },
};

export default function UnsavedChangesDialog({
  action,
  fileName,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const open = Boolean(action);
  const detail = GUARD_ACTIONS[action] || GUARD_ACTIONS.open;

  const handleSave = async () => {
    setSaving(true);
    setSaveFailed(false);

    const ok = await onSaveAndContinue();

    setSaving(false);
    // A failed save must NOT fall through to the action — that would throw
    // away the work this dialog exists to protect, while having told the
    // user it was safe.
    if (!ok) setSaveFailed(true);
  };

  return (
    <Modal
      open={open}
      centered
      closable={!saving}
      maskClosable={false}
      keyboard={!saving}
      onCancel={saving ? undefined : onCancel}
      width={480}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <ExclamationCircleFilled style={{ color: '#faad14', fontSize: 20 }} />
          <span style={{ fontWeight: 600 }}>You have unsaved changes</span>
        </span>
      }
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>,
        <Button key="discard" danger onClick={onDiscardAndContinue} disabled={saving}>
          Continue without saving
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          Save &amp; continue
        </Button>,
      ]}
    >
      <p style={{ marginBottom: 10 }}>
        Your changes to <strong>{fileName || 'this diagram'}</strong> have not been
        saved.
      </p>

      <p style={{ marginBottom: 10 }}>
        {detail.verb} will discard them, and they cannot be recovered afterwards.
      </p>

      <p style={{ marginBottom: 0, color: '#6b6880' }}>
        Save first to keep your work, or continue if you don&apos;t need it.
      </p>

      {saveFailed && (
        <p
          style={{
            marginTop: 14,
            marginBottom: 0,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#fdeaea',
            color: '#b42318',
          }}
        >
          That didn&apos;t save — your changes are still here. Check your connection
          and try again, or continue without saving to discard them.
        </p>
      )}
    </Modal>
  );
}