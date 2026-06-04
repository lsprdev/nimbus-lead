'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const data = [
  { month: 'Jan', receita: 4200, despesa: 2400 },
  { month: 'Fev', receita: 3800, despesa: 2210 },
  { month: 'Mar', receita: 5100, despesa: 2290 },
  { month: 'Abr', receita: 4700, despesa: 2000 },
  { month: 'Mai', receita: 6200, despesa: 2780 },
  { month: 'Jun', receita: 5900, despesa: 2890 },
  { month: 'Jul', receita: 7300, despesa: 3490 },
  { month: 'Ago', receita: 6800, despesa: 3200 },
]

const chartConfig = {
  receita: { label: 'Receita', color: 'var(--chart-1)' },
  despesa: { label: 'Despesa', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function OverviewChart() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Visão geral</CardTitle>
        <CardDescription>Receita e despesas dos últimos 8 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ left: -12, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="fillReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-receita)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-receita)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-despesa)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-despesa)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="receita"
              type="monotone"
              fill="url(#fillReceita)"
              stroke="var(--color-receita)"
              strokeWidth={2}
            />
            <Area
              dataKey="despesa"
              type="monotone"
              fill="url(#fillDespesa)"
              stroke="var(--color-despesa)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
