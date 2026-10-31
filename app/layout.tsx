import type { Metadata } from "next";
import { Inter, Literata } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
const serif = Literata({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bible Quiz", template: "%s · Bible Quiz" },
  description: "Read the Scriptures, think, and answer.",
  // Used for absolute links in WhatsApp/social previews. On Vercel, falls back to the production domain.
  metadataBase: new URL(
    process.env.SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} min-h-screen font-sans antialiased`}>
        <header className="border-b border-line bg-surface print:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-serif text-lg font-semibold text-accent">
              Bible Quiz
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
