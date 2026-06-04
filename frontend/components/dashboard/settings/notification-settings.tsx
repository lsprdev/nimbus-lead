'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const options = [
  {
    id: 'updates',
    title: 'Atualizações do produto',
    description: 'Receba novidades sobre recursos e melhorias.',
    defaultChecked: true,
  },
  {
    id: 'security',
    title: 'Alertas de segurança',
    description: 'Avisos sobre atividades suspeitas na sua conta.',
    defaultChecked: true,
  },
  {
    id: 'marketing',
    title: 'E-mails de marketing',
    description: 'Promoções, dicas e conteúdos ocasionais.',
    defaultChecked: false,
  },
  {
    id: 'weekly',
    title: 'Resumo semanal',
    description: 'Um resumo da sua atividade toda segunda-feira.',
    defaultChecked: false,
  },
]

export function NotificationSettings() {
  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    toast.success('Preferências de notificação salvas!')
  }

  return (
    <Card>
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Escolha como e quando você quer ser notificado. (Tab de exemplo)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {options.map((option, index) => (
            <div
              key={option.id}
              className="flex items-center justify-between gap-4 border-b py-4 last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={option.id} className="text-sm font-medium">
                  {option.title}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <Switch id={option.id} defaultChecked={option.defaultChecked} />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button type="submit">Salvar preferências</Button>
        </CardFooter>
      </form>
    </Card>
  )
}
