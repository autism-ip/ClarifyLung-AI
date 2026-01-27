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
  Shield,
  X
} from "lucide-react"
import { useDictionary as useDict } from "@/hooks"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Feature {
  icon: any
  iconColor: string
  iconBg: string
  title: string
  description: string
  details?: string
}

export default function Features({
  lang
}: {
  lang: Locale
}) {
  const { dictionary: dict } = useDict(lang)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const features: Feature[] = [
    {
      icon: Brain,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: dict?.features?.hybrid_architecture?.title || "Hybrid Architecture",
      description: dict?.features?.hybrid_architecture?.description || "Advanced AI model combining multiple techniques",
      details: "Our CNN-Transformer hybrid architecture combines ResNet-50 for local feature extraction with Transformer for global context capture. This dual-stream approach enables both precise local diagnosis and comprehensive pattern recognition."
    },
    {
      icon: Layers,
      iconColor: "text-accent",
      iconBg: "bg-accent/10",
      title: dict?.features?.data_enhancement?.title || "Data Enhancement",
      description: dict?.features?.data_enhancement?.description || "Sophisticated data augmentation strategies",
      details: "We employ advanced data augmentation including random flips, rotations, color jittering, and elastic deformations. These techniques significantly improve model robustness and generalization capabilities."
    },
    {
      icon: Eye,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: dict?.features?.cross_attention?.title || "Cross Attention",
      description: dict?.features?.cross_attention?.description || "Multi-head cross attention mechanisms",
      details: "The bidirectional cross-attention mechanism enables dynamic interaction between local and global features. This allows the model to focus on diagnostically relevant regions while maintaining context awareness."
    },
    {
      icon: Shield,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      title: dict?.features?.explainable_ai?.title || "Explainable AI",
      description: dict?.features?.explainable_ai?.description || "Grad-CAM++ visualization for transparency",
      details: "Our XAI module provides Grad-CAM++ and attention map visualizations that highlight the AI's decision-making regions. This transparency helps clinicians understand and validate AI suggestions."
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
              className="group card-hover border-2 border-transparent bg-card/50 backdrop-blur-sm cursor-pointer relative overflow-hidden"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
              <CardHeader>
                {/* 图标容器 - 悬停时缩放 + 旋转 */}
                <div className={`mb-3 w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor} transition-transform duration-300`} />
                </div>
                {/* 标题 */}
                <CardTitle className="text-lg transition-colors duration-300 group-hover:text-primary">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed transition-opacity duration-300 group-hover:opacity-80">
                  {feature.description}
                </p>
              </CardContent>

              {/* 展开详情覆盖层 */}
              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-background/95 backdrop-blur p-4 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{feature.title}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {feature.details}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

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

import { Button } from "@/components/ui/button"
