# @villedemontreal/mongo
Module d'utilitaires pour les connections de Mongo.

## Installation

Installer la bibliothèque:

```shell
    npm install --save @villedemontreal/mongo
```

## Configuration pour utilisation dans Docker

À lire si les tests fonctionnent bien en local mais timeout lors du build sur Jenkins.

Il est conseiller d'activer les traces de débogage si cela se produit. Voir plus bas dans ce document.

Mongo a une dépendance sur la libcurl. Cette librairie doit être présente dans l'image docker

`apt-get install -y curl &&`

Il faut veiller à utiliser une version de mongo compatible avec la libcurl sur l'OS du conteneur.

La version 4.4.0 fonction avec les versions récentes de node (ex node-14-buster-slim)
``

### Références

https://github.com/nodkz/mongodb-memory-server/issues/204
https://jira.mongodb.org/browse/SERVER-37768
https://jira.mongodb.org/browse/SERVER-44491

## Utilisation

Il faut premièrement initialiser la librairie elle-même. Par exemple, dans un projet d'API basé sur le générateur, ceci sera effectué dans le
fichier "`src/init.ts`", au début de la fonction `initComponents()` :

```typescript
import { init as initMongoUtilsLib } from '@villedemontreal/mongo';
import { createLogger } from './utils/logger';

// ...

export async function initComponents() {
  initMongoUtilsLib(createLogger);

  //...
}
```

Puis si, en plus des simples utilitaire, vous désirez utiliser la gestion de Mongoose fournie par la librairie (pour
profiter de la fonctionalité de migrations par exemple), il faut appeller `initMongoose(...)` avec les configurations
appropriées.

Par exemple :

```typescript
import { initMongoose, IMongooseConfigs } from "@villedemontreal/mongo";
import { configs } from "../../../../config/configs";

await initMongoose( new IMongooseConfigs {
    applyUpdates: true,
    connectionString: configs.mongo.connectionString,
    connectionOptions: configs.mongo.connectionOptions,
    //...
});
```

# Débogage

En cas de problème avec mongo-memory-server-core, vous pouvez activer les traces de debogage en utilisant une varible
d'environnement.

`DEBUG=MongoMS:*`

Voir https://www.npmjs.com/package/debug pour les détails d'utilisation

# Versions

Importe les dépendances suivantes:

- Mongo 3.5.9 [Détails](https://docs.mongodb.com/ecosystem/drivers/driver-compatibility-reference/#node-js-driver-compatibility)
- Mongoose 5.9.19 [Détails](https://mongoosejs.com/docs/compatibility.html)
- MongoMemoryServer 6.6.1
- @types/mongodb: 3.5.22
- @types/mongoose: 5.7.24

## Notes

- Lorsque vous appellez la méthode `MongoUtils#mockMongoose(...)` en passant une instance de "`mocha`", assurez-vous de le
  faire dans une function _régulière_ et non dans une _arrow_ function ou alors une erreur sera lancée! Par exemple :

Ceci ne fonctionnera **pas** :

```typescript
before(async () => {
  // ...
  await mongoUtils.mockMongoose(this, testconfig.mockServer.serverVersion);
});
```

Mais ceci va fonctionner :

```typescript
before(async function() {
  // ...
  await mongoUtils.mockMongoose(this, testconfig.mockServer.serverVersion);
});
```

Voir [cette issue](https://github.com/mochajs/mocha/issues/2018) pour plus de détails.

# Plugins

## Pagination

Le but du plugin est de faciliter l'intégration de la pagination dans nos systèmes et de standardiser l'output afin de faciliter la consomation.

### Utilisation

```typescript
import { mongoosePaginate } from '@villedemontreal/mongo';
var schema = new mongoose.Schema({
  /* schema definition */
});
schema.plugin(mongoosePaginate);

var Model = mongoose.model('Model', schema); // Model.paginate()
const result = Model.paginate({}, { offset: 0, limit: 10 });
```

### Output

```json
{
  "paging": {
    "totalCount": 4,
    "limit": 25,
    "offset": 0
  },
  "items": [
    // your items
  ]
}
```

# Builder le projet

**Note**: Sur Linux/Mac assurz-vous que le fichier `run` est exécutable. Autrement, lancez `chmod +x ./run`.

Pour lancer le build :

- > `run compile` ou `./run compile` (sur Linux/Mac)

Pour lancer les tests :

- > `run test` ou `./run test` (sur Linux/Mac)

# Mode Watch

Lors du développement, il est possible de lancer `run watch` (ou `./run watch` sur Linux/mac) dans un terminal
externe pour démarrer la compilation incrémentale. Il est alors possible de lancer certaines _launch configuration_
comme `Debug current tests file - fast` dans VsCode et ainsi déboguer le fichier de tests présentement ouvert sans
avoir à (re)compiler au préalable (la compilation incrémentale s'en sera chargé).

Notez que, par défaut, des _notifications desktop_ sont activées pour indiquer visuellement si la compilation
incrémentale est un succès ou si une erreur a été trouvée. Vous pouvez désactiver ces notifications en utilisant
`run watch --dn` (`d`isable `n`otifications).

# Déboguer le projet

Trois "_launch configurations_" sont founies pour déboguer le projet dans VSCode :

- "`Debug all tests`", la launch configuration par défaut. Lance les tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés.

- "`Debug a test file`". Lance _un_ fichier de tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés. Pour changer le fichier de tests à être exécuté, vous devez modifier la ligne appropriée dans le fichier "`.vscode/launch.json`".

- "`Debug current tests file`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Effectue la compîlation au préalable.

- "`Debug current tests file - fast`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Aucune compilation
  n'est effectuée au préalable. Cette launch configuration doit être utilisée lorsque la compilation incrémentale roule (voir la section "`Mode Watch`" plus haut)

# Test et publication de la librairie sur Nexus

En mergant une pull request dans la branche `develop`, un artifact "`-pre.build`" sera créé automatiquement dans Nexus. Vous
pouvez utiliser cette version temporaire de la librairie pour bien la tester dans un réel projet.

Une fois mergée dans `master`, la librairie est définitiement publiée dans Nexus, en utilisant la version spécifiée dans
le `package.json`.

## Artifact Nexus privé, lors du développement

Lors du développement d'une nouvelle fonctionnalité, sur une branche `feature`, il peut parfois être
utile de déployer une version temporaire de la librairie dans Nexus. Ceci permet de bien tester
l'utilisation de la librairie modifiée dans un vrai projet, ou même dans une autre librairie
elle-même par la suite utilisée dans un vrai projet.

Si le code à tester est terminé et prêt à être mis en commun avec d'autres développeurs, la solution
de base, comme spécifiée à la section précédante, est de merger sur `develop`: ceci créera
automatiquement un artifact "`-pre-build`" dans Nexus. Cependant, si le code est encore en développement
et vous désirez éviter de polluer la branche commune `develop` avec du code temporaire, il y a une
solution permettant de générer un artifact "`[votre prénom]-pre-build`" temporaire dans Nexus,
à partir d'une branche `feature` directement:

1. Checkoutez votre branche `feature` dans une branche nommée "`nexus`". Ce nom est
   important et correspond à une entrée dans le `Jenkinsfile`.
2. Une fois sur la branche `nexus`, ajoutez un suffixe "`-[votre prénom]`" à
   la version dans le `package.json`, par exemple: "`5.15.0-roger`".
   Ceci permet d'éviter tout conflit dans Nexus et exprime clairement qu'il
   s'agit d'une version temporaire pour votre développement privé.
3. Commitez et poussez la branche `nexus`.
4. Une fois le build Jenkins terminé, un artifact pour votre version aura été
   déployé dans Nexus. Détruire votre branche dans Bitbucket pour permettre aux
   autres developpeurs d'utiliser cette approche.

**Notez** que, lors du développement dans une branche `feature`, l'utilisation d'un simple
`npm link` local peut souvent être suffisant! Mais cette solution a ses limites, par exemple si
vous désirez tester la librairie modifiée _dans un container Docker_.

# Aide / Contributions

Pour obtenir de l'aide avec cette librairie, vous pouvez poster sur la salle Google Chat [dev-discussions]

Notez que les contributions sous forme de pull requests sont bienvenues.
