import { useCallback } from 'react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, MAP_DEFAULT_CENTER } from '../config';

const containerStyle = { width: '100%', height: '100%' };

interface Props {
  position: [number, number];
  onChange: (position: [number, number]) => void;
}

export default function GoogleLocationPicker({ position, onChange }: Props) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onChange([e.latLng.lat(), e.latLng.lng()]);
    },
    [onChange]
  );

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onChange([e.latLng.lat(), e.latLng.lng()]);
    },
    [onChange]
  );

  if (!isLoaded) {
    return <div className="h-64 rounded-xl border border-gray-300 flex items-center justify-center text-gray-400">Loading map...</div>;
  }

  return (
    <div className="h-64 rounded-xl overflow-hidden border border-gray-300">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: position[0] ?? MAP_DEFAULT_CENTER[0], lng: position[1] ?? MAP_DEFAULT_CENTER[1] }}
        zoom={15}
        onClick={handleClick}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        <MarkerF position={{ lat: position[0], lng: position[1] }} draggable onDragEnd={handleDragEnd} />
      </GoogleMap>
    </div>
  );
}
