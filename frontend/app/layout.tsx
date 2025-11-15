import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "./components/GoogleAnalytics";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PyLens",
  description: "Find Python packages on PyPI with natural language queries",
  openGraph: {
    title: "PyLens",
    description: "Find Python packages on PyPI with natural language queries",
    images: [
      {
        url: "/pypi-light.svg",
        width: 600,
        height: 300,
        alt: "pylens logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta property="og:title" content="PyLens" />
        <meta
          property="og:description"
          content="Find Python packages on PyPI with natural language queries"
        />
        <meta property="og:image" content="/pypi-light.svg" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="300" />
        <meta property="og:image:alt" content="pylens logo" />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
