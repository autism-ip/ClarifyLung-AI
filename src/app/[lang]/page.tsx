export const dynamic = 'force-dynamic'

import { Button } from "@/components/ui/button"
import { Chrome } from "lucide-react"
import Features from "@/components/features"
import Hero from "@/components/hero"
import FAQ from "@/components/faq"
import { ScrollProgress, ScrollReveal } from "@/components/ui/parallax"
import { getDictionary } from '@/i18n/get-dictionary'
import type { Locale } from '@/i18n/config'

export default async function Home({
  params
}: {
  params: Promise<{ lang: Locale }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <main className="flex flex-col items-center w-full">
      <ScrollProgress />
      <ScrollReveal>
        <Hero lang={lang} />
      </ScrollReveal>
      <ScrollReveal delay={100}>
        <Features lang={lang} />
      </ScrollReveal>
      <ScrollReveal delay={200}>
        <FAQ lang={lang} />
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {dict.home.cta.title}
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                {dict.home.cta.description}
              </p>
              <Button size="lg" className="mt-4">
                <Chrome className="mr-2 h-5 w-5" />
                {dict.home.cta.button}
              </Button>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </main>
  )
}
