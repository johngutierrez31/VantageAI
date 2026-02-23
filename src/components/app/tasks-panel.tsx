'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/app/status-pill';

type TaskItem = {
  id: string;
  title: string;
  controlCode: string | null;
  assignee: string | null;
  dueDate: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

type Props = {
  assessmentId?: string;
  tasks: TaskItem[];
};

export function TasksPanel({ assessmentId, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState('');
  const [controlCode, setControlCode] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId,
        title,
        controlCode: controlCode || undefined,
        assignee: assignee || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        description: description || undefined,
        priority
      })
    });
    const json = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(json.error ?? 'Failed to create task');
      return;
    }

    setTasks((prev) => [json, ...prev]);
    setTitle('');
    setControlCode('');
    setAssignee('');
    setDueDate('');
    setDescription('');
    setPriority('HIGH');
  }

  async function updateTaskStatus(taskId: string, status: TaskItem['status']) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    const updated = await response.json();
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gaps to Work</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={createTask} className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Task title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <Input placeholder="Control code (optional)" value={controlCode} onChange={(event) => setControlCode(event.target.value)} />
          <Input placeholder="Assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
            <option value="LOW">Low priority</option>
            <option value="MEDIUM">Medium priority</option>
            <option value="HIGH">High priority</option>
            <option value="CRITICAL">Critical priority</option>
          </Select>
          <div className="md:col-span-2">
            <Textarea
              rows={2}
              placeholder="Task details"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Creating task...' : 'Create task from gap'}</Button>
          </div>
          {message ? <p className="md:col-span-2 text-sm text-danger">{message}</p> : null}
        </form>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet. Convert a control gap into an actionable task.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.controlCode ? `Control ${task.controlCode} - ` : ''}
                      {task.assignee ? `Assignee: ${task.assignee}` : 'Unassigned'}
                      {task.dueDate ? ` - Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={task.status} />
                    <Select
                      value={task.status}
                      onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskItem['status'])}
                      className="h-8 w-[140px]"
                    >
                      <option value="TODO">To do</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="DONE">Done</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
