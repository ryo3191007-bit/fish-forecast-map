const bounds = { west: 128.5, south: 32.5, east: 130.8, north: 34.0 };

function estimate(stepArcSeconds) {
  const step = stepArcSeconds / 3600;
  return {
    resolution: `${stepArcSeconds} arc-second`,
    columns: Math.floor((bounds.east - bounds.west) / step) + 1,
    rows: Math.floor((bounds.north - bounds.south) / step) + 1,
  };
}

const estimates = [60, 15].map((seconds) => {
  const item = estimate(seconds);
  return { ...item, cells: item.columns * item.rows };
});

console.log(JSON.stringify({ bounds, estimates }, null, 2));
