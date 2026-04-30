import { useState, useCallback } from 'react';
import { diagramToPdf } from './pdfUtils';

const STORAGE_KEY = 'fc_files';

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToStorage(files) {
  try {
    // localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    console.log(files)
  } catch { }
}

// ─── Optional API integration ────────────────────────────────────────────────
// Replace these with real fetch calls to your backend.
// The shape sent/received is: { id, name, nodes, connections, updatedAt }
//
// async function apiSave(file)   { await fetch('/api/diagrams', { method:'POST', body: JSON.stringify(file) }) }
// async function apiLoad()       { return fetch('/api/diagrams').then(r => r.json()) }
// ─────────────────────────────────────────────────────────────────────────────

export function useFiles() {
  const [files, setFiles] = useState(loadFromStorage);
  const [currentFileId, setCurrentFileId] = useState(() => {
    const stored = loadFromStorage();
    return stored[0]?.id || null;
  });

  const persist = useCallback((updated) => {
    setFiles(updated);
    saveToStorage(updated);
    // await apiSave(updated.find(f => f.id === currentFileId)); // ← swap in API call here
  }, []);

  const saveFile = useCallback((id, name, nodes, connections) => {
    setFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      const file = { id, name, nodes, connections, updatedAt: Date.now() };
      const updated = idx >= 0
        ? prev.map(f => f.id === id ? file : f)
        : [file, ...prev];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const newFile = useCallback(() => {
    const id = 'f' + Date.now();
    const file = { id, name: 'Untitled diagram', nodes: [], connections: [], updatedAt: Date.now() };
    setFiles(prev => {
      const updated = [file, ...prev];
      saveToStorage(updated);
      return updated;
    });
    setCurrentFileId(id);
    return file;
  }, []);

  const getFile = useCallback((id) => {
    return files.find(f => f.id === id) || null;
  }, [files]);

  const deleteFile = useCallback((id) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveToStorage(updated);
      return updated;
    });
    if (currentFileId === id) setCurrentFileId(files[0]?.id || null);
  }, [currentFileId, files]);

  // Save file and also send as PDF to backend
  const saveFileWithPdf = useCallback(async (id, name, nodes, connections) => {
    // Save as usual
    saveFile(id, name, nodes, connections);
    // Generate PDF
    const pdfBlob = diagramToPdf({ name, nodes, connections });
    const formData = new FormData();
    formData.append('file', pdfBlob, `${name || 'diagram'}.pdf`);
    // Send to backend (replace URL with your endpoint)
    try {
      const response = await fetch('https://example.com/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      // Optionally handle response
      // const data = await response.json();
    } catch (err) {
      console.error('PDF upload error:', err);
    }
  }, [saveFile]);

  // Load a file from backend, update local state, and allow further editing/saving
  const loadFileFromBackend = useCallback(async (id) => {
    try {
      // Replace with your backend endpoint and params
      const response = await fetch(`https://example.com/api/diagrams/${id}`);
      if (!response.ok) throw new Error('Failed to fetch file');
      const file = await response.json();
      // Update local state with loaded file
      setFiles(prev => {
        const idx = prev.findIndex(f => f.id === file.id);
        const updated = idx >= 0
          ? prev.map(f => f.id === file.id ? file : f)
          : [file, ...prev];
        saveToStorage(updated);
        return updated;
      });
      setCurrentFileId(file.id);
      return file;
    } catch (err) {
      console.error('File load error:', err);
      return null;
    }
  }, [setFiles, setCurrentFileId]);

  return { files, currentFileId, setCurrentFileId, saveFile, saveFileWithPdf, newFile, getFile, deleteFile, persist, loadFileFromBackend };
}
