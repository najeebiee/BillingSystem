import { useEffect, useMemo, useState } from "react";
import { AgentDetailsDialog } from "@/components/daily-sales/MetricsComponents";
import "@/components/daily-sales/DailySalesMetrics.css";
import { loadSalesMetricsDataset } from "@/services/dailySales.service";
import type {
  AgentPerformance,
  SalesDataset,
  SummaryStat,
  TimeRange,
} from "@/types/dailySales";

const emptyDataset: SalesDataset = {
  label: "Sales API Dataset",
  summary: [],
  agents: [],
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

function findSummaryStat(
  summary: SummaryStat[],
  ids: string[],
  labelIncludes: string[] = [],
) {
  return summary.find((item) => {
    const normalizedLabel = item.label.toLowerCase();
    return (
      ids.includes(item.id) ||
      labelIncludes.some((fragment) => normalizedLabel.includes(fragment))
    );
  });
}

function getAgentInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "--";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function resolveDateRange(range: TimeRange, customStartDate: string, customEndDate: string) {
  const today = new Date();
  const dateTo = toIsoDate(today);

  if (range === "custom" && customStartDate && customEndDate) {
    return { dateFrom: customStartDate, dateTo: customEndDate };
  }

  if (range === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { dateFrom: toIsoDate(start), dateTo };
  }

  if (range === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toIsoDate(start), dateTo };
  }

  return { dateFrom: dateTo, dateTo };
}

export function SalesMetricsTab({ refreshTick }: { refreshTick: number }) {
  const [range, setRange] = useState<TimeRange>("daily");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState("");
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null);
  const [dataset, setDataset] = useState<SalesDataset>(emptyDataset);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { dateFrom, dateTo } = useMemo(
    () => resolveDateRange(range, appliedCustomStartDate, appliedCustomEndDate),
    [appliedCustomEndDate, appliedCustomStartDate, range],
  );

  useEffect(() => {
    let isMounted = true;

    const loadDataset = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextDataset = await loadSalesMetricsDataset(dateFrom, dateTo);
        if (isMounted) setDataset(nextDataset);
      } catch (error) {
        if (isMounted) {
          setDataset(emptyDataset);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load sales performance.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadDataset();
    return () => {
      isMounted = false;
    };
  }, [dateFrom, dateTo, refreshTick]);

  const rankedAgentStats = useMemo(
    () => [...dataset.agents].sort((left, right) => right.conversionRate - left.conversionRate || right.sales - left.sales),
    [dataset.agents],
  );

  const selectedAgentRank = selectedAgent
    ? rankedAgentStats.findIndex((agent) => agent.id === selectedAgent.id) + 1
    : null;

  const summaryCards = useMemo(() => {
    const totalSales =
      findSummaryStat(dataset.summary, ["total-sales"], ["total sales"]) ?? null;
    const avgTicket =
      findSummaryStat(dataset.summary, ["avg-order", "avg-ticket"], ["avg order", "avg ticket"]) ??
      null;
    const transactions =
      findSummaryStat(dataset.summary, ["transactions"], ["transaction", "orders"]) ?? null;
    const returns =
      findSummaryStat(dataset.summary, ["returns", "refunds"], ["return", "refund"]) ?? null;

    return [
      {
        id: "total-sales",
        label: "Total Sales",
        value: totalSales?.value ?? "PHP 0",
        trend: totalSales?.trend ?? "neutral",
      },
      {
        id: "avg-ticket",
        label: "Avg Ticket",
        value: avgTicket?.value ?? "PHP 0",
        trend: avgTicket?.trend ?? "neutral",
      },
      {
        id: "transactions",
        label: "Transactions",
        value: transactions?.value ?? "0",
        trend: transactions?.trend ?? "neutral",
      },
      {
        id: "returns",
        label: "Returns",
        value: returns?.value ?? "0",
        trend: returns?.trend ?? "neutral",
      },
    ];
  }, [dataset.summary]);

  const displayAgents = useMemo(() => {
    if (rankedAgentStats.length > 0) {
      return rankedAgentStats.map((agent, index) => ({
        ...agent,
        rank: index + 1,
        initials: getAgentInitials(agent.name),
        isPlaceholder: false,
      }));
    }

    return [
      {
        id: "placeholder-1",
        name: "No team data",
        sales: 0,
        target: 0,
        conversionRate: 0,
        status: "idle" as const,
        rank: 1,
        initials: "ND",
        isPlaceholder: true,
      },
      {
        id: "placeholder-2",
        name: "Awaiting metrics",
        sales: 0,
        target: 0,
        conversionRate: 0,
        status: "idle" as const,
        rank: 2,
        initials: "AM",
        isPlaceholder: true,
      },
      {
        id: "placeholder-3",
        name: "No active reps",
        sales: 0,
        target: 0,
        conversionRate: 0,
        status: "idle" as const,
        rank: 3,
        initials: "NR",
        isPlaceholder: true,
      },
    ];
  }, [rankedAgentStats]);

  return (
    <>
      <section className="daily-sales-metrics">
        <div className="daily-sales-metrics__header-card">
          <div className="daily-sales-metrics__header-row">
            <h2 className="daily-sales-metrics__title">Sales Metrics</h2>
            <div className="daily-sales-metrics__tabs">
              <button
                type="button"
                className={`daily-sales-metrics__tab ${
                  range === "daily" ? "daily-sales-metrics__tab--active" : ""
                }`}
                onClick={() => setRange("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={`daily-sales-metrics__tab ${
                  range === "weekly" ? "daily-sales-metrics__tab--active" : ""
                }`}
                onClick={() => setRange("weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`daily-sales-metrics__tab ${
                  range === "monthly" ? "daily-sales-metrics__tab--active" : ""
                }`}
                onClick={() => setRange("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`daily-sales-metrics__tab ${
                  range === "custom" ? "daily-sales-metrics__tab--active" : ""
                }`}
                onClick={() => setRange("custom")}
              >
                Custom
              </button>
            </div>
          </div>

          {range === "custom" ? (
            <div className="daily-sales-metrics__custom-row">
              <div className="daily-sales-metrics__custom-fields">
                <div className="daily-sales-metrics__custom-field">
                  <label className="daily-sales-metrics__custom-label">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="daily-sales-metrics__custom-input"
                  />
                </div>
                <div className="daily-sales-metrics__custom-field">
                  <label className="daily-sales-metrics__custom-label">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="daily-sales-metrics__custom-input"
                  />
                </div>
                <div className="daily-sales-metrics__custom-field">
                  <label className="daily-sales-metrics__custom-label">&nbsp;</label>
                  <button
                    type="button"
                    className="daily-sales-metrics__apply"
                    onClick={() => {
                      setAppliedCustomStartDate(customStartDate);
                      setAppliedCustomEndDate(customEndDate);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <p className="daily-sales-metrics__notice">Loading latest sales performance...</p>
          ) : null}
          {errorMessage ? (
            <p className="daily-sales-metrics__notice daily-sales-metrics__notice--error">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="daily-sales-metrics__kpi-grid">
          {summaryCards.map((card) => (
            <article key={card.id} className="daily-sales-metrics__kpi-card">
              <div className="daily-sales-metrics__kpi-top">
                <span className="daily-sales-metrics__kpi-label">{card.label}</span>
                <span
                  className={`daily-sales-metrics__badge daily-sales-metrics__badge--${card.trend}`}
                >
                  {card.trend}
                </span>
              </div>
              <div className="daily-sales-metrics__kpi-value">{card.value}</div>
            </article>
          ))}
        </div>

        <div className="daily-sales-metrics__section">
          <div className="daily-sales-metrics__section-header">
            <h3 className="daily-sales-metrics__section-title">Team Performance</h3>
            <span className="daily-sales-metrics__section-subtitle">
              Ranked by conversion and sales
            </span>
          </div>
          <div className="daily-sales-metrics__team-grid">
            {displayAgents.map((agent) => {
              const cardClassName = `daily-sales-metrics__team-card daily-sales-metrics__team-card--${agent.status} ${
                agent.isPlaceholder ? "" : "daily-sales-metrics__team-trigger"
              }`;

              if (agent.isPlaceholder) {
                return (
                  <div key={agent.id} className={cardClassName}>
                    <div className="daily-sales-metrics__team-header">
                      <div className="daily-sales-metrics__team-meta">
                        <span className="daily-sales-metrics__rank">#{agent.rank}</span>
                        <div className="daily-sales-metrics__avatar">{agent.initials}</div>
                        <div className="daily-sales-metrics__identity">
                          <div className="daily-sales-metrics__name">{agent.name}</div>
                        </div>
                      </div>
                      <span
                        className={`daily-sales-metrics__status daily-sales-metrics__status--${agent.status}`}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <div className="daily-sales-metrics__team-body">
                      <div className="daily-sales-metrics__performance">0%</div>
                      <div className="daily-sales-metrics__detail">
                        <span>Sales</span>
                        <strong>PHP 0</strong>
                      </div>
                      <div className="daily-sales-metrics__detail">
                        <span>Target</span>
                        <strong>PHP 0</strong>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={agent.id}
                  type="button"
                  className={cardClassName}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div className="daily-sales-metrics__team-header">
                    <div className="daily-sales-metrics__team-meta">
                      <span className="daily-sales-metrics__rank">#{agent.rank}</span>
                      <div className="daily-sales-metrics__avatar">{agent.initials}</div>
                      <div className="daily-sales-metrics__identity">
                        <div className="daily-sales-metrics__name">{agent.name}</div>
                      </div>
                    </div>
                    <span
                      className={`daily-sales-metrics__status daily-sales-metrics__status--${agent.status}`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="daily-sales-metrics__team-body">
                    <div className="daily-sales-metrics__performance">
                      {agent.conversionRate}%
                    </div>
                    <div className="daily-sales-metrics__detail">
                      <span>Sales</span>
                      <strong>
                        {agent.sales.toLocaleString("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </strong>
                    </div>
                    <div className="daily-sales-metrics__detail">
                      <span>Target</span>
                      <strong>
                        {agent.target.toLocaleString("en-PH", {
                          style: "currency",
                          currency: "PHP",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <AgentDetailsDialog
        agent={selectedAgent}
        rank={selectedAgentRank}
        onClose={() => setSelectedAgent(null)}
      />
    </>
  );
}

