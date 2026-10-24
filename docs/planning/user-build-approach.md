# After Us — first playable player-building study

The player authors structures and seeds. Procedural rules provide architectural detail and plant growth in response to those choices. Start on an empty parcel with existing roads, water, and railway remnants, then build, plant, advance time, and explore another parcel.

## Implemented scope

The building kit contains a room, workshop, glasshouse, and garden ruin. Placement previews snap to a half-meter grid. The player can rotate the footprint, move or remove a structure, change brick/concrete, and edit a room's storey count and roof. This is an assembly-based first study; individual wall and floor editing is a later step.

Four seeds provide distinct results: meadow creates clover, grass, and flowers; ferns form a patch; birch produces one tree; ivy attaches to a selected structure. Each plant source has a stable ID, seed stream, and planting date. New parcels remain bare until the player plants. Removing a source removes its growth; removing a building also removes attached ivy. Undo restores both together.

Growth is intentionally immediate enough to understand over a few five-year steps. Existing habitat fields affect plant vigor. Structures age from their own placement date. Terrain and infrastructure use the shared world seed; each parcel retains its coordinate-derived identity.

## State and persistence

`builderModel.js` owns catalog entries, placement checks, save validation, parcel edits, and undo/redo. The document contains a version, world seed, elapsed year, and per-coordinate arrays of building and seed records. Stable IDs keep other placements from changing a building's procedural identity.

`worldModel.js` converts those records into the existing architecture and ecology render models. The generated simulation remains available to the overview and experiment verification. `plantedEcology.js` replaces automatic vegetation in the playable world with candidates sourced from the player's seeds. Existing workers and bounded geometry caches still stream neighboring districts.

The browser stores the document under `after-us-player-world-v1`. The UI reports save failures. Save location is specific to the browser and origin; there is no cloud account or cross-device sync. Undo history is session-only, with forty edits retained. Time advances forward independently of the edit history.

## Validation

`npm run verify:builder` checks empty parcels, explicit placements, clearance, seed-driven growth, late planting, stable identity, adjacent terrain continuity, save roundtrips, and linked deletion with undo/redo. `npm run verify:after-us` protects the existing architecture, preview, ecology, day/night, and streaming behavior. Build with `npm run build`.

Browser review covers placing a room, adding a storey, switching roof type, planting ivy and meadow, advancing time, removing and restoring a host, and retaining the garden across navigation and reload.

## Next iteration

Playtest whether users can place and plant without help. Expand from assemblies to more granular structural pieces once the core interaction feels good. Add clearer parcel identities, more planting surfaces, optional goals, and an export/share flow after the authoring loop is established.
