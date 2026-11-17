/** The circle a watch zone covers, measured on the surface of the Earth. */
export interface ZoneShape {
  longitude: number;
  latitude: number;
  radiusKm: number;
}

/** A watch zone as sent to the browser. */
export interface Zone extends ZoneShape {
  id: string;
  name: string;
}
