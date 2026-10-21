import assert from 'node:assert/strict'
import { Worker } from 'node:worker_threads'
import { buildingSignature, buildingState, pruneSlabIslands, roofSurfaceAt, structureSupport } from '../src/features/after-us/buildingModel.js'
import { createPlantGeometry, createTreeGeometry, foliageAsset } from '../src/features/after-us/foliageGeometry.js'
import { plantSpecies, plantVigor } from '../src/features/after-us/plantHabitat.js'
import { createArchitecture } from '../src/features/after-us/districtGeometry.js'
import { decorationSupported, rubbleSurfaceY } from '../src/features/after-us/buildingGeometry.js'
import { sampleDebrisFall } from '../src/features/after-us/decayMotion.js'
import { advanceWorld, canalX, cellAt, createDistrict, DEFAULT_AGE, DEFAULT_WORLD, GRID, plantGrowth, railZ, requestedDistricts, terrainAt } from '../src/features/after-us/worldModel.js'
import { createDayClock, DAY_CYCLE_SECONDS, formatTimeOfDay, readDayClock, sampleDayNight } from '../src/features/after-us/dayNight.js'
import { createPreviewData, createPreviewSnapshot, insideSlice, interpolatePreview, PREVIEW_CYCLE_SECONDS, previewFrame, sliceBoundary } from '../src/features/after-us/previewModel.js'
import { excavationPoint } from '../src/features/after-us/cutoutGeology.js'

const cutout = createPreviewData(), animated = createPreviewSnapshot(cutout)
const mainOpeningState = advanceWorld(cutout.model, DEFAULT_WORLD, DEFAULT_AGE)
assert.deepEqual(cutout.architectureSnapshot.structures, mainOpeningState.structures, 'The landing cutout must show the main world’s current default architecture state')
assert.ok(cutout.parts.surfaces.some((part) => part.kind === 'spall') && cutout.parts.debris.length > 0, 'The landing cutout must include current weathering and settled masonry')
assert.ok(cutout.model.buildings.some((building) => building.floors >= 5) && new Set(cutout.model.buildings.map((building) => building.variant)).size >= 3, 'The showcase must combine a taller landmark with varied lower buildings')
const landmark = cutout.model.buildings.reduce((tallest, building) => building.height > tallest.height ? building : tallest)
assert.ok(landmark.height / Math.min(landmark.width, landmark.depth) < 2.5 && cutout.model.buildings.length >= 6, 'The landmark must have a broad footprint within a complete neighborhood')
for (const b of cutout.model.buildings) {
  for (const other of cutout.model.buildings) if (other.id !== b.id) assert.ok(Math.abs(b.x - other.x) >= (b.width + other.width) / 2 + 0.55 || Math.abs(b.z - other.z) >= (b.depth + other.depth) / 2 + 0.55, 'Showcase parcels must leave clear alleys between foundations')
  for (const edge of [-1, 0, 1]) {
    assert.ok(Math.abs(cutout.model.ox + b.x - canalX(cutout.model.ox + b.x, cutout.model.oz + b.z + edge * b.depth / 2, cutout.model.seed)) >= b.width / 2 + 1.5, 'Showcase buildings must leave the canal unobstructed')
    assert.ok(Math.abs(cutout.model.oz + b.z - railZ(cutout.model.ox + b.x + edge * b.width / 2, cutout.model.oz + b.z)) >= b.depth / 2 + 1.35, 'Showcase buildings must respect the railway corridor')
  }
}
for (let i = 0; i < 96; i += 1) {
  const angle = i / 96 * Math.PI * 2, [x, z] = sliceBoundary(angle)
  assert.ok(insideSlice(x * 0.999, z * 0.999) && !insideSlice(x * 1.001, z * 1.001), 'The cutout must have a continuous curved boundary')
  assert.equal(excavationPoint(angle, 0, cutout.model.seed, cutout.model.ox, cutout.model.oz)[1], terrainAt(cutout.model.ox + x, cutout.model.oz + z, cutout.model.seed), 'The excavation rim must meet the selected district’s terrain without gaps')
}
assert.ok(Object.values(cutout.model.candidates).flat().every((p) => insideSlice(p.x, p.z)), 'The preview must keep plant roots within its cutout')
assert.ok(cutout.parts.boxes.length > 150 && cutout.parts.tubes.length > 100, 'The preview must retain detailed architecture from the main world')
interpolatePreview(cutout.snapshots, 0, animated)
assert.deepEqual(animated.cover, cutout.snapshots[0].cover, 'The preview must begin with the initial ecosystem')
assert.ok(animated.cover.every((value) => value === 0) && cutout.snapshots.at(-1).stats.coverage > 45 && cutout.snapshots.at(-1).stats.facades >= 95, 'The homepage must show a strong contrast between bare ruins and mature vegetation')
const initialFacade = animated.climbers[0].value, coverBuffer = animated.cover
interpolatePreview(cutout.snapshots, 40, animated)
assert.deepEqual(animated.cover, cutout.snapshots[2].cover, 'The animation must pass through simulated ecological states')
interpolatePreview(cutout.snapshots, 80, animated)
assert.equal(animated.structures, cutout.architectureSnapshot.structures, 'The growth loop must retain the support state of the architecture actually displayed')
assert.equal(animated.environment, cutout.architectureSnapshot.environment, 'The cutout must retain the displayed ruin’s habitat openings')
assert.ok(animated.climbers[0].value > initialFacade + 0.5 && animated.cover === coverBuffer, 'Preview growth must reclaim facades while reusing its buffers')
assert.ok(previewFrame(0).year === 0 && previewFrame(PREVIEW_CYCLE_SECONDS * 0.75).year === 80, 'Autoplay must show both ruins and mature growth')
assert.equal(previewFrame(PREVIEW_CYCLE_SECONDS * 0.9375).opacity, 0, 'Resetting vegetation must happen while the preview is faded out')
assert.deepEqual(previewFrame(0), previewFrame(PREVIEW_CYCLE_SECONDS), 'The autoplay loop must join seamlessly')

const noon = sampleDayNight(12), night = sampleDayNight(0), morning = sampleDayNight(8), evening = sampleDayNight(17)
assert.ok(noon.sunIntensity > 2 && night.sunIntensity === 0 && night.moonIntensity > 0.5, 'Sun and moon must have distinct, readable daily lighting')
assert.ok(night.ambientIntensity > 0.3 && night.hemisphereIntensity > 0.6, 'Night must retain readable miniature detail')
assert.ok(morning.sunPosition[0] * evening.sunPosition[0] < 0, 'The sun must cross the scene and reverse shadow direction')
assert.ok(Math.abs(evening.sunPosition[1] / evening.sunPosition[0]) < Math.abs(morning.sunPosition[1] / morning.sunPosition[0]), 'Low evening sun must produce longer shadows')
assert.deepEqual(sampleDayNight(0), sampleDayNight(24), 'The daily lighting loop must join seamlessly at midnight')
for (let minute = 0; minute < 1440; minute += 1) {
  const a = sampleDayNight(minute / 60), b = sampleDayNight((minute + 1) / 60)
  assert.ok(Math.abs(a.sunIntensity - b.sunIntensity) < 0.04 && Math.abs(a.moonIntensity - b.moonIntensity) < 0.025, 'Daily intensities must transition continuously')
  for (const channel of ['sky', 'ambient', 'upper', 'ground', 'sun', 'water']) assert.ok(['r', 'g', 'b'].every((c) => Math.abs(a[channel][c] - b[channel][c]) < 0.015), 'Lighting colors must blend without preset jumps')
  assert.ok([...a.sunPosition, ...a.moonPosition, a.sunIntensity, a.moonIntensity].every(Number.isFinite), 'Daily lighting must stay finite at the horizon')
}
assert.equal(formatTimeOfDay(0), '00:00'); assert.equal(formatTimeOfDay(24), '24:00'); assert.equal(formatTimeOfDay(17.5), '17:30')
const dayClock = createDayClock(23, 1000)
assert.equal(readDayClock(dayClock, 90000), 23, 'Paused daily time must remain fixed')
dayClock.autoCycle = true
assert.ok(Math.abs(readDayClock(dayClock, 1000 + DAY_CYCLE_SECONDS * 1000 / 12) - 1) < 1e-8, 'Automatic daily time must wrap continuously through midnight')

const model = createDistrict(DEFAULT_WORLD.seed)
assert.deepEqual(model, createDistrict(DEFAULT_WORLD.seed), 'A district must reproduce exactly when revisited')
assert.notDeepEqual(model.heights, createDistrict('another-city').heights, 'Different seeds must change the world')
const east = createDistrict(DEFAULT_WORLD.seed, 1, 0)
for (let row = 0; row < GRID; row += 1) assert.equal(model.heights[row * GRID + GRID - 1], east.heights[row * GRID], 'Neighboring terrain edges must match')
assert.ok(Math.abs(canalX(0, 12, model.seed) - canalX(0, 12.001, model.seed)) < 0.001, 'Canal must continue across district boundaries')
assert.ok(Math.abs(railZ(12, 0) - railZ(12.001, 0)) < 0.001, 'Railway must continue across district boundaries')
assert.ok(model.barrier[cellAt(-11, 0)] > model.barrier[cellAt(0, 8)], 'Roads must interrupt ecological dispersal')
assert.ok(model.moisture[cellAt(7, 0)] > model.moisture[cellAt(-8, 0)], 'Canals must provide a moisture corridor')
for (const b of model.buildings) assert.ok(b.base >= terrainAt(model.ox + b.x, model.oz + b.z, model.seed), 'Foundations must rest above the terrain')

// Placement constraints must hold across layouts, densities, and adjacent districts.
for (const buildingLayout of ['courtyard', 'streets', 'clustered']) {
  const sparse = createDistrict(DEFAULT_WORLD.seed, 0, 0, { ...DEFAULT_WORLD, buildingLayout, buildingDensity: 0.35 })
  const dense = createDistrict(DEFAULT_WORLD.seed, 0, 0, { ...DEFAULT_WORLD, buildingLayout, buildingDensity: 2 })
  assert.ok(dense.buildings.length >= sparse.buildings.length + 2, 'Density must visibly add buildings')
  assert.deepEqual(dense.buildings[0], sparse.buildings[0], 'Adding lots must preserve existing buildings')
  assert.deepEqual(dense, createDistrict(DEFAULT_WORLD.seed, 0, 0, { ...DEFAULT_WORLD, buildingLayout, buildingDensity: 2 }), 'Building controls must remain deterministic')
  for (let cx = -1; cx <= 1; cx += 1) for (let cz = -1; cz <= 1; cz += 1) {
    const district = createDistrict(DEFAULT_WORLD.seed, cx, cz, { ...DEFAULT_WORLD, buildingLayout, buildingDensity: 2 })
    for (const b of district.buildings) {
      assert.ok(Math.abs(b.x) + b.width / 2 <= 9.15 && Math.abs(b.z) + b.depth / 2 <= 9.55, 'Buildings must leave streets clear')
      for (const edge of [-1, 0, 1]) {
        assert.ok(Math.abs(district.ox + b.x - canalX(district.ox + b.x, district.oz + b.z + edge * b.depth / 2, district.seed)) >= b.width / 2 + 1.5, 'Buildings must leave waterways clear')
        assert.ok(Math.abs(district.oz + b.z - railZ(district.ox + b.x + edge * b.width / 2, district.oz + b.z)) >= b.depth / 2 + 1.35, 'Buildings must leave railway clearance')
      }
      for (const other of district.buildings) if (other.id !== b.id) assert.ok(Math.abs(b.x - other.x) >= (b.width + other.width) / 2 + 0.55 || Math.abs(b.z - other.z) >= (b.depth + other.depth) / 2 + 0.55, 'Building footprints must not intersect')
    }
  }
}
assert.notDeepEqual(createDistrict(DEFAULT_WORLD.seed, 0, 0, { ...DEFAULT_WORLD, buildingLayout: 'streets' }).buildings, model.buildings, 'Layout control must change the arrangement')
const tall = createDistrict(DEFAULT_WORLD.seed, 0, 0, { ...DEFAULT_WORLD, buildingHeight: 1.5 })
assert.ok(tall.buildings[0].height > model.buildings[0].height && tall.light.some((light, i) => Math.abs(light - model.light[i]) > 0.04), 'Height must affect geometry and structural shade')
assert.equal(buildingSignature(DEFAULT_WORLD), buildingSignature({ ...DEFAULT_WORLD, humidity: 0.1, weatheringRate: 1.8 }), 'Weathering and ecology must preserve generated building lots')

const preview = (overrides = {}, years = DEFAULT_AGE) => advanceWorld(model, { ...DEFAULT_WORLD, ...overrides }, years)
const initial = preview({}, 0), mature = preview({}, 80)
assert.equal(initial.stats.facades, 0, 'Vines must establish over time')
assert.ok(mature.stats.coverage > initial.stats.coverage + 15, 'Succession must visibly reclaim the ground')
assert.ok(mature.stats.facades > 50, 'Succession must visibly reclaim structures')
assert.deepEqual(mature, preview({}, 80), 'Time scrubbing must reproduce the same ecosystem')
assert.ok(preview({ sunlight: 1 }).stats.coverage > preview({ sunlight: 0.1 }).stats.coverage + 8, 'Light must change ground communities')
assert.ok(preview({ humidity: 1 }).stats.facades > preview({ humidity: 0.05 }).stats.facades + 15, 'Humidity must change climbing growth')
assert.ok(preview({ soilQuality: 1 }).stats.coverage > preview({ soilQuality: 0.05 }).stats.coverage + 15, 'Soil health must affect establishment')
assert.ok(preview({ density: 1.5 }).stats.facades > preview({ density: 0.2 }).stats.facades + 50, 'Seed availability must change visible growth')
assert.ok(preview({ growthRate: 2 }).stats.facades > preview({ growthRate: 0.2 }).stats.facades + 35, 'Growth rate must update the paused preview')
assert.ok(preview({ dispersal: 1.8 }).stats.facades > preview({ dispersal: 0.1 }).stats.facades + 20, 'Dispersal must change colonization')
assert.ok(preview({ community: 'climbers' }).stats.facades > preview({ community: 'meadow' }).stats.facades + 40, 'Communities must have distinct growth rules')
const trees = (community) => model.candidates.trees.reduce((sum, plant) => sum + plantGrowth(plant, 'trees', preview({ community }), { ...DEFAULT_WORLD, community }), 0)
assert.ok(trees('woodland') > trees('meadow'), 'Woodland focus must favor woody plants')
let lastAge = preview({}, 0)
for (const years of [10, 20, 40, 60, 80]) {
  const next = preview({}, years)
  assert.ok(next.stats.integrity <= lastAge.stats.integrity && next.stats.fallen >= lastAge.stats.fallen, 'Structures must deteriorate monotonically with elapsed years')
  lastAge = next
}
assert.ok(mature.stats.fallen > 40 && mature.stats.integrity < 75, 'Decades must visibly remove facade sections')
assert.ok(preview({ humidity: 1 }, 60).stats.integrity < preview({ humidity: 0.05 }, 60).stats.integrity, 'Moisture must accelerate structural deterioration')
assert.ok(preview({ weatheringRate: 1.8 }, 40).stats.fallen > preview({ weatheringRate: 0.4 }, 40).stats.fallen + 15, 'Weathering rate must have a visible effect at a paused year')
const materialState = (buildingMaterial) => {
  const config = { ...DEFAULT_WORLD, buildingMaterial }
  const district = createDistrict(config.seed, 0, 0, config)
  return advanceWorld(district, config, 60)
}
assert.ok(materialState('concrete').stats.integrity > materialState('brick').stats.integrity + 10, 'Reinforced concrete must resist wear longer than brick and plaster')
const interior = cellAt(model.buildings[0].x, model.buildings[0].z)
assert.ok(mature.environment.light[interior] > initial.environment.light[interior] && mature.environment.barrier[interior] < initial.environment.barrier[interior], 'Structural openings must admit light and reduce ecological barriers')
assert.ok(mature.cover[interior] > initial.cover[interior], 'Plants must colonize newly opened building interiors')
const agedParts = createArchitecture(model, true, mature), youngParts = createArchitecture(model, true, initial)
const youngWalls = youngParts.surfaces.filter((part) => part.kind === 'wall'), oldWalls = agedParts.surfaces.filter((part) => part.kind === 'wall')
assert.ok(oldWalls.length && oldWalls.reduce((sum, wall) => sum + wall.profile.reduce((a, h) => a + h, 0) / wall.profile.length, 0) < youngWalls.reduce((sum, wall) => sum + wall.profile.reduce((a, h) => a + h, 0) / wall.profile.length, 0), 'Late decay must lower connected wall profiles instead of deleting boxes')
assert.ok(agedParts.debris.length > 100 && agedParts.piles.some((pile) => pile.height > 0.3), 'Lost masonry must accumulate into three-dimensional rubble piles')
for (const part of [...agedParts.boxes, ...agedParts.tubes]) if (part.building !== undefined) assert.ok(decorationSupported(part, model.buildings[part.building], mature.structures[part.building]), 'Architectural details must remain attached to surviving wall or roof surfaces')
for (const part of agedParts.debris) {
  const pile = agedParts.piles.find((entry) => entry.id === part.pile)
  const surfaceY = rubbleSurfaceY(pile, part.position[0], part.position[2])
  assert.ok(surfaceY !== null && Math.abs(part.position[1] - part.size[1] / 2 - surfaceY) < 1e-6, 'Fragments must rest directly on the actual pile triangles')
  assert.ok(surfaceY > terrainAt(model.ox + part.position[0], model.oz + part.position[2], model.seed) - 0.02, 'A rubble pile must stand on the terrain')
  assert.deepEqual(sampleDebrisFall(part, 1.1, 0.132).position, part.position, 'Falling fragments must settle exactly without floating after animation')
  assert.ok(sampleDebrisFall(part, 0.3).position[1] > part.position[1], 'New fragments must fall from the wall toward their pile')
}
const early = preview({}, 20), earlyParts = createArchitecture(model, true, early)
assert.ok(early.stats.fallen === 0 && earlyParts.tubes.filter((part) => part.kind === 'crack').length > 30, 'Cracks must visibly develop before full facade sections fall')
assert.ok(earlyParts.boxes.filter((part) => part.kind === 'window').length >= youngParts.boxes.filter((part) => part.kind === 'window').length * 0.8, 'Early weathering must preserve window detail')
assert.ok(agedParts.tubes.some((part) => part.kind === 'rebar') && earlyParts.surfaces.some((part) => part.kind === 'spall'), 'Broken edges must expose masonry and reinforcing rods')
const b = model.buildings[0]
let previousStructure = buildingState(b, model, DEFAULT_WORLD, 0)
for (let age = 1; age <= 80; age += 1) {
  const current = buildingState(b, model, DEFAULT_WORLD, age)
  for (let side = 0; side < 4; side += 1) for (let i = 0; i < current.wallProfiles[side].length; i += 1) {
    const h = current.wallProfiles[side][i], prior = previousStructure.wallProfiles[side][i]
    assert.ok(h >= 0 && h <= prior + 1e-5 && prior - h < 0.25, 'Wall loss must progress continuously with no healing or sudden module-sized cuts')
  }
  // Every vertical remnant has a continuous load path to its foundation.
  for (const panel of b.panels) if (current.wallLoss[panel.index] < 1 && panel.row > 0) assert.ok(current.wallLoss[panel.index - 1] < 1, 'No surviving upper wall section may float above a missing lower section')
  for (const floor of current.floorLoss) {
    const checked = new Float32Array(floor); pruneSlabIslands(b, checked)
    assert.deepEqual(checked, floor, 'Every surviving slab component must connect to a grounded corner post')
  }
  previousStructure = current
}
const isolated = new Float32Array(b.roofTiles.length).fill(1)
isolated[Math.floor(Math.ceil(b.depth / 1.5) / 2) * Math.ceil(b.width / 1.5) + Math.floor(Math.ceil(b.width / 1.5) / 2)] = 0
pruneSlabIslands(b, isolated)
assert.ok(isolated.every((loss) => loss === 1), 'An isolated interior roof fragment must fall when all supporting routes fail')
const detached = model.candidates.vines.find((plant) => !structureSupport(plant, mature))
assert.ok(detached && plantGrowth(detached, 'vines', mature, DEFAULT_WORLD) === 0, 'Climbing plants must not float on a missing wall')

const near = requestedDistricts({ x: 9, z: -7 })
assert.equal(near.length, 25); assert.deepEqual(near[0], { x: 9, z: -7, distance: 0 }, 'Prefetch must prioritize the camera district')
const kinds = new Set(), buildingVariants = new Set(), roofForms = new Set(), plantForms = new Set()
for (let x = -2; x <= 2; x += 1) for (let z = -2; z <= 2; z += 1) {
  const tile = createDistrict(DEFAULT_WORLD.seed, x, z); kinds.add(tile.kind)
  const old = advanceWorld(tile, DEFAULT_WORLD, 80), parts = createArchitecture(tile, true, old)
  for (const b of tile.buildings) { buildingVariants.add(b.variant); roofForms.add(b.roofForm) }
  for (const plant of Object.values(tile.candidates).flat()) plantForms.add(plant.species)
  for (const plant of tile.candidates.roof) if (plant.building !== undefined) {
    const b = tile.buildings[plant.building]
    if (b.type !== 'ruin') assert.ok(Math.abs(plant.y - roofSurfaceAt(b, plant.x, plant.z) - 0.025) < 1e-6, 'Roof plants must sit on the actual sloped or curved roof')
  }
  for (const skin of parts.surfaces.filter((p) => p.support === 'roof')) assert.ok(old.structures[skin.building].roofLoss[skin.tile] < 0.55, 'Pitched roof panels must disappear when their slab support fails')
  for (const plant of tile.candidates.vines.filter((p) => p.frameRib !== undefined)) {
    const supported = plant.frameProgress <= old.structures[plant.building].frameLimits[plant.frameRib]
    assert.equal(structureSupport(plant, old), Number(supported), 'Conservatory vines must follow the surviving curved ribs')
  }
  assert.ok(parts.boxes.every((b) => [...b.position, ...b.size].every(Number.isFinite) && b.size.every((value) => value > 0)) && parts.surfaces.every((p) => p.vertices.every(Number.isFinite)), 'Architecture must contain finite valid geometry')
  for (const detailed of [false, true]) {
    const geometry = detailed ? parts : createArchitecture(tile, false, advanceWorld(tile, DEFAULT_WORLD, 80))
    assert.ok(geometry.surfaces.filter((p) => p.kind === 'wall').every((wall) => wall.grounded && wall.profile.every((h) => h >= 0)), 'Both detail levels must preserve foundation-connected facades')
  }
}
assert.ok(kinds.size >= 4, 'The city must contain varied districts')
assert.ok(buildingVariants.size >= 8 && roofForms.size === 3, 'Districts must change architectural silhouettes, not only facade colors')
assert.equal(plantForms.size, 10, 'The city must contain distinct ground, wall, roof, and tree forms')
assert.equal(plantSpecies('pioneers', { moisture: 0.65, light: 0.45, patch: 0.5, waterside: false }), 'fern', 'Damp shade should favor fern colonies')
assert.equal(plantSpecies('trees', { waterside: true }), 'willow', 'Canal edges should favor drooping riparian trees')
assert.ok(plantVigor({ species: 'fern', siteMoisture: 0.5, siteLight: 0.5 }, { ...DEFAULT_WORLD, humidity: 0.9 }) > plantVigor({ species: 'fern', siteMoisture: 0.5, siteLight: 0.5 }, { ...DEFAULT_WORLD, humidity: 0.1 }) + 0.3, 'Ferns should respond visibly to humidity at a paused year')
for (const species of plantForms) {
  const tree = ['broadleaf', 'birch', 'willow'].includes(species), make = tree ? createTreeGeometry : createPlantGeometry
  const near = make(species, true), far = make(species, false), geometries = tree ? [near.leaves, near.wood, far.leaves, far.wood] : [near, far]
  for (const g of geometries) {
    assert.ok([...g.attributes.position.array, ...g.attributes.normal.array].every(Number.isFinite), 'Curved botanical meshes must have finite positions and smooth normals')
    assert.ok(g.index.count / 3 < 6500, 'Each shared botanical mesh must stay within its triangle budget')
    g.dispose()
  }
  assert.ok((tree ? near.leaves : near).index.count > (tree ? far.leaves : far).index.count, 'Distant plants must use simpler meshes')
  assert.equal(foliageAsset(species, true), foliageAsset(species, true), 'Streamed districts must share the same species mesh')
}

const workerURL = new URL('../src/features/after-us/district.worker.js', import.meta.url).href
const bootstrap = `import { parentPort } from 'node:worker_threads'; globalThis.self={postMessage:(message)=>parentPort.postMessage(message)}; await import(${JSON.stringify(workerURL)}); parentPort.on('message',(data)=>self.onmessage({data}));`
const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`))
function view(epoch, center, known = [], years = DEFAULT_AGE, config = DEFAULT_WORLD) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { worker.off('message', listener); reject(new Error('District worker timed out')) }, 8000)
    const listener = (message) => {
      if (message.epoch !== epoch) return
      clearTimeout(timeout); worker.off('message', listener); resolve(message)
    }
    worker.on('message', listener)
    worker.postMessage({ type: 'view', epoch, seed: config.seed, center, config, year: years, known })
  })
}
try {
  const cold = await view(1, { x: 0, z: 0 })
  assert.equal(cold.key, '0:0'); assert.ok(cold.model && cold.snapshot, 'Initial view must include geometry and ecology')
  const moved = await view(2, { x: 1, z: 0 }, ['0:0'])
  assert.equal(moved.key, '1:0', 'A changed view must interrupt the old prefetch queue and prioritize its center')
  const warm = await view(3, { x: 1, z: 0 }, ['1:0'], 80)
  assert.equal(warm.model, undefined, 'Condition changes must reuse known geometry')
  assert.ok(warm.snapshot.stats.facades >= moved.snapshot.stats.facades, 'Worker previews must evolve the same district')
  const rebuilt = await view(4, { x: 1, z: 0 }, [], 80, { ...DEFAULT_WORLD, buildingLayout: 'streets', buildingDensity: 2 })
  assert.ok(rebuilt.model && rebuilt.model.generation !== moved.model.generation, 'Building controls must regenerate cached geometry')
  const reused = await view(5, { x: 1, z: 0 }, ['1:0'], 40, { ...DEFAULT_WORLD, buildingLayout: 'streets', buildingDensity: 2, weatheringRate: 1.8 })
  assert.equal(reused.model, undefined, 'Structural aging must reuse building lots')
  let last = warm
  for (let x = 2; x < 58; x += 1) last = await view(x + 6, { x, z: 0 })
  assert.ok(last.cachedDistricts <= 48 && last.cachedSnapshots <= 80, 'Exploring must keep worker caches bounded')
  console.log(`After Us verified: curved overview cutout, cached growth interpolation, autoplay loop, continuous daily lighting, midnight wrap, automatic clock, continuous districts, caretaker rules, time previews, seeded building controls, constrained layouts, material-dependent structural aging, continuous fractured walls, attached architectural details, supported slabs, layered rubble, settling animation, support-aware vines, opening habitats, habitat-specific botanical forms, finite smooth leaf meshes, varied roof silhouettes, curved frame attachments, prioritized streaming, shared species geometry, and bounded caches. Cold district computation: ${cold.computeMs.toFixed(1)} ms; warm preview: ${warm.computeMs.toFixed(1)} ms.`)
} finally { await worker.terminate() }
