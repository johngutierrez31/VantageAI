'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { MissionPlanItem } from '@/lib/intel/pulse';

function downloadFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function CommandCenterOperations({ missions }: { missions: MissionPlanItem[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(missions.map((mission) => mission.id));
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSelected = useMemo(
    () => missions.length > 0 && selectedIds.length === missions.length,
    [missions.length, selectedIds.length]
  );

  function toggleMission(missionId: string) {
    setSelectedIds((current) =>
      current.includes(missionId) ? current.filter((id) => id !== missionId) : [...current, missionId]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : missions.map((mission) => mission.id));
  }

  async function seedMissionTasks() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/intel/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionIds: selectedIds,
          assignee: assignee || undefined
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            createdCount?: number;
            skippedCount?: number;
          }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? 'Failed to create mission tasks');
        return;
      }

      setMessage(
        `Created ${payload?.createdCount ?? 0} mission tasks${(payload?.skippedCount ?? 0) > 0 ? ` (${payload?.skippedCount} skipped)` : ''}.`
      );
    } catch {
      setError('Failed to create mission tasks due to a network or server issue.');
    } finally {
      setBusy(false);
    }
  }

  async function exportBrief(format: 'markdown' | 'html') {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/intel/brief?format=${format}`);
      const text = await response.text();

      if (!response.ok) {
        setError('Failed to export weekly brief.');
        return;
      }

      if (format === 'markdown') {
        downloadFile('vantageai-weekly-brief.md', 'text/markdown; charset=utf-8', text);
      } else {
        downloadFile('vantageai-weekly-brief.html', 'text/html; charset=utf-8', text);
      }

      setMessage(`Exported weekly brief as ${format.toUpperCase()}.`);
    } catch {
      setError('Failed to export weekly brief due to a network or server issue.');
    } finally {
      setBusy(false);
    }
  }

  return (
      <Card>
        <CardHeader>
        <CardTitle>Operational Actions</CardTitle>
        </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Turn the mission queue into owned work and export a leadership-ready weekly summary.
        </p>
        <div className="rounded-md border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Create Mission Tasks</p>
            <Button variant="outline" size="sm" type="button" onClick={toggleAll}>
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          </div>
          <div className="space-y-1">
            {missions.map((mission) => (
              <label key={mission.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(mission.id)}
                  onChange={() => toggleMission(mission.id)}
                />
                <span>
                  {mission.day} [{mission.priority}] {mission.title}
                </span>
              </label>
            ))}
          </div>
          <Input
            className="mt-3"
            placeholder="Optional assignee for all created tasks"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          />
          <Button className="mt-3" onClick={seedMissionTasks} disabled={busy || selectedIds.length === 0} type="button">
            {busy ? 'Creating...' : 'Create mission task pack'}
          </Button>
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-sm font-medium">Weekly Leadership Brief</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportBrief('markdown')} disabled={busy} type="button">
              Download Markdown
            </Button>
            <Button variant="outline" onClick={() => exportBrief('html')} disabled={busy} type="button">
              Download HTML
            </Button>
          </div>
        </div>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
