import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-nunito",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nido.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Nido — tu embarazo en Paraguay",
    template: "%s · Nido",
  },
  description:
    "Guía del embarazo semana a semana, hecha para Paraguay. Privada: tus datos quedan en tu teléfono.",
  applicationName: "Nido",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nido",
  },
  openGraph: {
    type: "website",
    title: "Nido — tu embarazo en Paraguay",
    description:
      "Guía del embarazo semana a semana, hecha para Paraguay. Privada: tus datos quedan en tu teléfono.",
    siteName: "Nido",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F5F5B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-PY" className={nunito.variable}>
      <body className="bg-cream text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
