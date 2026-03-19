import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { formatCurrency } from "@/components/daily-sales/shared";
import type { AgentPerformance, SummaryStat } from "@/types/dailySales";

export function SummaryCardGrid({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.id} className="gap-0 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <Badge variant={stat.trend === "up" ? "secondary" : stat.trend === "down" ? "destructive" : "outline"}>
                {stat.trend}
              </Badge>
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AgentCardGrid({
  agents,
  onAgentSelect,
}: {
  agents: AgentPerformance[];
  onAgentSelect: (agent: AgentPerformance) => void;
}) {
  const sortedAgents = [...agents].sort(
    (left, right) => right.conversionRate - left.conversionRate || right.sales - left.sales,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sortedAgents.map((agent, index) => (
        <button
          key={agent.id}
          type="button"
          onClick={() => onAgentSelect(agent)}
          className="text-left"
        >
          <Card className="gap-0 overflow-hidden border-slate-200 shadow-sm transition-colors hover:bg-slate-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">#{index + 1}</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{agent.name}</h3>
                </div>
                <Badge variant={agent.status === "active" ? "secondary" : "outline"}>
                  {agent.status}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Performance: {agent.conversionRate}%</p>
                <p>Sales: {formatCurrency(agent.sales)}</p>
                <p>Target: {formatCurrency(agent.target)}</p>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

export function AgentDetailsDialog({
  agent,
  rank,
  onClose,
}: {
  agent: AgentPerformance | null;
  rank: number | null;
  onClose: () => void;
}) {
  return (
    <DailySalesDialog
      isOpen={Boolean(agent)}
      title="Overall Summary"
      onClose={onClose}
      panelClassName="max-w-3xl"
    >
      {agent ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rank Number</p>
            <p className="mt-1 font-semibold text-slate-900">#{rank ?? "-"}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</p>
            <p className="mt-1 font-semibold text-slate-900">{agent.name}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Sales</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(agent.sales)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Target</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(agent.target)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Performance</p>
            <p className="mt-1 font-semibold text-slate-900">{agent.conversionRate}%</p>
          </div>
        </div>
      ) : null}
    </DailySalesDialog>
  );
}

