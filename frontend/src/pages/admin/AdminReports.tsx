import { useEffect, useState } from 'react';
import { getReports } from '../../api/client';
import type { Report } from '../../types';

const SEQUENTIAL_BLUE = '#2a78d6';
const COLD_ORANGE = '#eb6834';

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminReports() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    getReports().then(setReport);
  }, []);

  if (!report) return <p className="max-w-4xl mx-auto px-4 py-6 text-gray-500">Loading reports...</p>;

  const maxOrders = Math.max(1, ...report.orders_per_day.map((d) => Number(d.order_count)));
  const repeatPercent = report.total_customers > 0
    ? Math.round((report.repeat_customers / report.total_customers) * 100)
    : 0;

  const standard = report.delivery_time_by_cold_chain.find((d) => !d.has_cold_items);
  const cold = report.delivery_time_by_cold_chain.find((d) => d.has_cold_items);
  const maxMinutes = Math.max(1, Number(standard?.avg_minutes) || 0, Number(cold?.avg_minutes) || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatTile
          label="Total customers"
          value={String(report.total_customers)}
        />
        <StatTile
          label="Repeat customers"
          value={String(report.repeat_customers)}
          sub={`${repeatPercent}% of customers`}
        />
        <StatTile
          label="Active drivers"
          value={String(report.driver_utilization.length)}
        />
      </div>

      <section className="mb-8">
        <h2 className="font-semibold text-gray-800 mb-3">Orders per day (last 14 days)</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-end gap-1.5 h-40">
            {report.orders_per_day.map((d) => {
              const heightPct = (Number(d.order_count) / maxOrders) * 100;
              const day = new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <div key={d.day} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    style={{ height: `${heightPct}%`, backgroundColor: SEQUENTIAL_BLUE }}
                    className="w-full rounded-t min-h-[2px]"
                  />
                  <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-900 text-white rounded px-1.5 py-0.5 whitespace-nowrap">
                    {day}: {d.order_count}
                  </div>
                </div>
              );
            })}
            {report.orders_per_day.length === 0 && <p className="text-gray-400 text-sm">No orders in this period.</p>}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-gray-800 mb-3">Avg delivery time: cold-chain vs standard</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          {[{ label: 'Standard', data: standard, color: SEQUENTIAL_BLUE }, { label: 'Cold chain', data: cold, color: COLD_ORANGE }].map((row) => {
            const minutes = Number(row.data?.avg_minutes) || 0;
            const widthPct = row.data ? (minutes / maxMinutes) * 100 : 0;
            return (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-gray-700 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded h-5 relative">
                  <div className="h-5 rounded" style={{ width: `${widthPct}%`, backgroundColor: row.color }} />
                </div>
                <span className="w-32 shrink-0 text-gray-600 tabular-nums">
                  {row.data ? `${minutes.toFixed(0)} min (${row.data.delivered_count})` : 'no data'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-gray-800 mb-3">Driver utilization (last 14 days)</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Deliveries</th>
              </tr>
            </thead>
            <tbody>
              {report.driver_utilization.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{d.full_name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${d.availability_status === 'online' ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                      {d.availability_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.deliveries_last_14_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
