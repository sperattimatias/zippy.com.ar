import './globals.css';
import { Toaster } from '../components/ui/sonner';

export const metadata = {
  title: 'Zippy Admin Panel',
  description: 'Operational console for Zippy rideshare',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<Toaster /></body>
    </html>
  );
}
