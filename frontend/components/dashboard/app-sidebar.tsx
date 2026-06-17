'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ContactRound,
  Settings,
  LogOut,
  MoreVertical,
  Search,
} from 'lucide-react'

import { BrandLogo, BrandWordmark } from '@/components/brand'
import { RadixBookmarkIcon } from '@/components/icons/radix-bookmark-icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  { title: 'Coleções', href: '/dashboard/colecoes', icon: RadixBookmarkIcon },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()
  const initials = getInitials(user?.name, user?.email)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  function handleLogout() {
    logout()
    router.replace('/login')
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
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"
              aria-label="Opções da conta"
            >
              <span className="shrink-0 rounded-full">
                <Avatar className="size-8">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt="Foto de perfil" />
                  ) : null}
                  <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </span>
              <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md group-data-[collapsible=icon]:hidden">
                <MoreVertical className="size-4" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/configuracoes">
                <Settings className="size-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
