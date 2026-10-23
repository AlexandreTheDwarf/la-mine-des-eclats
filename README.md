# La Mine des Éclats

**Version 1.0.0 · L'Aube retrouvée**

Un jeu incremental minier narratif, en français, jouable sur ordinateur et téléphone. Une pioche de fortune, quelques filons, puis toute une compagnie à faire grandir sous la montagne.

**[Jouer à La Mine des Éclats](https://alexandrethedwarf.github.io/la-mine-des-eclats/)**

Le projet est terminé dans son périmètre 1.0 : la campagne possède une conclusion et des défis facultatifs après la fin. La suite relève de la maintenance, avec d'éventuels correctifs et petits patchs d'équilibrage. Aucune extension majeure n'est actuellement prévue.

## Le jeu

- Miner à la main, entretenir sa pioche et forger onze outils au fil de six secteurs.
- Retrouver les anciennes galeries pour leurs minerais, choisir ce que l'on vend et profiter des cours du marché.
- Installer des machines, honorer des contrats et développer une recherche permanente.
- Transformer les minerais dans le complexe industriel et investir dans les Grands Travaux.
- Repartir en cycle pour gagner des échos et des améliorations durables.
- Former six spécialistes, explorer le Réseau des Failles et retrouver les six reliques de la Faille originelle.
- Suivre le carnet jusqu'au chantier de l'Aube, puis poursuivre librement la mine ou ses trois défis rejouables.

L'automatisation, les productions engagées et les expéditions continuent pendant l'absence, avec un calcul au retour plafonné à huit heures. Le jeu n'a pas besoin de rester ouvert.

## Jouer sur téléphone

Le jeu fonctionne directement dans le navigateur. Il peut aussi être installé comme une **application web (PWA)** lorsque le navigateur le permet : ce n'est pas un APK et aucun compte n'est nécessaire.

Dans les réglages du jeu, utiliser **Installer la mine** si le bouton est proposé, ou consulter **Installation sur téléphone** pour les guides Chrome, Firefox et Safari.

Le mode hors connexion devient disponible après la première préparation du cache, qui télécharge environ 17 Mo de décors et de ressources. Les mises à jour sont proposées dans les réglages et appliquées après sauvegarde, sans rechargement forcé en pleine partie.

## Sauvegardes

La progression est enregistrée localement toutes les cinq secondes et au passage en arrière-plan. Les réglages permettent d'exporter un fichier ou un code, d'importer une copie et de restaurer le secours local.

**Exporter une copie avant une mise à jour ou un changement d'appareil.** La sauvegarde dépend du navigateur, du profil et de l'adresse du site utilisés. Il n'y a pas de synchronisation entre appareils ; effacer les données du navigateur peut supprimer la partie et son secours.

La 1.0 migre les anciennes parties, notamment les versions 0.9.2 et 0.9.3, en conservant leurs acquis et les productions déjà payées. Le chantier final commence à sa première phase, sans recommencer la mine. Un export 1.0 n'est pas compatible avec une version plus ancienne.

Le contrôle multi-onglets protège contre les écritures périmées, mais ne remplace pas une synchronisation : privilégier un seul onglet actif.

## Développement local

React, TypeScript et Vite, sans serveur applicatif ni base de données distante. Utiliser Node.js 22 avec npm, comme dans les vérifications GitHub Actions.

```bash
npm ci
npm run dev
```

Pour vérifier la version et essayer le mode installable ou hors connexion, utiliser le build de production :

```bash
npm test
npm run simulate:campaign
npm run simulate:origin
npm run simulate
npm run build
npm run check:pwa
npm run preview
```

Le dossier `dist/` est autonome et peut être servi par un hébergement statique. Les chemins relatifs permettent un déploiement à la racine ou dans un sous-dossier.

## Repères pour modifier le code

| Fichier | Responsabilité |
| --- | --- |
| `src/game.ts` | Règles, économie, actions, temps écoulé, migration et validation des parties |
| `src/campaign.ts` | Textes, prix, prérequis du chantier final, défis et contrat de sauvegarde |
| `src/progression.ts` | Chapitres et prochaine étape, dérivés de la progression réelle |
| `src/CampaignPanel.tsx`, `src/campaign.css` | Carnet, chantier, conclusion et présentation mobile |
| `src/grandWorks.ts` | Coûts et effets des infrastructures permanentes |
| `src/riftNetwork.ts`, `src/crew.ts` | Routes, protocoles et progression de l'équipage |
| `src/origin.ts`, `src/expeditionPlanning.ts` | Chapitres de l'Origine, reliques, talents et préparation des convois |
| `src/originValidation.ts` | Validation des états persistants de l'Origine |
| `src/saveStore.ts`, `src/useGameSession.ts` | Stockage, secours, horloge et protection multi-onglets |
| `src/Modal.tsx`, `src/SettingsModal.tsx`, `src/SaveRecovery.tsx` | Dialogues, réglages, export et récupération |
| `src/usePwa.ts`, `vite.config.ts` | Installation, cache hors connexion et mises à jour |
| `tests/`, `scripts/simulate-campaign.mjs` | Régressions et parcours reproductibles depuis une partie neuve |

Pour un patch d'équilibrage, modifier les règles et tables de coûts, puis relancer les tests et les simulations. Les calculs économiques restent séparés de leur présentation.

Le schéma de sauvegarde courant est **14**, sous la clé historique `mine-des-eclats-save-v2`. Le secours utilise `mine-des-eclats-save-v2-backup`. Ne pas confondre `lastSimulatedAt`, qui suit le temps déjà calculé, et `lastSavedAt`, qui date l'enregistrement.

Les prix, durées et récompenses des missions sont figés au départ. Une modification d'équilibrage ne doit pas réécrire un trajet déjà payé, effacer une ancienne partie ou remettre un acquis à zéro.

## Validation

La livraison 1.0 comprend **56 tests automatisés** et quatre profils de simulation qui atteignent la conclusion sans ressources offertes. Le build, la PWA, les migrations et l'affichage ordinateur/mobile ont été vérifiés.

Les simulations servent à détecter les blocages et les déséquilibres ; elles ne garantissent pas une durée de jeu humaine. Les essais de largeur d'écran et de cache ne remplacent pas un essai sur un téléphone réel.

Le [bilan de validation 1.0](docs/v1.0-validation.md) détaille les mesures et les limites, dont les contrôles Android physiques restant à confirmer. Les bilans [0.9.2](docs/v0.9.2-validation.md) et [0.9.3](docs/v0.9.3-validation.md) sont conservés comme archives.

## Publication et maintenance

La branche `main` porte la version publique. Son workflow [GitHub Pages](.github/workflows/deploy-pages.yml) exécute les tests, les simulations, la compilation et le contrôle PWA avant de déployer le jeu.

Les branches `feature/**` sont vérifiées sans publication. Les éventuels correctifs seront préparés séparément, validés, puis intégrés à `main`.

Pour signaler un problème, préciser la version, le navigateur, l'appareil et les étapes pour le reproduire. Conserver un export de la partie avant toute manipulation de récupération.

## Historique en bref

| Version | Apport principal |
| --- | --- |
| 1.0 | Campagne complète, carnet, chantier final, défis et équilibrage global ; intègre la Faille originelle préparée en 0.9.3 |
| 0.9.2 | Sauvegardes fiabilisées, gestion des absences et application web installable |
| 0.9.1 | Équipage, niveaux, fatigue et bonus des spécialistes |
| 0.9 | Réseau des Failles et expéditions |
| 0.8 | Grands Travaux et automatisation industrielle |
| 0.7 | Complexe industriel, composants et doctrines |
| 0.5–0.6 | Contrats, recherche et améliorations mobiles |
| 0.4 | Six secteurs, cycles, marché et vente sélective |
