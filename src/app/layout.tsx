import './globals.css';
import { IBM_Plex_Sans } from 'next/font/google';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex',
  weight: ['400', '500', '600', '700']
});

export const metadata = {
  title: 'VantageCISO',
  description: 'Assessment and AI readiness SaaS MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body className="font-sans antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}
