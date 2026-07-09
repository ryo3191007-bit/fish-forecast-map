import { mapLayerOptions, type MapLayerMode } from "@/domain/mapLayer";

type MapLayerToggleProps = {
  value: MapLayerMode;
  onChange: (value: MapLayerMode) => void;
};

export function MapLayerToggle({ value, onChange }: MapLayerToggleProps) {
  return (
    <div className="mapLayerToggle" aria-label="地図レイヤー切替">
      {mapLayerOptions.map((option) => (
        <button
          type="button"
          key={option.id}
          className={value === option.id ? "mapLayerButton active" : "mapLayerButton"}
          aria-pressed={value === option.id}
          title={option.description}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
