# Cloud configuration library

The two interactive experiments can save and load their own generator configurations. This is a personal library for the studies, not a claim that the unified world has been built.

## What is saved

Each document lives at `users/{uid}/presets/{presetId}` and contains:

| Field | Purpose |
| --- | --- |
| `kind` | `terrain` or `voxel`; keeps each experiment's library separate |
| `name` | Visitor-provided label (up to 60 characters) |
| `schemaVersion` | Format version used before a save can be loaded |
| `config` | Validated seed and generator parameters |
| `view` | Inspection settings such as wireframe, contours, and slice height |
| `createdAt`, `updatedAt` | Server timestamps for sorting |

Generated vertices, triangles, and cached tiles are not stored. Loading re-runs the deterministic generator from the saved inputs. A saved configuration therefore remains small and works across devices after sign-in.

## Workflow

1. The visitor opens Terrain Field or Voxel World and signs in with Google.
2. The panel subscribes to the 40 most recent saves of that experiment.
3. **Save current** validates and allowlists the settings, then creates a new Firestore document. Each click makes a separate named snapshot; there is no autosave or overwrite.
4. **Load** asks before replacing the current unsaved settings, fetches the document, checks its schema and value ranges, and applies the generator and view settings.
5. Firestore Security Rules only allow a signed-in owner to read or create documents below their UID. Update and delete are intentionally disabled until corresponding UI is designed.

## Connect a Firebase project

The repository has no project credentials yet. To activate the workflow:

1. Create a Firebase project and register a Web app.
2. Enable Authentication → Google sign-in, and add the portfolio domain to Authorized domains. Add `localhost` for local testing if it is absent.
3. Create a Cloud Firestore database.
4. Copy `.env.example` to `.env.local` and enter the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` values. Restart Vite after changing the file.
5. Deploy `firestore.rules` and `firestore.indexes.json` using the Firebase CLI and the project ID. The composite index supports the per-experiment, newest-first library query.
6. Test sign-in, save, refresh, and load in both experiments. Test with a second account to confirm it cannot read the first account's documents.

Example deployment command after Firebase CLI login:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

The Web app configuration is public client configuration, not an Admin SDK secret. Authentication and deployed Firestore rules are the data boundary. Do not place a service-account key in any `VITE_` variable.

## Verification status

`npm run verify:presets` checks round-trip schema parsing, field allowlisting, invalid resolutions, operation limits, and incompatible versions. `npm run build` checks the client bundle. Live Authentication and Firestore behavior cannot be verified until a Firebase project is connected and the rules/index are deployed.

## Sources

- [Firebase Web setup](https://firebase.google.com/docs/web/setup)
- [Google sign-in for Web](https://firebase.google.com/docs/auth/web/google-signin)
- [Add data to Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/add-data)
- [Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Cloud Firestore indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
