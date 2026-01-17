'use client'

import {useState} from 'react'
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {Button} from '@/components/ui/button'
import {Mail, Copy, Check} from 'lucide-react'
import { Locale } from '@/i18n/config'

interface FeedbackPopoverProps {
    lang: Locale
    email: string
    label: string
}

export function FeedbackPopover({lang, email, label}: FeedbackPopoverProps) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(email)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-4" side="top" align="center">
                <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{lang === "zh-CN" ? "联系邮箱" : "Contact email"}</span>
                </div>
                <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                    <span className="text-sm font-mono truncate">{email}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 w-8 p-0 shrink-0"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}