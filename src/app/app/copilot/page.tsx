import { CopilotPanel } from '@/components/copilot-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';

export default async function CopilotPage() {
  const session = await getPageSessionContext();

  return (
    <div>
      <div className="card">
        <h2>Copilot Workspace</h2>
        <p>Use AI guidance for assessment planning, evidence strategy, and governance execution.</p>
      </div>
      <CopilotPanel tenantName={session.tenantName} />
    </div>
  );
}
