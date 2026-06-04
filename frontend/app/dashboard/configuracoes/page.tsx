import { User } from 'lucide-react'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProfileSettings } from '@/components/dashboard/settings/profile-settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader title="Configurações" />
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as configurações da sua conta e preferências.
          </p>
        </div>

        <Tabs defaultValue="perfil" className="gap-6">
          <TabsList>
            <TabsTrigger value="perfil">
              <User className="size-4" />
              Usuário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
