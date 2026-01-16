import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { locales } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Toaster } from "react-hot-toast";
import { BreadcrumbWrapper } from "@/components/breadcrumb-wrapper";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata({
  params,
}: {
  params: { lang: Locale };
}): Promise<Metadata> {
  const dict = await getDictionary(params.lang);
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://lungcancerdetection.top";

  return {
    title: {
      default: dict.metadata.title,
      template: `%s | ${dict.metadata.title}`,
    },
    description: dict.metadata.description,
    keywords: dict.metadata.keywords,
    authors: [{ name: "Zen" }],
    metadataBase: new URL(url),
    alternates: {
      canonical: `${url}/${params.lang}`,
      languages: {
        "en-US": `${url}/en-US`,
        "zh-CN": `${url}/zh-CN`,
      },
    },
    openGraph: {
      type: "website",
      locale: params.lang,
      url: `${url}/${params.lang}`,
      title: dict.metadata.title,
      description: dict.metadata.description,
      siteName: dict.common.brand,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.title,
      description: dict.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ lang: locale }));
}

export default async function RootLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: { lang: Locale };
}) {
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <div className="relative flex min-h-screen flex-col">
            <Navbar lang={lang} />
            <main className="flex-1">
              <BreadcrumbWrapper lang={lang} dict={dict} />
              {children}
            </main>
            <Footer lang={lang} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
