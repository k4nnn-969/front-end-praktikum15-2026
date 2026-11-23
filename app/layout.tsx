import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RuangRapi — ruang kerja yang lebih tenang",
  description:
    "Ruang kerja sederhana untuk mengatur tugas dan proyek kreatif tim kecil.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
