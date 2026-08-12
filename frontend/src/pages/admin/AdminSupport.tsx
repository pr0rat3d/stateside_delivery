import { useEffect, useState } from 'react';
import { getSupportTickets, updateSupportTicket } from '../../api/client';
import { formatNaiveTimestamp } from '../../utils/formatDate';
import type { SupportTicket } from '../../types';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState<Record<number, string>>({});

  function refresh() {
    getSupportTickets(filter || undefined).then(setTickets);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function resolveTicket(ticket: SupportTicket) {
    const resolution = resolutionDraft[ticket.id]?.trim();
    if (!resolution) return;
    await updateSupportTicket(ticket.id, { status: 'resolved', resolution });
    refresh();
  }

  async function setStatus(ticket: SupportTicket, status: SupportTicket['status']) {
    await updateSupportTicket(ticket.id, { status });
    refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Support tickets</h1>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium border ${
              filter === f.value ? 'bg-slate-900 text-white border-slate-900' : 'border-gray-300 text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-gray-900">
                #{ticket.id} · {ticket.issue_type.replace('_', ' ')} · {ticket.customer_name}
              </p>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                ticket.status === 'open' ? 'text-amber-700 bg-amber-50'
                : ticket.status === 'resolved' ? 'text-green-700 bg-green-50'
                : ticket.status === 'closed' ? 'text-gray-500 bg-gray-100'
                : 'text-blue-700 bg-blue-50'
              }`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">{ticket.description}</p>
            <p className="text-sm text-gray-400 mb-3">
              {ticket.merchant_name && `${ticket.merchant_name} · `}
              {ticket.order_total && `$${Number(ticket.order_total).toFixed(2)} · `}
              {formatNaiveTimestamp(ticket.created_at)}
            </p>

            {ticket.resolution && (
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2 mb-3">
                <strong>Resolution:</strong> {ticket.resolution}
              </p>
            )}

            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <div className="flex gap-2">
                <input
                  placeholder="Resolution note"
                  value={resolutionDraft[ticket.id] || ''}
                  onChange={(e) => setResolutionDraft((p) => ({ ...p, [ticket.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => resolveTicket(ticket)}
                  disabled={!resolutionDraft[ticket.id]?.trim()}
                  className="rounded-full bg-teal-600 text-white text-sm font-medium px-3 py-1 disabled:opacity-50"
                >
                  Resolve
                </button>
                {ticket.status === 'open' && (
                  <button
                    onClick={() => setStatus(ticket, 'in_progress')}
                    className="rounded-full border border-gray-300 text-gray-700 text-sm font-medium px-3 py-1"
                  >
                    Mark in progress
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && <p className="text-gray-500">No tickets match this filter.</p>}
      </div>
    </div>
  );
}
