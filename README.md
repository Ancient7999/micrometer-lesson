# Micrometer screw gauge — diameter, volume and density of a sphere

> This README is AI-generated.

An interactive, single-page lesson on the micrometer screw gauge practical: measuring the diameter of a sphere, then finding its volume and density.

Live site: https://sonicunligmated.github.io/micrometer-lesson/

## Sections

- **Aim and outcomes** — the aim, intended learning outcomes and where precise small-scale measurement matters in medicine.
- **Theory** — pitch, least count, main (pitch) scale and head scale readings, d = PSR + HSR × L.C, zero error and correction, the ratchet, and the mean of five trials. Includes an interactive reading trainer.
- **Method** — the procedure step by step with figures.
- **Results** — an example observation table, the mean, and the calculation of volume and density in lab units (mm → cm → cm³ → g/cm³).
- **MCQs** — twenty questions with shuffled choices and feedback.
- **Practical** — a simulated micrometer and digital balance:
  - thimble turned by drag, scroll wheel or arrow keys (fast turning moves the spindle quickly);
  - ratchet that clicks once contact is made; over-tightening warns and squeezes the reading; lock freezes the spindle;
  - magnified view of the sleeve and thimble at the datum line;
  - numbered dishes of spheres (each returns only to its own dish); a sphere cannot enter a gap that is too small and falls out of a gap that is too wide;
  - optional zero check;
  - typed PSR and HSR readings validated with hints; five trials and their mean;
  - weighing on the balance, then a stepwise calculation checked with tolerances and hints for common slips;
  - a guided tutorial with Pause/Resume, playback speed, Previous step / Next step (← → keys) and Stop, and Start over.

## Example values

The example uses a steel sphere: PSR 12.5 mm, HSR 20, 21, 19, 22, 20 (L.C = 0.01 mm), mean d = 12.704 mm = 1.2704 cm, r = 0.6352 cm, V ≈ 1.074 cm³, m = 8.38 g, ρ ≈ 7.80 g/cm³.

## Model notes

- Pitch 0.5 mm, 50 head-scale divisions, least count 0.01 mm, range 0–25 mm.
- Each trial reads a slightly different diameter (orientation of the sphere), within ±0.02 mm.
- Over-tightening past contact compresses the reading by up to 0.03 mm.

## Files

- `index.html` — markup for all sections
- `css/styles.css`, `css/fonts.css` — theme and self-hosted fonts
- `js/app.js` — drawing, navigation, simulation, tutorial and checks
- `fonts/` — Archivo, Public Sans, Spline Sans Mono and Handlee (SIL Open Font License)

No build step; any static file server works.
