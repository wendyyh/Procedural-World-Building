# Branching systems implementation

Two portfolio studies extend the procedural toolkit after Shader Lab. Branching Forms investigates spatial branching through a bounded L-system, while Worldlines investigates branching outcomes through an explicit decision graph. Both live under Experiments; the customizable world remains a future composition.

## Branching Forms

The grammar expands `F` into a preset rule. A turtle interprets forward motion, rotations, and bracketed push/pop state. Its seeded random stream adds controlled organic variation. Tree and ivy share the engine but differ in rules, branch thickness, material treatment, and staging.

The complete model is generated once per structural configuration. Near, middle, and far views select smaller visible subsets of branches and leaf clusters. Automatic detail uses camera distance. This reduces rendered instances, though the source model is still computed in full; the UI reports visible counts rather than a benchmarked FPS claim.

## Worldlines

Five authored decisions generate a binary graph of 63 nodes and 32 terminal states. Each child inherits its parent's state, applies a stage-specific choice delta plus seeded bounded variation, then receives an outcome description from its final values. Every node has a stable binary path code, enabling replay and navigation without saving a large generated graph.

The narrative rules are intentionally small and visible. The premise is editable display text, not a prompt sent to an AI service. No accounts or persistence are required. A later world experience may use this system to attach history to places, but that connection is not implied to exist today.

## Portfolio integration

The registry in [`experiments.js`](../../src/experiments.js) is the source for experiment cards and navigation. The future-world number now derives from its length, preventing a stale destination number as studies are added. The current studies remain independent routes and preserve the portfolio's existing visual language.
