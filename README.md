# ts-geohash

Convert latitude/longitude pairs to geohash strings and back.

```js
import { encode, decode } from 'ts-geohash';

const hash = encode(57.64911, 10.40744, 11);
// 'u4pruydqqvj'

const cell = decode(hash);
// {
//   latitude: 57.649110317230225,
//   longitude: 10.407439976930618,
//   latitudeError: 0.000021457672119140625,
//   longitudeError: 0.000021457672119140625
// }
```

## Why this exists

Geohashes are a compact way to index a point on a map, but most small
implementations either pull in a dependency or silently accept invalid input.
This library is a single, dependency-free module that validates its arguments
and returns the centre of the decoded cell along with the half-size of that
cell. The trade-off is that it is deliberately small: it does not implement
neighbour lookup, bounding-box queries, or the `geohash-int` bit packing used
by some databases. If you need those, this is not the library for you.

## API

### `encode(latitude, longitude, precision = DEFAULT_PRECISION)`

Returns a geohash string. `latitude` must be in `[-90, 90]`, `longitude` in
`[-180, 180]`, and `precision` an integer in `[1, MAX_PRECISION]`. Throws
`TypeError` for non-finite numbers and `RangeError` for out-of-range values.

### `decode(hash)`

Returns `{ latitude, longitude, latitudeError, longitudeError }`. The first two
are the centre of the cell; the last two are the half-height and half-width of
the cell in degrees. Throws `TypeError` if `hash` is not a string and
`RangeError` if it is empty, too long, or contains a character outside the
base32 alphabet.

### `DEFAULT_PRECISION` and `MAX_PRECISION`

`DEFAULT_PRECISION` is `12`. `MAX_PRECISION` is `22`; longer hashes add no
meaningful precision and are rejected.

## The awkward edge

A geohash names a rectangular cell, not a point. `decode` returns the centre of
that cell, which is the conventional choice, but it means `decode(encode(p))`
is not exactly `p` unless `p` happens to be the centre. The `latitudeError` and
`longitudeError` fields tell you how far the centre can be from any point in the
cell, so you can decide whether that is good enough for your use case.
