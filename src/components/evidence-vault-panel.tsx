'use client';

import { useEffect, useState } from 'react';

type EvidenceItem = {
  id: string;
  name: string;
  tags: string[];
  ingestionStatus: string;
  chunkCount: number;
};

export function EvidenceVaultPanel() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEvidence() {
    const response = await fetch('/api/evidence');
    if (!response.ok) return;
    const json = await response.json();
    setItems(json);
  }

  useEffect(() => {
    void loadEvidence();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch('/api/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        content,
        tags: tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      const json = await response.json();
      setError(json.error ?? 'Failed to ingest evidence');
      setBusy(false);
      return;
    }

    setName('');
    setContent('');
    setTags('');
    setBusy(false);
    await loadEvidence();
  }

  return (
    <div className="card">
      <h3>Evidence Vault</h3>
      <form onSubmit={onSubmit} className="grid">
        <input
          placeholder="Evidence title"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <textarea
          rows={4}
          placeholder="Paste policy text, controls, evidence notes, or document extract"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />
        <input
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <button type="submit" disabled={busy}>{busy ? 'Ingesting...' : 'Add evidence'}</button>
      </form>
      {error ? <p>{error}</p> : null}
      <div style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <p>No evidence added yet.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong> ({item.ingestionStatus}, {item.chunkCount} chunks)
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
