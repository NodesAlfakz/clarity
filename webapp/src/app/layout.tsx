import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '../components/I18nProvider';

export const metadata: Metadata = {
  title: 'Clarity — Understand what you sign',
  description: 'Crypto safety and onboarding agent. Localized to 7 native languages.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
