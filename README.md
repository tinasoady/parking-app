# Parking Manager

Application mobile (Android, React Native/Expo) pour gérer un parking en local, sans connexion
internet requise : enregistrement des entrées/sorties de véhicules, calcul automatique du prix
selon la durée, impression des reçus et du rapport de fin de journée sur une imprimante
thermique Bluetooth, et réinitialisation du compteur réservée à l'administrateur.

## Fonctionnement général

- **Entrée d'un véhicule** : un opérateur crée un ticket (numéro + heure d'entrée, plaque
  optionnelle). Le ticket peut être imprimé pour le client.
- **Sortie / paiement** : l'opérateur sélectionne le véhicule dans la liste de ceux encore
  stationnés. Le prix est calculé automatiquement à partir de la durée réelle et des règles
  tarifaires, avec un bonus/réduction optionnel à appliquer. Un reçu est imprimé après
  encaissement.
- **Rapport de fin de journée** : depuis l'historique, on peut imprimer un rapport listant tous
  les reçus de la journée, le nombre total de véhicules et la recette totale.
- **Réinitialisation** : uniquement possible par l'administrateur (protégé par code PIN), et
  seulement si plus aucun véhicule n'est stationné. Elle clôture la journée (elle reste
  consultable dans l'historique) et ouvre une nouvelle journée avec un compteur de tickets à
  zéro.
- **Réglages (administrateur)** : prix par heure, tranche de facturation, mode d'arrondi,
  minutes gratuites, plafond journalier, liste de bonus/réductions, informations de
  l'établissement, imprimante Bluetooth et code PIN.

Toutes les données (réglages, journées, tickets) sont stockées **localement** dans une base
SQLite sur l'appareil — aucun serveur, aucune connexion internet nécessaire.

**Code PIN administrateur par défaut : `1234`** — à changer dès le premier lancement, dans
*Réglages → Sécurité*.

## Impression

L'application imprime en ESC/POS brut sur une imprimante thermique de reçus connectée en
**Bluetooth Classic (SPP)** — le type le plus courant pour les petites imprimantes portables
58 mm / 80 mm.

1. Appairez l'imprimante depuis les réglages Bluetooth d'Android (comme n'importe quel
   appareil Bluetooth).
2. Dans l'app : *Réglages → Configurer l'imprimante Bluetooth*, sélectionnez-la dans la liste,
   puis lancez un ticket de test.
3. Ajustez au besoin la largeur de ticket dans *Réglages* (32 caractères pour du 58 mm, 48 pour
   du 80 mm).

> Limite connue : les caractères accentués (é, è, à…) sont automatiquement remplacés car la
> plupart des imprimantes thermiques bon marché ne supportent pas nativement l'UTF-8/latin.
>
> L'impression Bluetooth Classic est fiable sur **Android**. Sur iOS, seules les imprimantes
> compatibles MFi (protocole `External Accessory`) fonctionnent ; ce n'est pas le scénario
> ciblé par défaut.

## Prérequis techniques

Cette app utilise un module Bluetooth natif (`react-native-bluetooth-classic`), elle **ne peut
donc pas tourner dans Expo Go**. Il faut construire un client de développement (dev client) ou
un APK.

- Node.js 18+
- Android Studio (SDK + un appareil/émulateur Android) pour builder en local, **ou** un compte
  [Expo Application Services (EAS)](https://expo.dev/eas) pour builder dans le cloud.

## Installation

```bash
npm install
```

## Lancer en développement (build local)

```bash
npm run android
```

Cette commande génère le projet natif Android (`expo prebuild`, automatique) puis compile et
installe un dev client sur l'appareil/émulateur connecté, avec rechargement à chaud du code JS.

## Construire un APK à distribuer (recommandé pour un usage réel sur site)

Avec EAS (build dans le cloud, pas besoin d'Android Studio) :

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Ou en local si Android Studio est installé :

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

L'APK généré (`android/app/build/outputs/apk/release/app-release.apk`) peut être installé sur
n'importe quelle tablette/téléphone Android du parking, sans connexion internet au quotidien.

## Dépannage

**`JAVA_HOME is not set and no 'java' command could be found in your PATH`** (au `npm run
android`)

Le build Android natif a besoin d'un JDK, indépendamment de Node. Si Android Studio est déjà
installé, il embarque un JDK utilisable directement (pas besoin d'en installer un autre) :

1. Définir les variables d'environnement utilisateur (PowerShell, une seule fois) :
   ```powershell
   [Environment]::SetEnvironmentVariable("JAVA_HOME", "$env:ProgramFiles\Android\Android Studio\jbr", "User")
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", "$env:LOCALAPPDATA\Android\Sdk", "User")
   ```
2. **Redémarrer complètement VSCode/le terminal** (les variables ne s'appliquent qu'aux
   nouveaux processus).
3. Relancer `npm run android`.

Si Android Studio n'est pas installé, l'installer d'abord (il inclut le SDK Android et un JDK
compatible), ou installer un JDK 17+ séparément.

**Autres erreurs de build Gradle** : vérifier qu'un appareil/émulateur Android est bien
connecté (`adb devices`) et que le SDK Android correspondant à `compileSdkVersion` est installé
via le SDK Manager d'Android Studio.

## Structure du projet

```
src/
  types/        Types partagés (tickets, journées, réglages, règles tarifaires)
  db/           Accès SQLite (réglages, journées, tickets)
  domain/       Moteur de calcul du prix (durée, arrondi, bonus, plafond)
  printing/     Génération ESC/POS et communication Bluetooth avec l'imprimante
  state/        Contextes React (réglages, journée en cours, verrouillage admin)
  navigation/   Navigation (onglets + écrans modaux)
  screens/      Écrans de l'application
  components/   Composants UI réutilisables
  utils/        Fonctions utilitaires (formatage dates, montants, durées)
  theme.ts      Couleurs et styles partagés
```

## Personnaliser les règles tarifaires

Tout se configure depuis l'app (*Réglages*, protégé par PIN admin) :

- **Prix par heure**
- **Tranche de facturation** (ex. facturer par heure pleine, par 15 min, etc.)
- **Arrondi** : supérieur, au plus proche, ou inférieur
- **Minutes gratuites** en début de stationnement
- **Plafond journalier** (montant maximum par véhicule, optionnel)
- **Bonus/réductions** : pourcentage, montant fixe, ou minutes offertes — applicables au cas
  par cas au moment du paiement (ex. « Client fidèle -20 % », « 30 min offertes »)

## Licence

Distribué sous licence MIT — voir [LICENSE](LICENSE).
