# Portfolio — Jonathan Picquette, QA Automation

Site vitrine d'une page présentant huit ans de pratique en QA automation : méthode, périmètre d'intervention, parcours et deux démonstrations interactives.

**En ligne 👉 https://icepjohn.github.io/portfolio-qa/**

## Contenu de la page

| Section | Ce qu'elle fait |
|---|---|
| Hero | Animation `canvas` scrubée au scroll (convoi → grille de tests exécutée) |
| Calculateur | Estime le coût d'une recette manuelle et l'économie apportée par l'automatisation |
| Le système | Les quatre piliers, avec visuels générés en `canvas` |
| Démo live | Simulation d'une suite Playwright : exécution, retries, journal, taux de réussite |
| Parcours | Cinq postes en accordéon |
| Expertise | Stack technique par domaine |

## Structure

```
index.html          HTML + CSS (design tokens, styles, markup)
assets/app.js       Tout le JavaScript (animations, calculateur, runner, nav)
index-v1.html       Version précédente du site, conservée pour référence
JonathanPicquetteCV.pdf
JonathanPicquette.jpg
```

Pas de build, pas de dépendance à installer : le dépôt est publié tel quel par GitHub Pages depuis `main`.

## Développer en local

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

Ouvrir `index.html` directement en `file://` fonctionne aussi, mais passer par HTTP reproduit les conditions de production (résolution des chemins, cache, application de la CSP) et évite les écarts de comportement entre navigateurs.

## Dépendances externes

Chargées depuis jsDelivr, versions figées et vérifiées par `integrity` (SRI) :

- GSAP 3.12.5 + ScrollTrigger — animations liées au scroll
- Lenis 1.1.14 — défilement lissé

Elles sont **optionnelles** : si le CDN est injoignable, la page bascule sur `IntersectionObserver` et le défilement natif. Rien ne casse.

En cas de changement de version, régénérer l'empreinte SRI, sinon le navigateur refusera le script :

```bash
curl -sS <url-du-script> | openssl dgst -sha384 -binary | openssl base64 -A
```

## Sécurité

Une CSP est déclarée en `<meta>` dans `index.html` :

```
default-src 'self'; script-src 'self' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self' data:;
base-uri 'self'; form-action 'self'; object-src 'none'
```

Toute nouvelle ressource externe (script, police, image) doit y être ajoutée, sinon elle sera bloquée silencieusement.

Deux limites assumées : `frame-ancestors` est ignoré en `<meta>` et demanderait un en-tête HTTP, impossible sur GitHub Pages ; `style-src` conserve `'unsafe-inline'` car la page utilise des attributs `style="…"`.

## Robustesse et accessibilité

La page reste lisible et navigable si le JavaScript est désactivé, bloqué ou en erreur : les règles `html:not(.js)` neutralisent alors le préloader et les animations d'apparition, et `unlock()` est armé sur un timer et sur `window.onerror`. Seuls le calculateur et la démo deviennent inertes — un `<noscript>` le signale.

Côté accessibilité : un seul `<h1>` et pas de niveau de titre sauté, skip-link, anneau `:focus-visible` global, accordéon et menu pilotables au clavier (`aria-expanded`, Échap, piège de focus), canvas décoratifs en `aria-hidden`, région `role="status"` pour la démo. Les animations respectent `prefers-reduced-motion`.
