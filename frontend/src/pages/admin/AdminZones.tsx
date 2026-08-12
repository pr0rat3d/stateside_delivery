import { useEffect, useState } from 'react';
import { createZone, getAdminZones, updateZone } from '../../api/client';
import type { Zone } from '../../types';

const SERVICE_LEVELS = ['standard', 'priority', 'scheduled_only'];

const emptyForm = { name: '', base_delivery_fee: '5.00', service_level: 'standard', min_order_value: '10.00', max_delivery_time_minutes: '30' };

export default function AdminZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Partial<Zone>>>({});
  const [newZone, setNewZone] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  function refresh() {
    getAdminZones().then(setZones);
  }

  useEffect(() => {
    refresh();
  }, []);

  function draftFor(zone: Zone): Partial<Zone> {
    return drafts[zone.id] ?? {};
  }

  function updateDraft(zoneId: number, patch: Partial<Zone>) {
    setDrafts((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], ...patch } }));
  }

  async function saveZone(zone: Zone) {
    const draft = draftFor(zone);
    if (Object.keys(draft).length === 0) return;
    const updated = await updateZone(zone.id, draft);
    setZones((prev) => prev.map((z) => (z.id === zone.id ? updated : z)));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[zone.id];
      return next;
    });
  }

  async function toggleActive(zone: Zone) {
    const updated = await updateZone(zone.id, { is_active: !zone.is_active });
    setZones((prev) => prev.map((z) => (z.id === zone.id ? updated : z)));
  }

  async function handleCreate() {
    if (!newZone.name.trim()) return;
    setCreating(true);
    try {
      await createZone({
        name: newZone.name,
        base_delivery_fee: Number(newZone.base_delivery_fee),
        service_level: newZone.service_level,
        min_order_value: Number(newZone.min_order_value),
        max_delivery_time_minutes: Number(newZone.max_delivery_time_minutes),
      });
      setNewZone(emptyForm);
      refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Zones</h1>

      <div className="space-y-3 mb-8">
        {zones.map((zone) => {
          const draft = draftFor(zone);
          const dirty = Object.keys(draft).length > 0;
          return (
            <div key={zone.id} className={`rounded-xl border p-4 ${zone.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
              <div className="flex items-center justify-between mb-3">
                <input
                  defaultValue={zone.name}
                  onChange={(e) => updateDraft(zone.id, { name: e.target.value })}
                  className="font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-gray-400 outline-none"
                />
                <button
                  onClick={() => toggleActive(zone)}
                  className={`text-xs rounded-full px-2 py-0.5 ${zone.is_active ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-200'}`}
                >
                  {zone.is_active ? 'active' : 'inactive'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  Delivery fee ($)
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={zone.base_delivery_fee}
                    onChange={(e) => updateDraft(zone.id, { base_delivery_fee: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Min order value ($)
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={zone.min_order_value}
                    onChange={(e) => updateDraft(zone.id, { min_order_value: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Service level
                  <select
                    defaultValue={zone.service_level}
                    onChange={(e) => updateDraft(zone.id, { service_level: e.target.value as Zone['service_level'] })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  >
                    {SERVICE_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  Max delivery time (min)
                  <input
                    type="number"
                    defaultValue={zone.max_delivery_time_minutes}
                    onChange={(e) => updateDraft(zone.id, { max_delivery_time_minutes: Number(e.target.value) })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                </label>
              </div>
              {dirty && (
                <button
                  onClick={() => saveZone(zone)}
                  className="mt-3 rounded-full bg-teal-600 text-white text-sm font-medium px-4 py-1.5"
                >
                  Save changes
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Add a zone</h2>
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <input
            placeholder="Zone name"
            value={newZone.name}
            onChange={(e) => setNewZone((p) => ({ ...p, name: e.target.value }))}
            className="col-span-2 rounded-lg border border-gray-300 px-2 py-1"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Delivery fee"
            value={newZone.base_delivery_fee}
            onChange={(e) => setNewZone((p) => ({ ...p, base_delivery_fee: e.target.value }))}
            className="rounded-lg border border-gray-300 px-2 py-1"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Min order value"
            value={newZone.min_order_value}
            onChange={(e) => setNewZone((p) => ({ ...p, min_order_value: e.target.value }))}
            className="rounded-lg border border-gray-300 px-2 py-1"
          />
          <select
            value={newZone.service_level}
            onChange={(e) => setNewZone((p) => ({ ...p, service_level: e.target.value }))}
            className="rounded-lg border border-gray-300 px-2 py-1"
          >
            {SERVICE_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="number"
            placeholder="Max delivery time (min)"
            value={newZone.max_delivery_time_minutes}
            onChange={(e) => setNewZone((p) => ({ ...p, max_delivery_time_minutes: e.target.value }))}
            className="rounded-lg border border-gray-300 px-2 py-1"
          />
        </div>
        <button
          disabled={creating || !newZone.name.trim()}
          onClick={handleCreate}
          className="rounded-full bg-gray-900 text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50"
        >
          Create zone
        </button>
      </div>
    </div>
  );
}
