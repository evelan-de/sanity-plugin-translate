<!-- markdownlint-disable --><!-- textlint-disable -->

# 📓 Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.12.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.11.0...v1.12.0) (2025-07-07)

### Features

- split utils into focused modules for improved maintainability ([1bf4026](https://github.com/evelan-de/sanity-plugin-translate/commit/1bf40261db2168a8be73462e5b41fd2cbecd42a4))

### Bug Fixes

- add unknownBlockStyle ([e557e19](https://github.com/evelan-de/sanity-plugin-translate/commit/e557e193f4126a0aaa0b5e66bdc0979a196d8b41))
- block content translation processing ([a5a239e](https://github.com/evelan-de/sanity-plugin-translate/commit/a5a239e9729311e1673573620f49fd9eceeb0eec))

## [1.11.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.10.2...v1.11.0) (2025-06-27)

### Features

- add support for translating block content ([33b3a9c](https://github.com/evelan-de/sanity-plugin-translate/commit/33b3a9c244add2a61f264f09ea087d10f4241253))
- add teaser field to translatable fields in translation service ([e521b81](https://github.com/evelan-de/sanity-plugin-translate/commit/e521b811882fec9e63dacf71cc8c1e22a4c181b7))

## [1.10.2](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.10.1...v1.10.2) (2025-06-17)

### Bug Fixes

- zod restrictive version ([3c292e5](https://github.com/evelan-de/sanity-plugin-translate/commit/3c292e574dc9db09b21696aca39475d80de680bf))

## [1.10.1](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.10.0...v1.10.1) (2025-06-17)

### Bug Fixes

- added react 19 as peerDependency ([15707ca](https://github.com/evelan-de/sanity-plugin-translate/commit/15707ca0a92a5b961e758ce27fbb3f1051243f90))

## [1.10.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.9.3...v1.10.0) (2024-12-17)

### Features

- add 'isrequirederrormessage' to translatable field keys in translation service ([46fabe4](https://github.com/evelan-de/sanity-plugin-translate/commit/46fabe45185fcbe07873380b39a79403a0faae4d))

## [1.9.3](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.9.2...v1.9.3) (2024-12-16)

### Bug Fixes

- make \_strengthenonpublish and \_weak properties optional and nullable in translation api types ([f6d3292](https://github.com/evelan-de/sanity-plugin-translate/commit/f6d32929eec634d30848172682122b9dd5f495eb))

## [1.9.2](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.9.1...v1.9.2) (2024-12-06)

### Bug Fixes

- handle missing document id, type, data, and language gracefully in translation service ([23c3df0](https://github.com/evelan-de/sanity-plugin-translate/commit/23c3df0f00f1ac62513754d22f30cf8f74d5aae3))

## [1.9.1](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.9.0...v1.9.1) (2024-11-29)

### Bug Fixes

- create a deep copy of the original document to prevent mutations on the loop ([f7def60](https://github.com/evelan-de/sanity-plugin-translate/commit/f7def601296674e8cc2785ebabb6dd07b3d1d1d0))
- improve media object replacement logic in translation service ([332bf19](https://github.com/evelan-de/sanity-plugin-translate/commit/332bf194239a45ccf248dbc9c9798da1862968aa))
- update translations for syncing translated document media ([f99dd06](https://github.com/evelan-de/sanity-plugin-translate/commit/f99dd068316fb265da84797be8e253547482cffe))

## [1.9.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.8.0...v1.9.0) (2024-11-29)

### Features

- update translations for syncing translated document media ([3291d4a](https://github.com/evelan-de/sanity-plugin-translate/commit/3291d4a891732b1bc7dd89fabf2ab052a552ded3))

## [1.8.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.7.1...v1.8.0) (2024-11-25)

### Features

- add support for syncing translated document media ([fe41ef8](https://github.com/evelan-de/sanity-plugin-translate/commit/fe41ef8720b403d5ff3ce56ac1ef5fb72aa2f336))
- add translations for syncing translated document media ([dc6c6a6](https://github.com/evelan-de/sanity-plugin-translate/commit/dc6c6a6260ab9327e9d154bc280a1ba36a998ff1))
- update package-lock.json and package.json ([849fcfc](https://github.com/evelan-de/sanity-plugin-translate/commit/849fcfc4a70ef7ffd3975e15e411929749bcb224))

## [1.7.1](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.7.0...v1.7.1) (2024-11-14)

### Bug Fixes

- fixes issue with published and unpublished translated documents ([3e4e556](https://github.com/evelan-de/sanity-plugin-translate/commit/3e4e556c63d1bac6bb2d178b7d99788d46d8cd6a))

## [1.7.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.6.0...v1.7.0) (2024-11-14)

### Features

- adds support for unpublished documents ([675ca21](https://github.com/evelan-de/sanity-plugin-translate/commit/675ca218cf390be5420d9a1bd2ac0a293a187cb4))

## [1.6.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.5.0...v1.6.0) (2024-11-08)

### Features

- add sync documents action to API and plugin ([96d0ae6](https://github.com/evelan-de/sanity-plugin-translate/commit/96d0ae642b36824a69c113d786433992f4bc103d))

## [1.5.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.4.0...v1.5.0) (2024-10-31)

### Features

- applies changes to new version ([ad83942](https://github.com/evelan-de/sanity-plugin-translate/commit/ad83942be89f1fac678b0badff6269475c196826))

## [1.4.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.3.0...v1.4.0) (2024-10-07)

### Features

- add new headers to translatableFieldKeys ([e0ab7af](https://github.com/evelan-de/sanity-plugin-translate/commit/e0ab7afc6d1205716ecb8d365c01b5797baa25fb))

## [1.3.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.2.0...v1.3.0) (2024-09-25)

### Features

- updates order of translateableFieldKeys ([5dbfe6c](https://github.com/evelan-de/sanity-plugin-translate/commit/5dbfe6c4bef9f273bac6c6d5d6b5c63fe28d90cf))

## [1.2.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.1.0...v1.2.0) (2024-09-19)

### Features

- add types export and update translation service ([4e5cf39](https://github.com/evelan-de/sanity-plugin-translate/commit/4e5cf39ed07fec361032714b6d75fc36404cbb10))

## [1.1.0](https://github.com/evelan-de/sanity-plugin-translate/compare/v1.0.0...v1.1.0) (2024-09-18)

### Features

- creates class based instance of the translation service ([598692e](https://github.com/evelan-de/sanity-plugin-translate/commit/598692e97b8a8c827f46575d463844c06faf71a0))

## 1.0.0 (2024-09-17)

### Features

- adds document action components that calls on the project api routes ([692c5b9](https://github.com/evelan-de/sanity-plugin-translate/commit/692c5b93b4dda09dd5ad4f0dbd9c77aae3bd93f7))
- adds the translation services and also installs deepl-node as dependency ([8b39b70](https://github.com/evelan-de/sanity-plugin-translate/commit/8b39b7007fc9a1e4b301836f2555b94db4bc9f0d))
- first Iteration of the translate plugin ([e50d8f3](https://github.com/evelan-de/sanity-plugin-translate/commit/e50d8f363b278cfcb13b405bd47bffd06fc862b1))
- includes exporting of translate services on this plugin and installs peer dependencies ([9cca07a](https://github.com/evelan-de/sanity-plugin-translate/commit/9cca07a2fbdd71a6aa08733c8f9075382785133e))
- updates lint rules ([cc25000](https://github.com/evelan-de/sanity-plugin-translate/commit/cc2500043735722844b614258f52d00c66da8e19))

### Bug Fixes

- adds package.lock after changes in package.json ([30b722c](https://github.com/evelan-de/sanity-plugin-translate/commit/30b722c4c3bdf78ea7ff8ad6b532683232a0b516))
- attempts to copy package.json from media plugin ([e58176c](https://github.com/evelan-de/sanity-plugin-translate/commit/e58176cdee0a0d9c66b7dd6fec8fccee8964d005))
- fixes remote repository error ([b8c5ff4](https://github.com/evelan-de/sanity-plugin-translate/commit/b8c5ff456a1c98649a66d9d119f8f5ed2a689df5))
