import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { MAP_DEFAULT_CENTER } from '../config';
import type { AdminOrder } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  accepted: '#3b82f6',
  preparing: '#3b82f6',
  ready_pickup: '#a855f7',
  in_transit: '#f97316',
};

interface Props {
  orders: AdminOrder[];
}

export default function LiveOrdersMap({ orders }: Props) {
  return (
    <div className="h-96 rounded-xl overflow-hidden border border-gray-300">
      <MapContainer center={MAP_DEFAULT_CENTER} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {orders.map((order) => (
          <CircleMarker
            key={order.id}
            center={[Number(order.pin_latitude), Number(order.pin_longitude)]}
            radius={9}
            pathOptions={{
              color: '#1f2937',
              weight: 1,
              fillColor: STATUS_COLORS[order.status] || '#6b7280',
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>Order #{order.id}</strong> · {order.status.replace('_', ' ')}
              <br />
              {order.merchant_name} → {order.customer_name}
              <br />
              Driver: {order.driver_name || 'unassigned'}
              {order.has_cold_items && <><br />❄ cold chain</>}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
