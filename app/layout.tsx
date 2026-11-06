import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const font = Nunito({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Bakma Store", template: "%s · Bakma Store" },
  description: "Trouvez votre compagnon idéal : animaux vérifiés, en bonne santé, à adopter ou à vendre en Tunisie.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${font.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
