import { useState } from 'react';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, MAP_DEFAULT_CENTER } from '../config';
import type { AdminOrder } from '../types';

const containerStyle = { width: '100%', height: '100%' };

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

export default function GoogleLiveOrdersMap({ orders }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);

  if (!isLoaded) {
    return <div className="h-96 rounded-xl border border-gray-300 flex items-center justify-center text-gray-400">Loading map...</div>;
  }

  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;

  return (
    <div className="h-96 rounded-xl overflow-hidden border border-gray-300">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] }}
        zoom={13}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {orders.map((order) => (
          <MarkerF
            key={order.id}
            position={{ lat: Number(order.pin_latitude), lng: Number(order.pin_longitude) }}
            onClick={() => setActiveOrderId(order.id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: STATUS_COLORS[order.status] || '#6b7280',
              fillOpacity: 0.9,
              strokeColor: '#1f2937',
              strokeWeight: 1,
            }}
          />
        ))}
        {activeOrder && (
          <InfoWindowF
            position={{ lat: Number(activeOrder.pin_latitude), lng: Number(activeOrder.pin_longitude) }}
            onCloseClick={() => setActiveOrderId(null)}
          >
            <div className="text-sm">
              <strong>Order #{activeOrder.id}</strong> · {activeOrder.status.replace('_', ' ')}
              <br />
              {activeOrder.merchant_name} → {activeOrder.customer_name}
              <br />
              Driver: {activeOrder.driver_name || 'unassigned'}
              {activeOrder.has_cold_items && <><br />❄ cold chain</>}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
