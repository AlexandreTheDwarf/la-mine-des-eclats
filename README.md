# La Mine des Éclats

Incremental minier entièrement local, construit avec React, TypeScript et Vite.

## Branche de préparation 0.8.0 - Les Grands Travaux

- trois infrastructures majeures et quinze paliers, débloqués après la deuxième expédition ;
- près de 19 millions d'éclats nécessaires pour achever l'ensemble des chantiers ;
- file industrielle extensible de un à six ordres et accélération permanente des chaînes ;
- répétition automatique d'une recette, pilotée par le Bureau des intendants ;
- puits à éclats sans fin après les Grands Travaux, avec rendement décroissant et bonus plafonné ;
- quatre nouveaux objectifs, migration automatique des productions 0.7 et tests économiques dédiés.

Cette version vit sur la branche `feature/v0.8-grands-travaux` tant qu'elle n'a pas reçu le feu vert pour `main`.

## Version 0.7.0 - Le Complexe

- complexe industriel débloqué après la première expédition ;
- trois chaînes transformant les anciens minerais en composants persistants ;
- doctrines Rendement, Consortium et Harmoniques qui spécialisent chaque partie ;
- quinze niveaux de modules industriels répartis entre automatisation, extraction, commerce et durabilité ;
- productions actives pendant l'absence et conservées entre les cycles ;
- trois nouveaux objectifs industriels et migration automatique des sauvegardes 0.6.1.

## Version 0.6.1 - Profondeur mobile

- profondeur actuelle et prochaine balise toujours visibles sur téléphone ;
- laboratoire d'échos débloqué à 80 mètres avec un codex des dix minerais ;
- trois niveaux d'analyse par minerai, contre des échantillons de plus en plus importants ;
- données de recherche dépensées dans six protocoles permanents à quatre niveaux ;
- bonus de frappe, automatisation, extraction, durabilité, résonance et commerce ;
- recherche, codex et données conservés entre les cycles, avec trois nouveaux objectifs.

## Version 0.5.0 - La Compagnie

- Compagnie minière débloquée à 40 mètres avec trois contrats simultanés ;
- commandes adaptées aux minerais accessibles dans le cycle actif ;
- échéances sans pénalité, primes supérieures au marché et réputation persistante ;
- cinq rangs commerciaux, historique des transactions et nouveaux objectifs ;
- réputation et registre conservés lors des nouvelles expéditions.

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
