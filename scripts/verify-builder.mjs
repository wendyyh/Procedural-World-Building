import assert from 'node:assert/strict'
import { advanceWorld, createDistrict, DEFAULT_WORLD, plantGrowth } from '../src/features/after-us/worldModel.js'
import { buildingDraft, changeParcel, historyReducer, newPlayerWorld, parsePlayerWorld, removePlacement, validateBuilding, validateSeed } from '../src/features/after-us/builderModel.js'

const key = '0:0'
const configFor = (world) => ({ ...DEFAULT_WORLD, seed: world.seed, playerBuilt: true, districtEdits: world.districts })
const districtFor = (world, x = 0, z = 0) => createDistrict(world.seed, x, z, configFor(world))
let world = newPlayerWorld()
const blank = districtFor(world)
assert.equal(blank.buildings.length, 0, 'New parcels must wait for player construction')
assert.ok(Object.values(blank.candidates).every((plants) => plants.length === 0), 'No plants should appear before sowing')
assert.ok(advanceWorld(blank, configFor(world), 80).cover.every((v) => v === 0), 'Time alone cannot populate an unplanted parcel')

const room = { ...buildingDraft('room', -4, -4), id: 'room-1', createdAt: 0 }
assert.equal(validateBuilding(blank, room), null)
assert.match(validateBuilding(blank, buildingDraft('room', 11, 0)), /streets/)
assert.match(validateBuilding(blank, buildingDraft('room', 7, 0)), /canal/)
assert.match(validateBuilding(blank, buildingDraft('room', -4, 4)), /railway/)
world = changeParcel(world, key, (p) => ({ ...p, buildings: [room] }))
let model = districtFor(world)
assert.equal(model.buildings.length, 1)
assert.equal(model.buildings[0].authoredId, room.id)
assert.equal(model.buildings[0].x, room.x)
assert.equal(model.buildings[0].depth, room.depth)
assert.match(validateBuilding(model, room), /between buildings/)
assert.equal(validateBuilding(model, room, room.id), null, 'Moving an object must exclude itself from collision checks')
assert.match(validateSeed(model, 'ivy', 0, 0), /building/)
assert.equal(validateSeed(model, 'ivy', 0, 0, model.buildings[0]), null)
assert.match(validateSeed(model, 'birch', -4, -4), /roots/)

const meadow = { id: 'meadow-1', kind: 'meadow', x: -5, z: 0, plantedAt: 0 }
const ivy = { id: 'ivy-1', kind: 'ivy', x: -4, z: -2.2, plantedAt: 0, buildingId: room.id }
assert.equal(validateSeed(model, 'meadow', meadow.x, meadow.z), null)
world = changeParcel(world, key, (p) => ({ ...p, plants: [meadow, ivy] }))
model = districtFor(world)
const fresh = advanceWorld(model, configFor(world), 0), mature = advanceWorld(model, configFor(world), 20)
assert.ok(mature.stats.coverage > fresh.stats.coverage, 'The planted patch must spread visibly over time')
assert.ok(mature.stats.facades > fresh.stats.facades, 'The player’s ivy must climb the chosen building')
assert.ok(mature.cover[24] === 0, 'Unseeded ground outside the patch must remain bare')
assert.ok(model.candidates.vines.length > 0 && model.stems.length > 0)
assert.match(validateBuilding(model, buildingDraft('room', -5, 0)), /planted seed/)
assert.match(validateSeed(model, 'ivy', 0, 0, model.buildings[0]), /already/)

const initialSeed = model.buildings[0].seed
const initialPatch = model.candidates.pioneers.filter((p) => p.sourceId === meadow.id)
world = { ...world, year: 20 }
world = changeParcel(world, key, (p) => ({ ...p, buildings: p.buildings.map((b) => ({ ...b, floors: 3, roofForm: 'gable', material: 'concrete' })), plants: [...p.plants, { id: 'fern-2', kind: 'fern', x: 0, z: -6, plantedAt: 20 }] }))
model = districtFor(world)
assert.equal(model.buildings[0].seed, initialSeed, 'Editing a building keeps its procedural identity')
assert.equal(model.buildings[0].floors, 3)
assert.equal(model.buildings[0].roofForm, 'gable')
assert.equal(model.buildings[0].material, 'concrete')
assert.deepEqual(model.candidates.pioneers.filter((p) => p.sourceId === meadow.id).map(({ siteLight, siteMoisture, ...p }) => p), initialPatch.map(({ siteLight, siteMoisture, ...p }) => p), 'Adding another seed keeps the first patch in place')
const lateFern = model.candidates.shrubs.find((p) => p.sourceId === 'fern-2' && p.distance === 0)
assert.ok(lateFern)
assert.equal(plantGrowth(lateFern, 'shrubs', advanceWorld(model, configFor(world), 19), configFor(world)), 0)
assert.ok(plantGrowth(lateFern, 'shrubs', advanceWorld(model, configFor(world), 40), configFor(world)) > plantGrowth(lateFern, 'shrubs', advanceWorld(model, configFor(world), 20), configFor(world)) + 0.3, 'A late planting grows from its own age')
assert.deepEqual(districtFor(world), districtFor(world), 'Revisiting restores exactly the same authored parcel')
const east = districtFor(world, 1, 0)
assert.equal(east.buildings.length, 0, 'An edit must not leak into neighboring parcels')
assert.notEqual(east.tileSeed, model.tileSeed)
for (let row = 0; row < 25; row++) assert.equal(model.heights[row * 25 + 24], east.heights[row * 25], 'Terrain must remain continuous across parcel edges')

const saved = parsePlayerWorld(JSON.stringify(world))
assert.deepEqual(saved, world, 'A save/reload preserves all choices and timestamps')
assert.equal(parsePlayerWorld('{bad'), null)
assert.equal(parsePlayerWorld(JSON.stringify({ ...world, year: -10 })), null)
assert.equal(parsePlayerWorld(JSON.stringify({ ...world, districts: { [key]: { buildings: [], plants: [ivy] } } })), null, 'Orphan ivy cannot enter the generator')
let history = { present: world, past: [], future: [] }
history = historyReducer(history, { type: 'edit', update: (w) => removePlacement(w, key, room.id) })
assert.equal(history.present.districts[key].buildings.length, 0)
assert.ok(!history.present.districts[key].plants.some((p) => p.kind === 'ivy'), 'Removing a host removes its attached ivy')
assert.ok(history.present.districts[key].plants.some((p) => p.id === meadow.id), 'Removing a building preserves nearby planting')
history = historyReducer(history, { type: 'undo' })
assert.deepEqual(history.present, world, 'Undo restores structures and attached seeds together')
history = historyReducer(history, { type: 'redo' })
assert.equal(history.present.districts[key].buildings.length, 0)

const lateRoom = { ...room, createdAt: 40 }
const lateWorld = changeParcel({ ...newPlayerWorld(), year: 40 }, key, (p) => ({ ...p, buildings: [lateRoom] }))
assert.equal(advanceWorld(districtFor(lateWorld), configFor(lateWorld), 40).structures[0].damage, 0, 'New buildings must not inherit the world’s elapsed age')
console.log('Player building, seeded growth, placement constraints, stable identity, parcel continuity, persistence, and undo/redo verified.')
