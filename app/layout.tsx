import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '700', '800'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Nutrition Facts | APIVerve Template',
  description: 'Calories and macros for any food, per serving, and a running total for your plate. An APIVerve template.'
};

export const viewport: Viewport = {
  themeColor: '#f4f7ef'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
