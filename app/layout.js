import './globals.css'

export const metadata = {
  title: 'DRYP · Virksomhedsstyring',
  description: 'DRYP - Grøn Olie fra Skagen. Produktion, HACCP, kunder og økonomi.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  )
}
