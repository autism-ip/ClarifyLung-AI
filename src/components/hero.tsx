/**
 * [INPUT]: 依赖 @/components/ui/button, @/i18n/get-dictionary, @/i18n/config
 * [OUTPUT]: 对外提供 Hero 主视觉区域组件
 * [POS]: components/hero 的核心渲染器，被首页 page.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Button } from "@/components/ui/button"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import Link from "next/link"

// 字典类型扩展，支持额外的 hero 属性
interface HeroDict {
  title: string
  description: string
  learnMore: string
  watchDemo: string
  badge?: string
  titleHighlight?: string
  stats?: {
    accuracy?: string
    time?: string
    scans?: string
  }
}

interface HomeDict {
  hero: HeroDict
}

interface FullDict {
  home?: HomeDict
}

export default async function Hero({
  lang
}: {
  lang: Locale
}) {
  const dict = await getDictionary(lang)
  const hero = (dict as FullDict)?.home?.hero || {
    title: "Lung Cancer Detection",
    description: "Advanced AI-powered diagnosis for early detection",
    learnMore: "Learn More",
    watchDemo: "Watch Demo",
    badge: "AI-Powered Lung Cancer Detection",
    titleHighlight: "Early Detection Saves Lives",
    stats: {
      accuracy: "Accuracy",
      time: "Analysis Time",
      scans: "Scans Analyzed"
    }
  }

  return (
    <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
      {/* 背景渐变装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl mx-auto">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      <div className="container px-4 md:px-6 relative">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* 品牌标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-sm animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm font-medium text-primary">
              {hero.badge}
            </span>
          </div>

          {/* 主标题 - 带渐变，使用 display 字体 */}
          <h1 className="text-4xl font-display font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {hero.title}
            <span className="block mt-2 text-gradient">
              {hero.titleHighlight}
            </span>
          </h1>

          {/* 描述文案 */}
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-xl/relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {hero.description}
          </p>

          {/* CTA 按钮组 */}
          <div className="flex flex-col gap-4 sm:flex-row animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow" asChild>
              <Link href={`/${lang}/demo`}>
                {hero.watchDemo}
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href={`/${lang}/doc`}>
                {hero.learnMore}
              </Link>
            </Button>
          </div>

          {/* 统计数据/信任背书 */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 mt-8 border-t border-border/50 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { value: "98.5%", label: hero.stats?.accuracy || "Accuracy" },
              { value: "<2s", label: hero.stats?.time || "Analysis Time" },
              { value: "10K+", label: hero.stats?.scans || "Scans Analyzed" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
