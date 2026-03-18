import './globals.css';
import { Cinzel, Cormorant_Garamond, Crimson_Pro } from 'next/font/google';
import { cn } from '@/lib/utils';

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
  title: 'VantageAI',
  description: 'Security operating system for buyer diligence, executive posture, AI risk, and response workflows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(headingFont.variable, bodyFont.variable, displayFont.variable)}>
      <body className="font-sans antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}
