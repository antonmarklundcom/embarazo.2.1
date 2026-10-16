# Exercise images — current placement, 16 October 2026

All 12existing exercises remain published with the same 24canonical step paths and unchanged written instructions. The current images are original realistic editorial photographs generated with Higgsfield Nano Banana 2.1, 2K/High, then optimized with webimg. Paired steps preserve their model and wardrobe. The full provenance, rejected results and credit accounting are in `docs/imagery-manifest.json`; release details are in `docs/DESIGN-IMAGERY-2026-10-16.md`.

The exercise schema continues to require `/assets/ejercicios/<slug>.webp`. Keep those canonical files. `lib/realistic-image-slots.json` maps them to SEO-named responsive AVIF/WebP variants in `public/assets/img`; `RealisticPicture` retains the original renderer when a mapping is missing. Canonical exercise fallbacks are 1280px WebP copies of the optimized set. Do not replace seed paths or change instructions simply to add a different image format.

Original 2K sources remain outside Git at `E:/ai work/Artifacts/embarazo.2.1/2026-10-16/design/sources`. A raised-heel calf result was rejected and excluded; its corrected image must show the rear heel on the floor. Image review checks presentation and pose consistency, not clinical approval of the exercise program.

Use webimg with 640/1280 widths, mandatoryOG output and default byte budgets. Preserve the external full converter manifest when adding further sets; the public manifest is deliberately compact. Run content validation, the production build and exercise image/offline browser checks after replacements. Serwist's installed build currently hash-precaches public image files; inspect the actual generated worker instead of relying on older runtime-only comments.
