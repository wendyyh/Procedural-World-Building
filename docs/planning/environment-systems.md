# Environment systems implementation

The terrain-related studies now follow a visible progression: Noise Lab creates a signal, Terrain Field turns it into topography, Scattering Studio populates that topography, Pathways adds routes and channels, and Flow Field adds motion. Voxel World and Shader Lab remain separate investigations. The customizable world is still a future composition of these systems.

## Shared data contract

[`terrainSampler.js`](../../src/features/environment/terrainSampler.js) is the common query surface for the three new studies. A bounded, seeded field is sampled by world-space coordinates to return normalized value, height, slope, and normal. Scattering uses those values for acceptance and orientation. Pathways uses the same grid to project and deform a spline corridor. Flow Field uses the current Pathways spline and terrain seed for its river mode.

The existing Terrain Field generator and its streaming behavior remain untouched. Environment studies use a bounded reference field so each rule can be inspected clearly. Their configurations currently live in client state; they are not included in the Firebase configuration library.

## Rendering choices

- Scattering uses instanced meshes for repeated procedural assets and independent seed streams per layer.
- Pathways samples a Catmull–Rom spline, then blends affected height values toward the centerline inside a smooth corridor.
- Flow Field updates particle and trail buffers in the animation loop. River motion follows the spline tangent and pulls particles toward its center; atmospheric motion combines a prevailing direction with a seeded curl field.

## Scope boundary

The deck's fluid-solver imagery informed the motion study but is not represented as a fluid-physics claim. The river channel is a path-conditioned terrain deformation, not hydraulic erosion. Pathway edits carry into Flow Field during the current session; cross-session persistence and composition into the future world remain open work.
