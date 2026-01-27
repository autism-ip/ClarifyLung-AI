import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Inter } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Toaster } from "react-hot-toast";
import { BreadcrumbWrapper } from "@/components/breadcrumb-wrapper";
import { PageTransition } from "@/components/page-transition";
import { MobileLayout } from "@/components/mobile-layout";

// 标题字体：Geist Sans - 科技感强
// 注意：GeistSans 自动注入 class，无需手动配置 variable

// 正文字体：Inter - 清晰易读
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
    icons: {
      icon: "/images/logo.png",
      shortcut: "/images/logo.png",
      apple: "/images/logo.png",
    },
  };
}

// 移除 generateStaticParams 以避免预渲染问题
// export async function generateStaticParams() {
//   return locales.map((locale) => ({ lang: locale }));
// }

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
      <body className={`${GeistSans.className} ${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <div className="relative flex min-h-screen flex-col">
            <Navbar lang={lang} />
            <main className="flex-1 pb-16 md:pb-0">
              <MobileLayout lang={lang} dict={dict as any}>
                <BreadcrumbWrapper lang={lang} dict={dict} />
                <PageTransition>{children}</PageTransition>
              </MobileLayout>
            </main>
            <Footer lang={lang} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
