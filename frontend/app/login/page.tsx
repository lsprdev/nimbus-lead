import { GuestOnly } from '@/components/auth/auth-guard'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function LoginPage() {
  return (
    <GuestOnly>
      <AuthShell
        title="Entre na sua conta"
        subtitle="Acesse suas listas de leads e acompanhe novas buscas."
      >
        <AuthForm mode="login" />
      </AuthShell>
    </GuestOnly>
  )
}
