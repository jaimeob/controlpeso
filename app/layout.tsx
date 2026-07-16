import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "proceso · Tu día, en equilibrio", description: "Contador inteligente de calorías" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
