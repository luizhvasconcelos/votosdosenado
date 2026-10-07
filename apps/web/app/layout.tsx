import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const firaSans = Fira_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "votosdosenado — acompanhe quem representa você", template: "%s | votosdosenado" },
  description: "Veja como cada senador vota, compare alinhamento e acompanhe matérias com dados públicos verificáveis.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "votosdosenado" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${firaSans.variable} ${firaCode.variable}`}><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo">{children}</main><Footer /></body></html>;
}
