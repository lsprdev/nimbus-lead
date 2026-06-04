'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ContactRound,
  Settings,
  Search,
} from 'lucide-react'

import { BrandLogo, BrandWordmark } from '@/components/brand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { getInitials, useAuth } from '@/lib/auth'

const mainNav = [
  { title: 'Buscar', href: '/dashboard/buscar', icon: Search },
  { title: 'Contatos', href: '/dashboard/contatos', icon: ContactRound },
]

const secondaryNav = [
  { title: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const initials = getInitials(user?.name, user?.email)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <Link href="/dashboard" className="group-data-[collapsible=icon]:hidden">
            <BrandWordmark />
          </Link>
          <Link
            href="/dashboard"
            className="hidden group-data-[collapsible=icon]:flex"
            aria-label="Página inicial"
          >
            <BrandLogo />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarMenu>
            {secondaryNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-lg p-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-8 shrink-0">
            {user?.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="Foto de perfil" />
            ) : null}
            <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{user?.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
