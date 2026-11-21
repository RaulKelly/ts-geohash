// Geohash encoding and decoding for latitude/longitude pairs.
//
// Design notes:
// - Geohash is a base32 string produced by interleaving the bits of a binary
//   longitude and latitude representation. The base32 alphabet is the standard
//   one defined by Gustavo Niemeyer's original geohash description:
//     "0123456789bcdefghjkmnpqrstuvwxyz"
// - We keep the implementation dependency-free and synchronous.
// - Coordinates are validated strictly: latitude in [-90, 90], longitude in
//   [-180, 180]. NaN and non-finite numbers are rejected.
// - Decoding returns the centre point of the decoded cell. A geohash names a
//   rectangular cell, not a point; returning the centre is the conventional and
//   most useful interpretation. The half-size of the cell is also returned so
//   callers can reason about the uncertainty.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_MAP = (() => {
  const map = new Map();
  for (let i = 0; i < BASE32.length; i++) {
    map.set(BASE32[i], i);
  }
  return map;
})();

/** Default geohash length used by {@link encode} when no precision is given. */
export const DEFAULT_PRECISION = 12;

/** Maximum supported geohash length. Beyond this the extra bits are noise. */
export const MAX_PRECISION = 22;

/**
 * Encode a latitude/longitude pair as a geohash string.
 *
 * @param {number} latitude degrees, in [-90, 90]
 * @param {number} longitude degrees, in [-180, 180]
 * @param {number} [precision=DEFAULT_PRECISION] number of base32 characters,
 *   an integer in [1, MAX_PRECISION]
 * @returns {string} the geohash
 * @throws {TypeError} if any argument is not a finite number
 * @throws {RangeError} if latitude, longitude, or precision is out of range
 */
export function encode(latitude, longitude, precision = DEFAULT_PRECISION) {
  assertFiniteNumber(latitude, 'latitude');
  assertFiniteNumber(longitude, 'longitude');
  assertFiniteNumber(precision, 'precision');

  if (latitude < -90 || latitude > 90) {
    throw new RangeError(`latitude must be in [-90, 90], got ${latitude}`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new RangeError(`longitude must be in [-180, 180], got ${longitude}`);
  }
  if (!Number.isInteger(precision)) {
    throw new RangeError(`precision must be an integer, got ${precision}`);
  }
  if (precision < 1 || precision > MAX_PRECISION) {
    throw new RangeError(
      `precision must be in [1, ${MAX_PRECISION}], got ${precision}`,
    );
  }

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  let bit = 0;
  let ch = 0;
  let even = true; // even bits encode longitude, odd bits encode latitude
  let hash = '';

  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        ch = (ch << 1) | 1;
        lonMin = mid;
      } else {
        ch = ch << 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch = ch << 1;
        latMax = mid;
      }
    }
    even = !even;
    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Decode a geohash string back to its cell centre and dimensions.
 *
 * @param {string} hash the geohash
 * @returns {{latitude: number, longitude: number, latitudeError: number, longitudeError: number}}
 *   the centre of the cell, plus the half-height and half-width of the cell in
 *   degrees. `latitudeError` is the maximum distance from the centre to the
 *   cell's northern or southern edge; `longitudeError` is the same for the
 *   eastern or western edge.
 * @throws {TypeError} if `hash` is not a string
 * @throws {RangeError} if the hash is empty, too long, or contains characters
 *   outside the base32 alphabet
 */
export function decode(hash) {
  if (typeof hash !== 'string') {
    throw new TypeError(`hash must be a string, got ${typeof hash}`);
  }
  if (hash.length === 0) {
    throw new RangeError('hash must not be empty');
  }
  if (hash.length > MAX_PRECISION) {
    throw new RangeError(
      `hash must be at most ${MAX_PRECISION} characters, got ${hash.length}`,
    );
  }

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  let even = true;

  for (let i = 0; i < hash.length; i++) {
    const c = hash[i];
    const value = BASE32_MAP.get(c);
    if (value === undefined) {
      throw new RangeError(`invalid geohash character ${JSON.stringify(c)} at index ${i}`);
    }
    for (let mask = 16; mask > 0; mask >>= 1) {
      if (even) {
        const mid = (lonMin + lonMax) / 2;
        if (value & mask) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (value & mask) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      even = !even;
    }
  }

  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lonMin + lonMax) / 2,
    latitudeError: (latMax - latMin) / 2,
    longitudeError: (lonMax - lonMin) / 2,
  };
}

function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${String(value)}`);
  }
}
