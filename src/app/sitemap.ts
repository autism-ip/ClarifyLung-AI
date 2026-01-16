import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lungcancerdetection.top";
  const sitemapEntries = [];

  // 为每个语言版本添加基础页面
  for (const locale of locales) {
    const dict = await getDictionary(locale);
    const docs  = dict.doc.documents;

    // 添加主页
    sitemapEntries.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    });

    // 添加固定页面
    const staticPages = ["doc", "pricing"];
    for (const page of staticPages) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/${page}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // 添加博客文章页面
    for (const doc of docs) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/doc/${doc.slug}`,
        lastModified: new Date(doc.date),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return sitemapEntries;
}
