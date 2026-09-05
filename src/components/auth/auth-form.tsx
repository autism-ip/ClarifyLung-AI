/**
 * [INPUT]: 依赖 @/components/ui/{button,input,label}, @/components/icons,
 *           @/lib/supabase, @/i18n/get-dictionary, react-hot-toast,
 *           next/navigation, next/link, lucide-react
 * [OUTPUT]: 对外提供 AuthForm 登录/注册双模式表单组件
 * [POS]: components/auth 的认证表单核心，被 signin-content 与 signup-content 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { Info } from "lucide-react"
import { useState, useEffect } from "react"
import { getDictionary } from "@/i18n/get-dictionary"
import type { Locale } from "@/i18n/config"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Link from "next/link"

interface AuthFormProps {
  mode: "signin" | "signup"
  lang: Locale
}

export function AuthForm({ mode, lang }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dict, setDict] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  useEffect(() => {
    getDictionary(lang).then(setDict)
  }, [lang])

  if (!dict) return null

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      if (!email.trim()) {
        throw new Error(dict.auth.form.errors?.emailRequired || '请输入邮箱')
      }
      if (!password.trim()) {
        throw new Error(dict.auth.form.errors?.passwordRequired || '请输入密码')
      }

      // 注册模式:密码长度 ≥ 6 位
      if (mode === "signup" && password.length < 6) {
        throw new Error(dict.auth.signup.errors?.passwordTooShort || '密码长度至少为 6 位')
      }

      if (mode === "signin") {
        const { data, error } = await supabase
          .from('users')
          .select()
          .eq('email', email)

        if (error) throw error

        if (!data || data.length === 0) {
          throw new Error(dict.auth.signin.errors?.userNotFound || '用户不存在')
        }

        const user = data[0]
        if (user.password !== password) {
          throw new Error(dict.auth.signin.errors?.wrongPassword || '密码错误')
        }

        document.cookie = `userEmail=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 30}; secure; samesite=lax`;
        window.dispatchEvent(new Event('loginStateChange'));
        toast.success(dict.auth.signin.success || "登录成功!");
        router.refresh();
        router.push(`/${lang}`);
      } else {
        const { data: existingUser } = await supabase
          .from('users')
          .select()
          .eq('email', email)
          .single()

        if (existingUser) {
          throw new Error(dict.auth.signup.errors?.emailExists || '该邮箱已被注册')
        }

        const today = new Date()
        const userCreated = today.toISOString().split('T')[0]
        const plansEnd = new Date(today.setDate(today.getDate() + 10)).toISOString().split('T')[0]

        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email,
              password,
              user_created: userCreated,
              plans_end: plansEnd
            }
          ])

        if (insertError) throw insertError

        toast.success(dict.auth.signup.success || "注册成功!")
        router.push(`/${lang}/signin`)
      }
    } catch (error: any) {
      toast.error(error.message || (mode === "signin" ? dict.auth.signin.error : dict.auth.signup.error) || "操作失败!")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{dict.auth.form.email}</Label>
            <Input
              id="email"
              placeholder={dict.auth.form.emailPlaceholder}
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[0.75rem]"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{dict.auth.form.password}</Label>
              {mode === "signin" && (
                <Link
                  href={`/${lang}/forgot-password`}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {dict.auth.form.forgotPassword}
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[0.75rem]"
            />
          </div>
          <Button disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "signin" ? dict.auth.signin.submitButton : dict.auth.signup.submitButton}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {dict.auth.form.continueWith}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          disabled={isLoading}
          onClick={() => window.location.href = `/api/auth/google?lang=${lang}`}
        >
          <Icons.google className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => window.location.href = `/api/auth/github?lang=${lang}`}
        >
          <Icons.gitHub className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>
      {/* OAuth 开发中提示 */}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {dict.auth.form.oauthNotice}
      </p>
    </div>
  )
}
