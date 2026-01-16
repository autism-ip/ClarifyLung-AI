'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Locale } from "@/i18n/config"
import { useEffect, useState } from "react"

interface UserNavProps {
  lang: Locale
  dict: any
  onLogout: () => void
}

export function UserNav({ lang, dict, onLogout }: UserNavProps) {
  const [email, setEmail] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const userEmail = decodeURIComponent(document.cookie
      .split('; ')
      .find(row => row.startsWith('userEmail='))
      ?.split('=')[1] || '');
    if (userEmail) {
      setEmail(userEmail);
    }
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{email}</p>
          </div>
        </div>
        <DropdownMenuItem onClick={() => router.push(`/${lang}/profile`)}>
          {dict.nav.profile}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{dict.nav.signout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
