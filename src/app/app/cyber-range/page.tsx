import { CyberRangePanel } from '@/components/app/cyber-range-panel';
import { getPageSessionContext } from '@/lib/auth/page-session';

export default async function CyberRangePage() {
  await getPageSessionContext();
  return <CyberRangePanel />;
}
