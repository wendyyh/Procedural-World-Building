# After Us · nature reclaims the world

The player is an ecological caretaker. People have left; the built world remains. Care changes the conditions that let life occupy walls, roofs, rail beds, streets, and waterways.

## Experience

**Explore → read the habitat → tend the conditions → advance time → observe.**

The reward is discovering how a place changes, rather than constructing a perfect settlement. A roof terrace, an empty carriage, an air conditioner, or a broken greenhouse carries traces of everyday human life. Plants gradually connect these isolated remnants into habitats. The mood is peaceful and slightly melancholic; growth remains legible against the structures it occupies.

The world extends beyond the current camera. Districts vary between residential courtyards, industrial structures, glassworks, and open ruins. A closer initial view establishes one place; neighboring districts continue the same roads, rails, and waterways. Moving the camera changes what receives detail rather than regenerating the entire scene.

## Visual system

| Layer | Direction |
| --- | --- |
| World | A continuous, extendable urban landscape composed of connected districts. Begin close to one richly detailed district; drag into neighboring streets. Roads, canals, terrain, and elevated rails use shared world coordinates. |
| Structures | Weathered peach concrete, faded blue metal, rusty frames, broken glazing, rooftop tanks, air conditioners, pipes, staircases, abandoned furniture, and railway remnants. Terraces, pitched townhouses, sawtooth workshops, arched courtyard entries, barrel glasshouses, elliptical conservatories, and open roof trusses give districts distinct silhouettes. Seeded proportions, floor counts, and a restrained plaster palette vary the architecture within those families. |
| Plants | Curved oval leaves, low clover mats, arching fern fronds, slender reeds, spreading shrubs, cascading ivy, sedum rosettes, branching broadleaf and birch trees, and drooping waterside willows. Leaves have smooth normals and matte surfaces; canopies are layered foliage with visible branch gaps. Climbers follow structural supports; roots and runoff determine where plants establish. Keep the architecture visible through the growth. |
| Color | Peach mist `#ead7cb`, concrete `#c4b4a1`, faded plaster `#c99f89`, blue metal `#718889`, rust `#8c5d48`, shaded olive `#566b3c`, new leaf `#a5b86b`, canal `#83aaa6`. Pink and cream flowers are sparse accents. |
| Lighting | A continuous 24-hour cycle: soft daylight, warm low-angle golden hour, peach/lavender dusk, and readable blue moonlight. Sun and moon directions follow an orbit; ambient fill, background, fog, and canal colors blend smoothly. Keep the elevated orthographic camera and matte materials. |

The supplied Cloud Gardens images guide the balance of dense ecological detail and quiet architectural composition. They are visual references, not instructions to reproduce their specific scenes or interfaces.

## Care and feedback

Sunlight, humidity, soil health, water level, seed availability, growth rate, and dispersal change the ecosystem. Pioneers, climbers, and woodland communities have different habitat preferences. Time can be paused, accelerated, or scrubbed; parameter changes preview the selected time consistently.

| Community | Establishment and visual change |
| --- | --- |
| Pioneers | Grass, weeds, and flowers establish in sunny cracks and neglected ground, then spread between neighboring patches. |
| Climbers | Humid wall seams supply roots; pipes, trellises, greenhouse ribs, and viaducts give vines a route upward or down from planted surfaces. |
| Woodland | Shrubs and young trees need more rooting space and connected soil. They favor open lots rather than sealed building interiors. |

Plant species follow a continuous spatial field combined with local moisture, shade, and canal distance. This creates patches rather than a different random weed at every point: ferns favor damp shade, reeds and willows gather by water, and exposed roofs favor sedum and grasses. Minimum root spacing limits overlapping shrubs and trees. Seeded vine vigor creates uneven climbing extents; a few roof-rooted cascades hang from supported slabs. Humidity and sunlight adjust species vigor while the existing annual ecology controls establishment and succession. Ten shared botanical assets have near and distant versions, a fixed cache, and instanced transforms; the overview uses the same plants. Sparse flowers have stems and muted cream, mauve, and pink accents.

At the beginning, the architecture carries the composition. With time, low growth gathers at roots and seams, vines climb to higher supports, roofs acquire gardens, and rail decks gain edge growth. Changing conditions can limit establishment or reduce ground cover where habitat capacity falls.

Light, moisture, soil, and infrastructure overlays explain ecological constraints. Buildings cast shade and shelter roots, roofs dry faster, roads hinder dispersal, and canals provide a moisture corridor. Progress includes ground cover, reclaimed facades, and connected habitats.

### Buildings and structural succession

**Buildings & Decay** edits the abandoned city at the currently selected year. Density targets one to six buildings per district, subject to available space. Open courtyards, street rows, and irregular clusters have distinct lot rules. Height changes modular floor counts and greenhouse/utility height. Material selects mixed brick/concrete, brick and plaster, or reinforced concrete; greenhouse frames remain steel. A separate weathering multiplier changes the pace of structural aging. Reset Building Controls restores these five settings while preserving the seed, ecological settings, years, and daily clock.

The architecture uses a footprint → district archetype → floors → facade bays → roof form grammar. The original courtyard retains its terrace, with a pitched cottage and an elliptical conservatory nearby. Seeded neighboring districts vary footprint proportions and floor counts, then select townhouse, arcade, industrial, or open-ruin forms. Pitched and sawtooth roof skins inherit the support state of their underlying slab; roof foliage samples the actual roof height. Conservatory climbers follow curved meridians and disappear above broken frame ribs. Stable seeded fracture zones vary along each facade. Cumulative age, long-term moisture, water exposure, sunlight, and established roots increase damage; material resistance delays it. Brick and plaster wear faster than reinforced concrete.

Facades render as continuous thick surfaces connected to the foundation. Long branching cracks and irregular plaster spalls develop before structural loss. Local weak zones then recede from the top down, leaving jagged edges, exposed brick courses, and bent reinforcing rods. The ecological facade grid is a lookup field rather than visible wall blocks. Window frames and machinery remain where the facade supports their full bounds; vertical drainpipes are trimmed to the surviving wall height. Windows sit on the exterior face so masonry does not obscure their detail.

Floor and roof slabs have chipped outlines. Each surviving slab component must connect to a grounded corner post; isolated islands collapse. Visible beams link surviving slab spans to the columns. Intermediate floors and their supports remain visible at both detail levels to communicate load paths. Rooftop objects use their full support footprint, and wall foliage checks the continuous fracture boundary.

Lost facade area determines rubble volume. Angular brick, concrete, and plaster fragments accumulate on irregular three-dimensional mounds at the base of affected walls. Fragment bottoms sample the mound's actual triangles, giving a consistent resting contact instead of floating or lying in a flat scatter. When elapsed time advances, newly created near-field fragments make a short gravity-shaped fall and settle in under a second. Reverse scrubbing restores the seeded state directly, and reduced-motion preferences omit the falling animation. The model previews partial decay with geometric support rules.

The annual ecological simulation uses the structural state of each year. Openings admit light, reduce the building's dispersal barrier, and expose rooting substrate, allowing ground plants to enter formerly sealed interiors. Wall and rooftop foliage is hidden where its supporting surface has disappeared. The selected-year **Building Status** reports building count, estimated structure condition, and fully fallen facade sections. Checkpoints at Years 0, 20, 40, 60, and 80 pause playback and compare model states. The daily lighting cycle remains independent.

| Course concept | Application in the building system |
| --- | --- |
| Seeded scattering and constraints | Stable priority lots plus rejection sampling; footprints cannot overlap streets, rail clearance, canals, or each other. |
| Grammars and modular generation | A footprint expands into floors, facade bays, frame members, windows, and roof tiles, with material and height parameters. This is a shape grammar, not the tree study's turtle interpreter. |
| Spatial variation | Seeded seam vulnerability and procedural surface flecks avoid uniform, simultaneous erosion. |
| Local rules and time stepping | Each simulated year changes structural exposure and habitat capacity before neighboring vegetation spreads. |
| Detail by distance and instancing | Near and distant facades share connected fracture silhouettes and supported floor plates; near views add cracks, mortar, spalls, and reinforcing rods. Surfaces batch into a single mesh per district; rubble and repeated details are instanced. |

These concepts are adapted to the main world; the nine studies remain separate experiments. Weathering and condition percentages are art-directed design heuristics, not calibrated predictions of material service life or structural safety.

### Time and daily lighting

Time & Evolution contains two independent controls:

- **Elapsed Years** selects the ecosystem's simulated state since departure. Advancing years previews evolution from the same world seed and selected conditions.
- **Time of Day** is a 00:00–24:00 visual timeline with minute increments. It controls sun/moon direction and intensity, ambient color temperature, shadows, sky/fog, and canal color. It does not enter ecological configuration, change vegetation, or request new worker snapshots. The Light overlay continues to represent long-term sun exposure.

**Auto Cycle** advances one day in three minutes and loops continuously through midnight. It is independent of simulation play/pause; manual scrubbing pauses Auto Cycle at the chosen time. Lighting reads a shared clock each frame, while the control readout refreshes at 10 Hz. Geometry and district instances remain unchanged. Only active sun/moon lights update their shadow maps.

UI copy names environmental variables and operations directly. **Live Ecosystem Status** and the district metrics describe the selected simulated state; future years are described as model previews. Pending calculations show an updating state instead of relabeling stale values. **Reset Environmental Conditions** restores sunlight, humidity, soil, and water defaults while preserving the current world, vegetation settings, years, and daily clock.

## Exploration and latency

### Overview preview

The overview shows one non-interactive, orthographic cutout from the glassworks district two tiles north of the origin. Six staggered parcels form a mixed neighborhood: a broad five-storey terrace, a three-storey gabled residence, a two-storey arcade, a low cottage and workshop, and a domed conservatory. The landmark footprint is 4.4 by 4.5 units, giving it substantial width and depth. Uneven setbacks and varied parcel proportions define clear alleys and open spaces along the railway and canal. These priority parcels pass through the existing placement constraints, facade and roof grammar, weathering, and habitat generation; buildings are never stretched after their plants are generated. The main world retains its existing procedural layouts. Terrain, canal, and exposed upper soil rim sample the selected district’s world coordinates. A continuous curved rim rests on a deeply excavated land section, extending roughly 6.4 world units below the surface. Uneven strata, embedded stones and old brick fragments, and sparse exposed roots make the sides read as cut earth. The lower section tapers slightly and dissolves into height-based atmospheric transparency above a soft shadow. The camera frames the complete lifted land mass while retaining the model’s prominence in the hero. The section is generated once as a small static mesh; it adds no per-frame simulation. The enlarged model blends directly into the page through a transparent canvas and subtle ground shadow, without a card frame or header/footer labels. Buildings, railway remnants, greenhouse frames, and botanical geometry use the same generators and rendering components as the full world. The cutout uses the main world’s default Year 32 structural state, including plaster wear, cracks, and settled rubble. This architecture is prepared once; its matching wall, roof, and curved-frame support state stays attached to the animated foliage, keeping plants anchored to the visible ruin throughout the growth loop.

A 32-second autoplay loop begins with bare abandoned structures, grows vegetation over 18.4 seconds, holds mature growth for eight seconds, and uses a two-second fade on either side of the hidden reset. Five cached snapshots interpolate from Year 0 to Year 80. The showcase uses favorable humidity, soil, and seed availability to make the change legible, with greener ground, denser climbers, roof growth, and larger woodland canopies. The camera stays fixed. Instance transforms and terrain colors update in place at up to 30 frames per second; geometry and ecological snapshots are prepared once. No neighboring districts are generated for the overview. Rendering pauses outside the viewport and in hidden tabs. Reduced-motion preferences show a still Year 60 scene.

### Main world streaming

- Start with one detailed district and lightweight surrounding geometry.
- A module worker generates districts and computes succession away from the UI thread.
- Prefetch a two-district ring, prioritize the current district, and interrupt outdated preview queues.
- Cache a bounded set of district geometry and recent succession snapshots.
- Render the nearest districts in detail and distant districts with simpler architecture and vegetation; instance repeated geometry and leaves.
- Keep world coordinates deterministic so revisiting and crossing district boundaries preserves terrain and infrastructure.

The current implementation keeps at most 36 district records on the UI side, 48 generated districts in the worker, and 80 recent ecology/structure snapshots. Building generation has its own signature: layout/density/height/material changes regenerate lots; years, weathering, and environmental changes reuse them. The previous district remains visible while its replacement is prepared. Matching cached snapshots retain their object identity. Architecture caches at most four age/detail variants per retained model, and matrices update only when geometry changes. Window frames, supports, pipes, leaves, and stems use instanced geometry.

## Current scope

The ecological model is an explainable design heuristic, not a scientific ecosystem model. Succession is previewed from the same seed and selected elapsed time; districts regenerate consistently after eviction. The global conditions and current exploration session are local to the page. Future generative UI can change the same configuration and analysis modes; natural-language or AI controls are not part of this implementation.
