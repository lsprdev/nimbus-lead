import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const activity = [
  { name: 'Olivia Martins', email: 'olivia@email.com', amount: '+R$ 1.999', initials: 'OM' },
  { name: 'Jackson Lee', email: 'jackson@email.com', amount: '+R$ 39', initials: 'JL' },
  { name: 'Isabella Nunes', email: 'isabella@email.com', amount: '+R$ 299', initials: 'IN' },
  { name: 'William Costa', email: 'william@email.com', amount: '+R$ 99', initials: 'WC' },
  { name: 'Sofia Ribeiro', email: 'sofia@email.com', amount: '+R$ 39', initials: 'SR' },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas recentes</CardTitle>
        <CardDescription>265 vendas neste mês</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {activity.map((item) => (
          <div key={item.email} className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {item.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">{item.email}</p>
            </div>
            <span className="text-sm font-medium">{item.amount}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
