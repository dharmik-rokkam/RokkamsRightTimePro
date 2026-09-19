import type { Metadata } from 'next';
import { Cinzel, Crimson_Text } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const crimsonText = Crimson_Text({
  subsets: ['latin'],
  variable: '--font-crimson',
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Rokkam's Right Time",
  description: 'Daily Auspicious Timings - Muscat, Oman',
  keywords: ['panchang', 'muscat', 'oman', 'tithi', 'nakshatra', 'rahu kalam', 'muhurta', 'hindu calendar'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${crimsonText.variable}`}>
      <body style={{ fontFamily: 'var(--font-crimson, Georgia, serif)' }}>
        {children}
      </body>
    </html>
  );
}
