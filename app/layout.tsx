import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mibebe.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Mi Bebé — tu embarazo en Paraguay",
    template: "%s · Mi Bebé",
  },
  description:
    "Guía del embarazo semana a semana, hecha para Paraguay. Privada: tus datos quedan en tu teléfono.",
  applicationName: "Mi Bebé",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mi Bebé",
  },
  openGraph: {
    type: "website",
    title: "Mi Bebé — tu embarazo en Paraguay",
    description:
      "Guía del embarazo semana a semana, hecha para Paraguay. Privada: tus datos quedan en tu teléfono.",
    siteName: "Mi Bebé",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5D50",
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
