import Link from "next/link"
import { ThumbsUp } from "lucide-react"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import {FeedbackPopover} from '@/components/feedback-popover'


export default async function Footer({
  lang
}: {
  lang: Locale
}) {
  const dict = await getDictionary(lang)

  const footerLinks = {
    [dict.footer.social]: [
      { name: dict.footer.links.twitter, href: `https://x.com/autism539937` },
      { name: dict.footer.links.github, href: `https://github.com/autism-ip` },
      { name: dict.footer.links.jike, href: `https://web.okjike.com/u/99EE79FD-8238-4A15-B04C-65709E463C63` },
      { name: dict.footer.links.xhs, href: `https://www.xiaohongshu.com/user/profile/615c5f3b000000001f03c9f4` },
    ],
    [dict.footer.support]: [
      { name: dict.footer.links.help, href: `/${lang}/doc` },
      { name: dict.footer.links.contact, href: `https://www.zenhungyep.com/` },
      { name: dict.footer.links.feedback, href: "#", isFeedback: true }
    ]
  }

  return (
    <footer className="relative w-full bg-background/40 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-background/5 to-transparent pointer-events-none" />
      <div className="container relative px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-8">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-3 text-center">
              <h4 className="text-base font-semibold">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                    <li key={link.name}>
                      {link.isFeedback ? (
                        <FeedbackPopover 
                          lang={lang}
                          label={link.name} 
                          email="17806556717@163.com"  // ← 替换为你的邮箱
                        />
                      ) : (
                        <Link 
                          href={link.href}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          {...(category === dict.footer.social
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {}
                          )}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col items-center justify-center mt-12 pt-8 border-t space-y-4">
          <div className="flex items-center space-x-2">
            <ThumbsUp className="h-6 w-6" />
            <span className="font-semibold">{dict.common.brand}</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>{dict.footer.copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
