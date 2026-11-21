# Car models

| File | Source | Author | License |
|------|--------|--------|---------|
| `base.glb` | [Poly Pizza — "Racing car"](https://poly.pizza/m/EMcTJiXibv) | scaranto | CC0 1.0 (public domain) |

Liveries are applied at runtime from `src/shared/config/carModels.ts` (team colours only,
no logos or sponsor marks). Source files live here; `npm run models:optimize` writes the
compressed copies the app loads to `public/models/cars/`.
