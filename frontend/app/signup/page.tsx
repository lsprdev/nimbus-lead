import { GuestOnly } from '@/components/auth/auth-guard'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function SignupPage() {
  return (
    <GuestOnly>
      <AuthShell
        title="Crie sua conta"
        subtitle="Comece a buscar contatos locais em poucos passos."
      >
        <AuthForm mode="signup" />
      </AuthShell>
    </GuestOnly>
  )
}
