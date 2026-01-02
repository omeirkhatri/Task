/// <reference types="vite/client" />

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

// Google Maps types
declare namespace google {
  namespace maps {
    class Map extends google.maps.MVCObject {
      constructor(mapDiv: HTMLElement | null, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      setMapTypeId(mapTypeId: MapTypeId | string): void;
      fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
      getCenter(): LatLng | null;
      getZoom(): number | null;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: MapTypeId | string;
    }

    enum MapTypeId {
      ROADMAP = "roadmap",
      SATELLITE = "satellite",
      HYBRID = "hybrid",
      TERRAIN = "terrain",
    }

    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      extend(point: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      isEmpty(): boolean;
      toSpan(): LatLng;
    }

    interface Padding {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    }

    class OverlayView extends google.maps.MVCObject {
      onAdd(): void;
      onRemove(): void;
      draw(): void;
      getPanes(): MapPanes | null;
      getProjection(): MapCanvasProjection | null;
      setMap(map: Map | null): void;
      getMap(): Map | null;
    }

    interface MapPanes {
      floatPane: HTMLElement;
      mapPane: HTMLElement;
      markerLayer: HTMLElement;
      overlayLayer: HTMLElement;
      overlayMouseTarget: HTMLElement;
    }

    class MapCanvasProjection {
      fromLatLngToDivPixel(latlng: LatLng | LatLngLiteral): Point | null;
      fromDivPixelToLatLng(pixel: Point, nowrap?: boolean): LatLng | null;
    }

    class Point {
      x: number;
      y: number;
      constructor(x: number, y: number);
    }

    class MVCObject {
      bindTo(key: string, target: MVCObject, targetKey?: string, notify?: boolean): void;
      get(key: string): any;
      notify(key: string): void;
      set(key: string, value: any): void;
      setValues(values: any): void;
      unbind(key: string): void;
      unbindAll(): void;
    }
  }
}

export {};
