import { getPageSessionContext } from '@/lib/auth/page-session';
import { getPolicyCatalog } from '@/lib/policy-generator/library';
import { PolicyGeneratorPanel } from '@/components/app/policy-generator-panel';

export default async function PoliciesPage() {
  await getPageSessionContext();
  const catalog = await getPolicyCatalog();

  return (
    <PolicyGeneratorPanel
      templates={catalog.policies}
      categories={catalog.categories}
      frameworks={catalog.frameworks}
    />
  );
}
