import { ArrowDownRight, ArrowUpRight, DollarSign, Users, Activity, CreditCard } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const stats = [
  {
    title: 'Receita total',
    value: 'R$ 45.231',
    change: '+20,1%',
    trend: 'up' as const,
    icon: DollarSign,
  },
  {
    title: 'Novos clientes',
    value: '2.350',
    change: '+12,5%',
    trend: 'up' as const,
    icon: Users,
  },
  {
    title: 'Assinaturas',
    value: '1.205',
    change: '-3,2%',
    trend: 'down' as const,
    icon: CreditCard,
  },
  {
    title: 'Ativos agora',
    value: '573',
    change: '+8,4%',
    trend: 'up' as const,
    icon: Activity,
  },
]

export function StatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <stat.icon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className={cn(
                  'flex items-center gap-0.5 font-medium',
                  stat.trend === 'up' ? 'text-primary' : 'text-destructive',
                )}
              >
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {stat.change}
              </span>
              vs. mês anterior
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
