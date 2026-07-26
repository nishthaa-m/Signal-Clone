import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Signal Messenger',
  description: 'A functional clone of Signal Messenger built with Next.js and FastAPI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-signal-dark text-signal-text-primary">
        {children}
      </body>
    </html>
  );
}
