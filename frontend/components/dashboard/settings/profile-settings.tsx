'use client'

import * as React from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { getInitials, useAuth } from '@/lib/auth'

export function ProfileSettings() {
  const { updateUser, user } = useAuth()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = React.useState<string | null>(null)
  const [name, setName] = React.useState(user?.name ?? '')
  const [email, setEmail] = React.useState(user?.email ?? '')
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatar(url)
      toast.success('Foto atualizada (pré-visualização).')
    }
  }

  function handleProfileSave(event: React.FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    setTimeout(() => {
      updateUser({ name, email })
      setSavingProfile(false)
      toast.success('Perfil salvo com sucesso!')
    }, 700)
  }

  function handlePasswordSave(event: React.FormEvent) {
    event.preventDefault()
    setSavingPassword(true)
    setTimeout(() => {
      setSavingPassword(false)
      toast.success('Senha atualizada com sucesso!')
    }, 700)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Foto + dados básicos */}
      <Card>
        <form onSubmit={handleProfileSave}>
          <CardHeader>
            <CardTitle>Informações do perfil</CardTitle>
            <CardDescription>
              Atualize sua foto e os dados pessoais da sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Avatar className="size-20">
                {avatar ? (
                  <AvatarImage src={avatar || '/placeholder.svg'} alt="Foto de perfil" />
                ) : null}
                <AvatarFallback className="bg-accent text-lg text-accent-foreground">
                  {getInitials(name, email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="size-4" />
                  Trocar foto
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máx 2MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile && <Loader2 className="size-4 animate-spin" />}
              Salvar alterações
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Senha */}
      <Card>
        <form onSubmit={handlePasswordSave}>
          <CardHeader>
            <CardTitle>Senha</CardTitle>
            <CardDescription>
              Use uma senha forte para manter sua conta segura.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input id="current-password" type="password" placeholder="••••••••" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" placeholder="••••••••" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" />
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" disabled={savingPassword}>
              {savingPassword && <Loader2 className="size-4 animate-spin" />}
              Atualizar senha
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
