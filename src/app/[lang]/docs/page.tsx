import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

export default async function DocPage({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dict = await getDictionary(lang);
  const documents = dict.doc.documents;

  return (
    <main className="container py-12 md:py-24">
      <div className="flex flex-col items-center space-y-4 text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
          {dict.doc.title}
        </h1>
        <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed">
          {dict.doc.description}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <Link key={document.id} href={`/${lang}/doc/${document.slug}`}>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{document.title}</CardTitle>
                <CardDescription>
                  {document.date} · {document.readTime}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">{document.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <Button variant="outline">{dict.doc.loadMore}</Button>
      </div>
    </main>
  );
}

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: Locale };
}): Promise<Metadata> {
  const dict = await getDictionary(lang);
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://lungcancerdetection.top";

  return {
    title: dict.doc.title,
    description: dict.doc.description,
    alternates: {
      canonical: `${url}/${lang}/doc`,
      languages: {  
        "en-US": `${url}/en-US/doc`,
        "zh-CN": `${url}/zh-CN/doc`,
      },
    },
    openGraph: {
      title: dict.doc.title,
      description: dict.doc.description,
      url: `${url}/${lang}/doc`,
    },
  };
}
