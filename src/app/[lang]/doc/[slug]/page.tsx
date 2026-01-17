import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getDocs } from "@/lib/getDocs";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { ScrollToTop } from "@/components/scroll-to-top";

export default async function Document({
  params,
}: {
  params: { slug: string; lang: Locale };
}) {
  const dict = await getDictionary(params.lang);
  const docs = (await getDocs(params.slug, params.lang)) as unknown as {
    title: string;
    date: string;
    author: string;
    readTime: string;
    contentHtml: string;
  };

  return (
    <main className="container py-12 md:py-24">
      <article className="prose prose-gray dark:prose-invert mx-auto">
        <h1 className="mb-4">{docs.title}</h1>
        <div className="flex items-center text-gray-500 mb-8">
          <span>{docs.date}</span>
          <span className="mx-2">·</span>
          <span>{docs.author}</span>
          <span className="mx-2">·</span>
          <span>{docs.readTime}</span>
        </div>
        <div dangerouslySetInnerHTML={{ __html: docs.contentHtml }} />
      </article>

      <Link href={`/${params.lang}/doc`}>
        <Button variant="ghost" className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {dict.doc.backToList}
        </Button>
      </Link>
      <ScrollToTop />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; lang: Locale };
}): Promise<Metadata> {
  const dict = await getDictionary(params.lang);
  const docs = (await getDocs(params.slug, params.lang)) as unknown as {
    title: string;
    description?: string;
    author: string;
    date: string;
  };
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://lungcancerdetection.top";

  return {
    title: docs.title,
    description: docs.description || dict.doc.description,
    authors: [{ name: docs.author }],
    openGraph: {
      type: "article",
      locale: params.lang,
      url: `${url}/${params.lang}/doc/${params.slug}`,
      title: docs.title,
      description: docs.description || dict.doc.description,
      publishedTime: docs.date,
      authors: [docs.author],
    },
    twitter: {
      card: "summary_large_image",
      title: docs.title,
      description: docs.description || dict.doc.description,
    },
    alternates: {
      canonical: `${url}/${params.lang}/doc/${params.slug}`,
      languages: {
        "en-US": `${url}/en-US/doc/${params.slug}`,
        "zh-CN": `${url}/zh-CN/doc/${params.slug}`,
      },
    },
  };
}
