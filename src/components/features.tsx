/**
 * [INPUT]: 依赖 @/components/ui/card, @/i18n/get-dictionary, @/i18n/config
 * [OUTPUT]: 对外提供功能特性展示组件
 * [POS]: components/features 的核心渲染器，被首页 page.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Locale } from "@/i18n/config"
import {
  Brain,
  Layers,
  Eye,
  Shield
} from "lucide-react"
import { useDictionary as useDict } from "@/hooks"

export default function Features({
  lang
}: {
  lang: Locale
}) {
  const { dictionary: dict } = useDict(lang)

  const features = [
    {
      icon: Brain,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: dict?.features?.hybrid_architecture?.title || "Hybrid Architecture",
      description: dict?.features?.hybrid_architecture?.description || "Advanced AI model combining multiple techniques"
    },
    {
      icon: Layers,
      iconColor: "text-accent",
      iconBg: "bg-accent/10",
      title: dict?.features?.data_enhancement?.title || "Data Enhancement",
      description: dict?.features?.data_enhancement?.description || "Sophisticated data augmentation strategies"
    },
    {
      icon: Eye,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: dict?.features?.cross_attention?.title || "Cross Attention",
      description: dict?.features?.cross_attention?.description || "Multi-head cross attention mechanisms"
    },
    {
      icon: Shield,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      title: dict?.features?.explainable_ai?.title || "Explainable AI",
      description: dict?.features?.explainable_ai?.description || "Grad-CAM++ visualization for transparency"
    }
  ]

  return (
    <section className="w-full py-16 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        {/* 标题区域 */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
            {dict?.features?.title || "Key Features"}
          </h2>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
            {dict?.features?.description || "Powered by cutting-edge AI technology"}
          </p>
        </div>

        {/* 特性卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group card-hover border-2 border-transparent bg-card/50 backdrop-blur-sm cursor-pointer"
            >
              <CardHeader>
                {/* 图标容器 - 悬停时缩放 + 旋转 */}
                <div className={`mb-3 w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor} transition-transform duration-300`} />
                </div>
                {/* 标题 - 悬停时品牌色 */}
                <CardTitle className="text-lg transition-colors duration-300 group-hover:text-primary">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed transition-opacity duration-300 group-hover:opacity-80">
                  {feature.description}
                </p>
              </CardContent>
              {/* 悬停时显示的装饰性边框 */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 rounded-xl border-2 border-primary/20" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
