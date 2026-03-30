import './globals.css';
import { Cinzel, Cormorant_Garamond, Crimson_Pro } from 'next/font/google';
import { cookies } from 'next/headers';
import { cn } from '@/lib/utils';
import { FUN_MODE_COOKIE } from '@/lib/ui/fun-mode';

const headingFont = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700']
});

const bodyFont = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600']
});

const displayFont = Cinzel({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600']
});

export const metadata = {
  title: 'VantageCISO — AI-Powered Security Command Center for CISOs',
  description:
    'VantageCISO is an AI-powered security operations platform for CISOs and security teams — combining a live command center, AI governance, TrustOps, threat intelligence, and incident response in one suite.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const funModeEnabled = cookies().get(FUN_MODE_COOKIE)?.value === 'true';

  return (
    <html lang="en" className={cn(headingFont.variable, bodyFont.variable, displayFont.variable)}>
      <body className={cn('font-sans antialiased', funModeEnabled && 'fun-mode')}>
        <main>{children}</main>
      </body>
    </html>
  );
}
