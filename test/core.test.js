import test from 'node:test';
import assert from 'node:assert/strict';

import { encode, decode, DEFAULT_PRECISION, MAX_PRECISION } from '../src/index.js';

// A handful of known geohashes. These are the canonical values produced by the
// standard algorithm for these coordinates at the given precision.
test('encode returns known geohashes', () => {
  assert.equal(encode(57.64911, 10.40744, 11), 'u4pruydqqvj');
  assert.equal(encode(0, 0, 1), 's');
  assert.equal(encode(90, 180, 1), 'z');
  assert.equal(encode(-90, -180, 1), '0');
});

test('encode uses the default precision', () => {
  const hash = encode(51.5074, -0.1278);
  assert.equal(hash.length, DEFAULT_PRECISION);
});

test('encode accepts precision 1 and MAX_PRECISION', () => {
  assert.equal(encode(0, 0, 1).length, 1);
  assert.equal(encode(0, 0, MAX_PRECISION).length, MAX_PRECISION);
});

test('encode rejects out-of-range coordinates', () => {
  assert.throws(() => encode(90.1, 0), RangeError);
  assert.throws(() => encode(-90.1, 0), RangeError);
  assert.throws(() => encode(0, 180.1), RangeError);
  assert.throws(() => encode(0, -180.1), RangeError);
});

test('encode rejects non-finite coordinates', () => {
  assert.throws(() => encode(NaN, 0), TypeError);
  assert.throws(() => encode(0, Infinity), TypeError);
  assert.throws(() => encode(0, -Infinity), TypeError);
});

test('encode rejects invalid precision', () => {
  assert.throws(() => encode(0, 0, 0), RangeError);
  assert.throws(() => encode(0, 0, MAX_PRECISION + 1), RangeError);
  assert.throws(() => encode(0, 0, 1.5), RangeError);
});

test('decode returns the centre of the cell', () => {
  const result = decode('s');
  // 's' covers longitude [0, 45) and latitude [0, 45), centre (22.5, 22.5).
  assert.equal(result.latitude, 22.5);
  assert.equal(result.longitude, 22.5);
  assert.equal(result.latitudeError, 22.5);
  assert.equal(result.longitudeError, 22.5);
});

test('decode of a full-precision hash is close to the original point', () => {
  const lat = 57.64911;
  const lon = 10.40744;
  const hash = encode(lat, lon, 11);
  const result = decode(hash);
  assert.ok(Math.abs(result.latitude - lat) < 1e-4);
  assert.ok(Math.abs(result.longitude - lon) < 1e-4);
});

test('encode/decode round trip preserves the cell', () => {
  const hash = encode(-33.8688, 151.2093, 9);
  const result = decode(hash);
  const reencoded = encode(result.latitude, result.longitude, 9);
  assert.equal(reencoded, hash);
});

test('precision increases resolution monotonically', () => {
  const lat = 48.8566;
  const lon = 2.3522;
  const coarse = decode(encode(lat, lon, 4));
  const fine = decode(encode(lat, lon, 10));
  assert.ok(fine.latitudeError < coarse.latitudeError);
  assert.ok(fine.longitudeError < coarse.longitudeError);
});

test('decode rejects invalid input', () => {
  assert.throws(() => decode(''), RangeError);
  assert.throws(() => decode('a'), RangeError); // 'a' is not in the base32 alphabet
  assert.throws(() => decode('u4pruydqqvj!'), RangeError);
  assert.throws(() => decode(123), TypeError);
  assert.throws(() => decode('0'.repeat(MAX_PRECISION + 1)), RangeError);
});

test('decode of the edge hashes gives the expected corners', () => {
  const bottomLeft = decode('0');
  assert.equal(bottomLeft.latitude, -67.5);
  assert.equal(bottomLeft.longitude, -157.5);

  const topRight = decode('z');
  assert.equal(topRight.latitude, 67.5);
  assert.equal(topRight.longitude, 157.5);
});
