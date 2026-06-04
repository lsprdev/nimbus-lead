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
import { getInitials, getRecordFileUrl, useAuth } from '@/lib/auth'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif'])

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: unknown }).message || fallback)
  }
  return fallback
}

export function ProfileSettings() {
  const { authFetch, updateUser, user } = useAuth()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = React.useState<string | undefined>(user?.avatarUrl)
  const [name, setName] = React.useState(user?.name ?? '')
  const [email, setEmail] = React.useState(user?.email ?? '')
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  React.useEffect(() => {
    setAvatar(user?.avatarUrl)
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.avatarUrl, user?.email, user?.name])

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user) return

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error('Use uma imagem JPG, PNG ou GIF.')
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('A imagem deve ter no máximo 2MB.')
      return
    }

    const previousAvatar = avatar
    const previewUrl = URL.createObjectURL(file)
    setAvatar(previewUrl)
    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await authFetch(`/api/collections/users/records/${user.id}`, {
        method: 'PATCH',
        body: formData,
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível atualizar a foto.'))
      }

      const avatarUrl = getRecordFileUrl(payload ?? {}, 'avatar')
      setAvatar(avatarUrl)
      updateUser({ avatarUrl })
      toast.success('Foto atualizada com sucesso!')
    } catch (error) {
      setAvatar(previousAvatar)
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a foto.')
    } finally {
      URL.revokeObjectURL(previewUrl)
      setUploadingAvatar(false)
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
                  <AvatarImage src={avatar} alt="Foto de perfil" />
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
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  {uploadingAvatar ? 'Enviando...' : 'Trocar foto'}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máx 2MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
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
