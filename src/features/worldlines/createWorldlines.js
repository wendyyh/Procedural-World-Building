import { randomFromSeed } from '../environment/terrainSampler.js'

export const WORLDLINE_STAGES = [
  {
    era: 'Origins', title: 'The first watershed',
    prompt: 'A spring feeds the lowlands. The first settlement must decide how to use it.',
    choices: [
      { title: 'Protect the source', description: 'Keep the spring and its marsh intact.', delta: { balance: 14, settlement: -3, knowledge: 4 } },
      { title: 'Redirect the water', description: 'Build channels to support a larger settlement.', delta: { balance: -11, settlement: 12, knowledge: 5 } },
    ],
  },
  {
    era: 'Growth', title: 'The old grove',
    prompt: 'A forest borders the inhabited valley as the population grows.',
    choices: [
      { title: 'Regenerate the grove', description: 'Make new growth part of the settlement plan.', delta: { balance: 12, settlement: 1, knowledge: 4 } },
      { title: 'Harvest its timber', description: 'Use the forest to expand homes and infrastructure.', delta: { balance: -13, settlement: 12, knowledge: 2 } },
    ],
  },
  {
    era: 'Routes', title: 'Across the water',
    prompt: 'Separated communities need a way to exchange people and goods.',
    choices: [
      { title: 'Navigate the channels', description: 'Connect settlements along existing waterways.', delta: { balance: 7, settlement: 5, knowledge: 2 } },
      { title: 'Build a crossing', description: 'Cut a more direct route through the landscape.', delta: { balance: -6, settlement: 9, knowledge: 8 } },
    ],
  },
  {
    era: 'Discovery', title: 'A shifting coast',
    prompt: 'The shoreline moves. What the people learn now will shape the next era.',
    choices: [
      { title: 'Map the tide cycles', description: 'Observe the coast and adapt where people build.', delta: { balance: 6, settlement: 3, knowledge: 14 } },
      { title: 'Engineer the shore', description: 'Hold the water back with a powered barrier.', delta: { balance: -10, settlement: 12, knowledge: 9 } },
    ],
  },
  {
    era: 'Threshold', title: 'A shared future',
    prompt: 'The settlements now have enough history to choose a lasting direction.',
    choices: [
      { title: 'Write a common charter', description: 'Coordinate stewardship and shared resources.', delta: { balance: 9, settlement: 7, knowledge: 5 } },
      { title: 'Expand without a charter', description: 'Let each settlement pursue its own opportunity.', delta: { balance: -14, settlement: 15, knowledge: 3 } },
    ],
  },
]

const clamp = (value) => Math.max(0, Math.min(100, value))

function initialState(seed) {
  const random = randomFromSeed(`${seed}:origin`)
  return {
    balance: 48 + Math.floor(random() * 9),
    settlement: 43 + Math.floor(random() * 9),
    knowledge: 35 + Math.floor(random() * 9),
  }
}

function applyChoice(state, choice, seed, path) {
  const random = randomFromSeed(`${seed}:${path}:consequence`)
  return Object.fromEntries(Object.keys(state).map((key) => [
    key,
    clamp(state[key] + choice.delta[key] + Math.floor(random() * 5) - 2),
  ]))
}

export function describeOutcome(state) {
  if (state.balance >= 65 && state.settlement >= 55) return { title: 'A living commons', text: 'The settlements grow while the watershed remains resilient.' }
  if (state.balance >= 65) return { title: 'A sheltered landscape', text: 'The land recovers, though settlements remain small and dispersed.' }
  if (state.settlement >= 75 && state.knowledge >= 65) return { title: 'An engineered coast', text: 'Dense settlements endure by studying and rebuilding their changing shore.' }
  if (state.settlement >= 75) return { title: 'An expanding frontier', text: 'The settlements spread quickly while pressure on the landscape accumulates.' }
  if (state.balance < 35) return { title: 'A fragile estuary', text: 'Growth outpaces renewal, leaving the water and land under strain.' }
  return { title: 'A negotiated horizon', text: 'The world holds several competing ways of living with its landscape.' }
}

export function createWorldlineGraph(seed) {
  const nodes = {}
  const root = { path: '', parent: null, depth: 0, state: initialState(seed), entry: null }
  nodes[''] = root
  const queue = [root]
  while (queue.length) {
    const node = queue.shift()
    if (node.depth === WORLDLINE_STAGES.length) {
      node.outcome = describeOutcome(node.state)
      continue
    }
    const stage = WORLDLINE_STAGES[node.depth]
    stage.choices.forEach((choice, index) => {
      const path = `${node.path}${index}`
      const child = {
        path,
        parent: node.path,
        depth: node.depth + 1,
        state: applyChoice(node.state, choice, seed, path),
        entry: { era: stage.era, event: stage.title, choice: choice.title, description: choice.description, branch: index },
      }
      nodes[path] = child
      queue.push(child)
    })
  }
  return nodes
}

export function getWorldlineHistory(nodes, path) {
  if (!(path in nodes)) throw new Error('Unknown worldline path')
  const history = []
  for (let length = 1; length <= path.length; length += 1) history.push(nodes[path.slice(0, length)])
  return history
}
