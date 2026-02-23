import { TemplateForm } from '@/components/template-form';
import { PageHeader } from '@/components/app/page-header';

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Template"
        description="Create a reusable control framework for recurring assessments."
      />
      <TemplateForm />
    </div>
  );
}
