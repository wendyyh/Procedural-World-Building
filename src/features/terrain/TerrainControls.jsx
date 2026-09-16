const SHAPING_OPTIONS = {
  linear: null,
  power: { label: 'Curve exponent', min: 0.5, max: 3, step: 0.05 },
  ridged: { label: 'Ridge sharpness', min: 0.5, max: 3, step: 0.05 },
  terrace: { label: 'Terrace steps', min: 3, max: 16, step: 1 },
  island: { label: 'Coast falloff', min: 0.5, max: 4, step: 0.05 },
}

const SHAPING_DEFAULTS = {
  linear: 1,
  power: 1.6,
  ridged: 1.35,
  terrace: 7,
  island: 1.35,
}

function RangeControl({ label, value, min, max, step, onChange, displayValue = value }) {
  return (
    <label className="range-control">
      <span>
        <strong>{label}</strong>
        <output>{displayValue}</output>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function TerrainControls({
  config,
  onConfigChange,
  wireframe,
  onWireframeChange,
  onRandomize,
  onReset,
}) {
  const update = (key, value) => onConfigChange({ ...config, [key]: value })
  const shapeControl = SHAPING_OPTIONS[config.shaping]

  return (
    <>
      <section className="control-section">
        <div className="section-heading">
          <h2>Generator</h2>
          <button type="button" className="text-button" onClick={onRandomize}>New seed</button>
        </div>

        <label className="field-control">
          <span>Seed</span>
          <input
            type="text"
            value={config.seed}
            spellCheck="false"
            onChange={(event) => update('seed', event.target.value)}
          />
        </label>

        <label className="field-control">
          <span>Resolution</span>
          <select
            value={config.resolution}
            onChange={(event) => update('resolution', Number(event.target.value))}
          >
            <option value="48">48 × 48</option>
            <option value="72">72 × 72</option>
            <option value="96">96 × 96</option>
            <option value="128">128 × 128</option>
          </select>
        </label>

        <RangeControl
          label="Noise scale"
          value={config.frequency}
          min={0.15}
          max={1.2}
          step={0.01}
          displayValue={config.frequency.toFixed(2)}
          onChange={(value) => update('frequency', value)}
        />
        <RangeControl
          label="Octaves"
          value={config.octaves}
          min={1}
          max={8}
          step={1}
          onChange={(value) => update('octaves', value)}
        />
        <RangeControl
          label="Persistence"
          value={config.persistence}
          min={0.2}
          max={0.8}
          step={0.01}
          displayValue={config.persistence.toFixed(2)}
          onChange={(value) => update('persistence', value)}
        />
        <RangeControl
          label="Lacunarity"
          value={config.lacunarity}
          min={1.2}
          max={3.5}
          step={0.05}
          displayValue={config.lacunarity.toFixed(2)}
          onChange={(value) => update('lacunarity', value)}
        />
      </section>

      <section className="control-section">
        <h2>Shaping</h2>
        <label className="field-control">
          <span>Operation</span>
          <select
            value={config.shaping}
            onChange={(event) => {
              const shaping = event.target.value
              onConfigChange({
                ...config,
                shaping,
                shapeAmount: SHAPING_DEFAULTS[shaping],
              })
            }}
          >
            <option value="linear">Natural</option>
            <option value="power">Power curve</option>
            <option value="ridged">Ridged</option>
            <option value="terrace">Terraced</option>
            <option value="island">Island falloff</option>
          </select>
        </label>

        {shapeControl && (
          <RangeControl
            label={shapeControl.label}
            value={config.shapeAmount}
            min={shapeControl.min}
            max={shapeControl.max}
            step={shapeControl.step}
            displayValue={config.shapeAmount.toFixed(shapeControl.step === 1 ? 0 : 2)}
            onChange={(value) => update('shapeAmount', value)}
          />
        )}
      </section>

      <section className="control-section">
        <h2>Terrain</h2>
        <RangeControl
          label="Elevation"
          value={config.heightScale}
          min={1}
          max={8}
          step={0.1}
          displayValue={config.heightScale.toFixed(1)}
          onChange={(value) => update('heightScale', value)}
        />
        <RangeControl
          label="Water level"
          value={config.waterLevel}
          min={0.15}
          max={0.65}
          step={0.01}
          displayValue={config.waterLevel.toFixed(2)}
          onChange={(value) => update('waterLevel', value)}
        />

        <label className="toggle-row compact-toggle">
          <span>
            <strong>Wireframe</strong>
            <small>Inspect the terrain topology</small>
          </span>
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(event) => onWireframeChange(event.target.checked)}
          />
        </label>
      </section>

      <button type="button" className="reset-button" onClick={onReset}>Reset terrain</button>
    </>
  )
}
