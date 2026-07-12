import assert from 'node:assert/strict';
const BATHYMETRY_STANDARD_NOTICE = '水深データを読み込めなかったため通常地図へ戻しました';
function initialBathymetryFallbackState() { return { display: 'gebco', attempted: { gebco: true, etopo: false }, failedKeys: [], notice: null }; }
function reduceBathymetryFallback(state, event) {
  if (event.type === 'source-success') return { ...state, display: event.source, notice: null };
  const errorKey = `${event.source}:${event.key}`;
  if (state.failedKeys.includes(errorKey)) return state;
  const failedKeys = [...state.failedKeys, errorKey];
  if (event.source === 'gebco') return { display: 'etopo', attempted: { gebco: true, etopo: true }, failedKeys, notice: null };
  return { display: 'standard', attempted: { gebco: true, etopo: true }, failedKeys, notice: BATHYMETRY_STANDARD_NOTICE };
}
let s = initialBathymetryFallbackState();
s = reduceBathymetryFallback(s, { type: 'source-success', source: 'gebco' });
assert.equal(s.display, 'gebco');
s = initialBathymetryFallbackState();
s = reduceBathymetryFallback(s, { type: 'source-error', source: 'gebco', key: 'tile-404' });
assert.equal(s.display, 'etopo');
s = reduceBathymetryFallback(s, { type: 'source-success', source: 'etopo' });
assert.equal(s.display, 'etopo');
s = initialBathymetryFallbackState();
s = reduceBathymetryFallback(s, { type: 'source-error', source: 'gebco', key: 'metadata' });
s = reduceBathymetryFallback(s, { type: 'source-error', source: 'etopo', key: 'decode' });
assert.equal(s.display, 'standard');
assert.equal(s.notice, BATHYMETRY_STANDARD_NOTICE);
const once = s;
s = reduceBathymetryFallback(s, { type: 'source-error', source: 'etopo', key: 'decode' });
assert.deepEqual(s, once);
console.log('bathymetry fallback state transitions passed');
