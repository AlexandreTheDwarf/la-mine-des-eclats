# La Mine des Éclats

Incremental minier entièrement local, construit avec React, TypeScript et Vite.

## Branche de préparation 0.9.2 - La mine dans la poche

- horloge réelle commune au jeu actif, au retour d'onglet et au rechargement ;
- progression d'absence plafonnée à huit heures, comptée une seule fois ;
- sauvegarde toutes les cinq secondes et au passage en arrière-plan ;
- secours tournant, export en fichier, import et restauration depuis les réglages ;
- sauvegarde illisible, stockage refusé ou onglet périmé : partie mise en pause, jamais remplacée silencieusement ;
- Braise économise au moins un composant par ligne de deux unités ou plus ;
- missions longues mieux rémunérées en expérience, XP et forme lisibles sur mobile ;
- signal originel exigeant 32 données et cinq routes explorées (les signaux déjà obtenus sont conservés) ;
- PWA installable dans les navigateurs compatibles, six décors disponibles hors connexion après mise en cache ;
- mises à jour proposées, puis appliquées après sauvegarde, sans rechargement forcé en pleine partie.

Branche : `feature/v0.9.2-fiabilite-mobile`. Elle inclut les préparations 0.8, 0.9 et 0.9.1, **sans fusion ni publication sur `main`**.

Il s'agit toujours de la webapp, pas d'un APK ni d'une publication Play Store. L'installation n'ajoute ni compte ni synchronisation entre appareils. Le calcul des gains se fait au retour, sans garder le téléphone éveillé.

### Repères pour modifier le code

| Fichier | Responsabilité |
| --- | --- |
| `src/game.ts` | Règles du jeu, migration et validation des sauvegardes, calcul du temps écoulé |
| `src/saveStore.ts` | Accès au stockage, secours, archivage et détection des écritures d'autres onglets |
| `src/useGameSession.ts` | Coordination React, horloge, visibilité et enregistrement |
| `src/SaveRecovery.tsx` | Écran de récupération et export fichier |
| `src/crew.ts` | Niveaux, fatigue, XP par route et bonus des spécialistes |
| `src/riftNetwork.ts` | Routes, protocoles, coûts et conditions du signal originel |
| `src/RiftNetworkPanel.tsx` | Carte, préparation, équipage et rapports |
| `src/usePwa.ts`, `vite.config.ts` | Installation, cache Workbox et mises à jour |

La sauvegarde garde sa clé historique `mine-des-eclats-save-v2` et passe au schéma 12. `lastSimulatedAt` indique jusqu'où les gains ont été calculés ; `lastSavedAt` indique quand les données ont été écrites. **Ne pas les confondre**, sinon un enregistrement peut effacer du temps de progression.

Le secours `mine-des-eclats-save-v2-backup` tourne au plus une fois par minute ; un import ou une nouvelle partie sauvegarde immédiatement l'état précédent. Une restauration après corruption conserve les octets originaux dans une clé `mine-des-eclats-save-v2-recovery-<date>`. Rien de tout cela ne protège d'un effacement complet des données du navigateur : l'export fichier reste nécessaire pour une copie indépendante.

Le contrôle multi-onglets détecte une révision périmée avant les actions et sauvegardes, ainsi que les événements de stockage. Ce n'est pas un service de synchronisation ni une transaction multi-appareils ; privilégier un seul onglet actif.

### Vérification de cette version

```bash
npm ci
npm test
npm run simulate
npm run build
npm run check:pwa
npm run preview -- --host 127.0.0.1 --port 8766 --strictPort
```

Les tests de fiabilité couvrent notamment suspension, cap de huit heures, migration des missions payées, quota, corruption, secours, onglet périmé et équilibrage. La simulation compare des stratégies avec ressources abondantes : elle ne prédit pas la durée totale de la campagne. Répéter le premier trajet vingt fois ne révèle plus le signal ; visiter les cinq routes avec Opale en mode Éclaireur demande environ 166 minutes de trajet et 1,41 million d'éclats, hors acquisition des ressources.

Les branches `feature/**` ont leur propre vérification GitHub Actions, sans déploiement. La publication Pages reste réservée à `main`.

### Application installable et hors connexion

Tester la PWA avec le **build de production**, pas le serveur de développement. HTTPS est nécessaire sur un hébergement ; localhost convient aux essais. Le bouton d'installation apparaît dans les réglages lorsque le navigateur propose l'installation. Le manifeste, son périmètre et ses icônes sont relatifs pour rester compatibles avec GitHub Pages.

La première préparation du mode hors connexion télécharge environ 17 Mo, dont les six illustrations. Une nouvelle version attend la validation dans les réglages ; l'enregistrement doit réussir avant son activation. Le stockage reste attaché au navigateur, à l'origine et au profil utilisés : exporter la partie avant de changer de navigateur ou d'appareil.

À valider sur un véritable Android avant sortie publique : installation depuis Chrome, lancement depuis l'icône, mode avion après préparation du cache, verrouillage de l'écran pendant une mission, puis retour et mise à jour. Une émulation de largeur ne remplace pas ces contrôles matériels.

## Branche de préparation 0.9.1 - L'Équipe de nuit

- six spécialistes réellement affectables aux expéditions du Réseau des Failles ;
- bonus distincts sur la durée, les composants, les éclats, les pièces, la cartographie ou les signaux ;
- expérience individuelle sur cinq niveaux et trois nouveaux objectifs d'équipage ;
- fatigue souple qui réduit légèrement les bonus sans jamais interdire un départ ;
- repos automatique pendant le jeu et hors ligne, à l'exception du membre en mission ;
- rapports nominatifs, états de forme et progression visibles avant chaque lancement ;
- migration transparente des sauvegardes et des expéditions déjà parties en 0.9.0.

Cette version vit sur la branche `feature/v0.9.1-equipage` et ne doit pas être fusionnée dans `main` avant validation.

## Branche de préparation 0.9.0 - Le Réseau des Failles

- station cartographique débloquée après trois cycles et huit paliers de Grands Travaux ;
- cinq destinations de cinq minutes à trois heures, plus un signal terminal annonçant la Faille originelle ;
- protocoles Éclaireur, Cartographe et Récupération pour arbitrer durée, progression et butin ;
- expéditions parallèles à la mine et à l'industrie, poursuivies pendant l'absence ;
- coûts croissants en éclats et composants lors des visites répétées ;
- données cartographiques, historique des retours, notifications et trois objectifs dédiés ;
- migration automatique des sauvegardes 0.8 et logique économique isolée dans `src/riftNetwork.ts`.

Cette version vit sur la branche `feature/v0.9-reseau-failles` et n'est pas encore destinée à `main`.

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
