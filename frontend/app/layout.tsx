import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Governance Console — Rules Engine',
  description: 'Agent governance and policy management console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="app-main">
          {children}
        </main>
      </body>
    </html>
  );
}
