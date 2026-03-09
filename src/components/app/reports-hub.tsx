'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { DataTable } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ReportRow = {
  id: string;
  title: string;
  assessmentName: string;
  createdAt: string;
};

export function ReportsHub({ reports }: { reports: ReportRow[] }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function exportFile(reportId: string, format: 'pdf' | 'html' | 'markdown' | 'json', view: 'executive' | 'detailed') {
    const key = `${reportId}:${format}:${view}`;
    setBusyKey(key);

    const response = await fetch(`/api/reports/${reportId}/export?format=${format}&view=${view}`);
    if (!response.ok) {
      setBusyKey(null);
      return;
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') ?? '';
    const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const fileName = fileNameMatch?.[1] ?? `report-${reportId}.${format === 'markdown' ? 'md' : format}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setBusyKey(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        helpKey="reports"
        description="Generate executive and detailed outputs for stakeholders, customers, and audit trails."
        primaryAction={{ label: 'Go to Assessments', href: '/app/assessments' }}
      />

      {reports.length === 0 ? (
        <EmptyState
          title="No reports generated"
          description="Generate your first report from an assessment workspace."
          actionLabel="Open Assessments"
          actionHref="/app/assessments"
        />
      ) : (
        <DataTable title="Published Reports" description="Use executive or detailed formats based on audience needs.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Exports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <p className="font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground">ID: {report.id}</p>
                  </TableCell>
                  <TableCell>{report.assessmentName}</TableCell>
                  <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => exportFile(report.id, 'pdf', 'executive')}
                      disabled={busyKey === `${report.id}:pdf:executive`}
                    >
                      Executive PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportFile(report.id, 'pdf', 'detailed')}
                      disabled={busyKey === `${report.id}:pdf:detailed`}
                    >
                      Detailed PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportFile(report.id, 'json', 'detailed')}>
                      JSON
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportFile(report.id, 'markdown', 'detailed')}>
                      Markdown
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/app/assessments`}>Back to workspace</Link>
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

