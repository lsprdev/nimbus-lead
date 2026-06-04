'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'

type Mode = 'login' | 'signup'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const { login, signup } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const isLogin = mode === 'login'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '')
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await signup(name, email, password)
      }
      toast.success(isLogin ? 'Bem-vindo de volta!' : 'Conta criada com sucesso!')
      router.replace('/dashboard/buscar')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível autenticar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {!isLogin && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" name="name" placeholder="João Silva" required autoComplete="name" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@exemplo.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          {isLogin && (
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Esqueceu a senha?
            </Link>
          )}
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="mt-1 w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {isLogin ? 'Entrar' : 'Criar conta'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            Não tem uma conta?{' '}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
