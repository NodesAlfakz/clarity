import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clarity — Understand what you sign',
  description: 'Crypto safety and onboarding agent. Localized to 7 native languages.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
