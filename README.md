# La Mine des Éclats

Incremental minier entièrement local, construit avec React, TypeScript et Vite.

## Version 0.3

- économie rééquilibrée et rendement des wagons corrigé ;
- notifications animées pour les machines débloquées et les objectifs atteints ;
- mini-tutoriel contextuel pour la vente des minerais ;
- texte des événements non sélectionnable.

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
