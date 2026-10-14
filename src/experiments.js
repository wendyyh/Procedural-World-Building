export const EXPERIMENTS = [
  {
    slug: 'noise', number: '01', title: 'Noise Lab', type: 'Generative signal study',
    description: 'Seeded noise sources, shaping operations, a live 2D map, and a displaced 3D grid.',
    tags: ['Noise', '2D + 3D', 'Shaping'], system: 'Noise generation', role: 'SIGNAL',
  },
  {
    slug: 'terrain', number: '02', title: 'Terrain Field', type: 'Height-field generation',
    description: 'Seeded topography, shaping, erosion, analytical shaders, and a continuously tiled view.',
    tags: ['2D + 3D', 'Erosion', 'Streaming'], system: 'Terrain generation', role: 'FIELD',
  },
  {
    slug: 'scatter', number: '03', title: 'Scattering Studio', type: 'Terrain population',
    description: 'Seeded asset layers placed by elevation, slope, and coherent distribution masks.',
    tags: ['Placement', 'Biomes', 'Instancing'], system: 'Asset distribution', role: 'ECOLOGY',
  },
  {
    slug: 'paths', number: '04', title: 'Pathways', type: 'Terrain networks',
    description: 'Editable spline routes projected onto the terrain as roads or carved river channels.',
    tags: ['Splines', 'Roads', 'Rivers'], system: 'Path networks', role: 'ROUTES',
  },
  {
    slug: 'flow', number: '05', title: 'Flow Field', type: 'Particle motion',
    description: 'Moving particles reveal river currents and atmospheric vector fields.',
    tags: ['Vectors', 'Particles', 'Motion'], system: 'Flow dynamics', role: 'MOTION',
  },
  {
    slug: 'voxel', number: '06', title: 'Voxel World', type: 'Volume-field sculpting',
    description: 'Three-dimensional density shapes, ordered solid operations, cross-sections, and chunked meshing.',
    tags: ['SDF', 'CSG', 'Meshing'], system: 'Voxel sculpting', role: 'VOLUME',
  },
  {
    slug: 'shaders', number: '07', title: 'Shader Lab', type: 'Visual-system exploration',
    description: 'Six terrain treatments and a vertex-ripple study explore data, surface, and motion.',
    tags: ['GLSL', 'Materials', 'Motion'], system: 'Shader strategies', role: 'SURFACE',
  },
  {
    slug: 'branching', number: '08', title: 'Branching Forms', type: 'Procedural growth',
    description: 'A seeded grammar grows canopy trees or climbing ivy with visible levels of detail.',
    tags: ['L-systems', 'Geometry', 'LOD'], system: 'Branching geometry', role: 'GROWTH',
  },
  {
    slug: 'worldlines', number: '09', title: 'Worldlines', type: 'Possible histories',
    description: 'Rule-driven choices fork one starting world into reproducible alternate histories.',
    tags: ['Narrative', 'Rules', 'Choices'], system: 'World histories', role: 'STORY',
  },
]

export const experimentHref = (slug) => `#experiments/${slug}`
