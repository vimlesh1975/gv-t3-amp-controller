import './globals.css';

export const metadata = {
  title: 'Grass Valley T3 iDDR Controller | AMP Broadcast Deck',
  description:
    'Professional broadcast controller for Grass Valley T3 / T2 iDDR servers, utilizing Advanced Media Protocol (AMP) over TCP with multi-channel transport, SMPTE timecode, jog/shuttle, and clip bin management.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
