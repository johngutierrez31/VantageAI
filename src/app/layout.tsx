import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'VantageCISO',
  description: 'Assessment and AI readiness SaaS MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <nav className="card" style={{ display: 'flex', gap: 16 }}>
            <Link href="/app/templates">Templates</Link>
            <Link href="/app/assessments">Assessments</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
