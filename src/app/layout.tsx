import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "@/components/provider";
import { brand } from "@/lib/brand";
export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        style={
          {
            "--ink": brand.colors.ink,
            "--cream": brand.colors.cream,
            "--purple": brand.colors.purple,
            "--lime": brand.colors.lime,
          } as CSSProperties
        }
      >
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
