'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { StatusPill } from '@/components/app/status-pill';
import { EmptyState } from '@/components/app/empty-state';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AssessmentRow = {
  id: string;
  name: string;
  templateName: string;
  status: string;
  overall: number;
  confidence: number;
  updatedAt: string;
  owner: string;
  customerName: string;
};

export function AssessmentsTable({ rows }: { rows: AssessmentRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function generateReport(assessmentId: string) {
    setBusyId(assessmentId);
    const response = await fetch(`/api/assessments/${assessmentId}/report`, { method: 'POST' });
    setBusyId(null);
    if (response.ok) {
      router.push(`/app/assessments/${assessmentId}?tab=report`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        helpKey="assessments"
        description="Track execution, confidence, and progress across customer assessments."
        primaryAction={{ label: 'New Assessment', href: '/app/assessments/new' }}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          description="Create an assessment to start tracking controls, evidence linkage, and report outcomes."
          actionLabel="Create Assessment"
          actionHref="/app/assessments/new"
          icon={<Plus className="h-5 w-5" />}
        />
      ) : (
        <DataTable
          title="Assessment Pipeline"
          description="Operational view of status, score, confidence, and ownership."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/app/reports">
                <FileText className="mr-1 h-3.5 w-3.5" /> Reports
              </Link>
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/app/assessments/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.customerName}</p>
                  </TableCell>
                  <TableCell>{row.templateName}</TableCell>
                  <TableCell>
                    <StatusPill status={row.status} />
                  </TableCell>
                  <TableCell>{row.overall.toFixed(2)} / 4</TableCell>
                  <TableCell>{Math.round(row.confidence * 100)}%</TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell>{new Date(row.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/assessments/${row.id}`}>Open</Link>
                    </Button>
                    <Button size="sm" disabled={busyId === row.id} onClick={() => generateReport(row.id)}>
                      {busyId === row.id ? 'Generating...' : 'Generate report'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}
    </div>
  );
}

