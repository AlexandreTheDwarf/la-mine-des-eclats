# La Mine des Éclats

Incremental minier entièrement local, construit avec React, TypeScript et Vite.

## Version 0.4.1

- bourse des filons débloquée à 25 mètres, avec cours individuels renouvelés toutes les 45 secondes ;
- vente sélective pour conserver les minerais utiles à la forge ;
- signal de marché et sélection rapide des cours favorables ;
- taupes mécaniques visibles dans la mine avec une frappe animée chaque seconde.

## Version 0.4.0

- campagne étendue à six secteurs, dix minerais et onze pioches ;
- progression par strates : les profondeurs avancées demandent plusieurs filons par mètre ;
- quatre grandes balises à 120, 240, 400 et 600 mètres, puis des cycles sans fin ;
- remontées d'expédition et améliorations permanentes achetées avec les échos ;
- deux nouvelles machines avancées, plafonds de machines et économie longue durée ;
- nouveaux objectifs, événements, membres d'équipe et trois décors originaux ;
- migration automatique des anciennes sauvegardes.

## Lancer le jeu

```bash
npm install
npm run dev
```

## Vérifier la version

```bash
npm test
npm run build
```

Le dossier `dist` produit par la construction est autonome et peut être déposé sur n'importe quel hébergement statique.

## GitHub Pages

Le projet contient déjà `.github/workflows/deploy-pages.yml`. Une fois le dossier placé à la racine d'un dépôt GitHub et la source GitHub Pages réglée sur **GitHub Actions**, chaque envoi sur la branche `main` construit et publie automatiquement le jeu.

La configuration Vite utilise des chemins relatifs, ce qui permet aussi un hébergement dans un sous-dossier de type `nom.github.io/la-mine-des-eclats/`.

## Sauvegarde

La partie est conservée dans le navigateur. Le menu des réglages permet d'exporter et de réimporter un code de sauvegarde.
