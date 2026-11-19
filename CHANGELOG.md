# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-11-19

### Added
- **adapter**: flag unexpanded replies in serialized threads (#20) (9ed71bf)

### Maintenance
- **agents**: resolve retro findings on navigation and guardrails (1971ca4)

## [0.1.3] - 2026-11-17

### Fixed
- **ux**: defer unsupported-layout warning to user trigger (#25) (af6bbdf)
- **ui**: show error feedback when extraction or clipboard fails (#24) (245a540)
- **adapter**: scope thread extraction to active modal overlay (#23) (794925d)
- **core**: preserve human replies under pruned bot comments (#22) (d73da4e)

### Maintenance
- **deps**: update test and lint toolchain to resolve audit advisories (#26) (d51ebea)

## [0.1.2] - 2026-11-17

### Added
- **adapter**: support rich text formatting in post and comment bodies (#21) (c184a11)

### Fixed
- **adapter**: preserve paragraph breaks inside nested content containers (#21) (1e3a623)

### Maintenance
- codify retro findings into fixture, guardrail, and steering docs (af3c2f6)

## [0.1.1] - 2026-11-16

### Added
- **release**: unify release automation and changelog generation modeled after TrioA (#13) (b802722)

### Fixed
- **ui**: restrict Thread Action to thread posts (#19) (3323329)

## [0.1.0] - 2026-11-16

### Added
- **release**: automate SemVer changelog generation and add CHANGELOG.md (#13) (`dbcc352`)
- **release**: add automated release workflow for tags (#17) (`5e4583a`)
- **release**: implement automated release packaging and verification seam (#16) (`0f6e286`)
- **branding**: add extension icons and register in manifest (#14) (`fa1582f`)
- **governance**: add license, contributing guide, and issue templates (#15) (`f30e3fb`)
- **adapter**: scope partial load detection to comment tree with tolerance margin (#12) (`5658ba2`)
- **adapter**: extract comment media and meme image urls (#11) (`4c84417`)
- **ui**: relocate action button beside share in action bar (#9) (`8c46d9f`)
- **core**: retain full comment tree depth by default (#10) (`cd20cee`)
- implement SPA lifecycle manager and guarded keyboard shortcut (#7) (`7975621`)
- implement native action bar injection and micro-feedback (#6) (`de8c65e`)
- implement modern reddit dom extraction adapter (#5) (`9fc086d`)
- implement core filter pipeline for noise pruning and depth capping (#4) (`37c2787`)
- implement canonical domain types and token-dense markdown serializer (#3) (`2e0ed23`)
- scaffold Manifest V3 toolchain and three-layer architecture (#2) (`25c8410`)

### Fixed
- **ui,adapter**: use native primary text color and disable partial load detection (`42e2ad6`)
- **ui,adapter**: inherit action bar spacing and ignore comment hovercard loaders (#8) (`33e053f`)

### Changed
- address standards and spec review findings (#8) (`76cf753`)
- resolve whole-spec review findings and harden extension (#1) (`36ca2aa`)
- address code review findings on side-effects and duplicate parsing (#2) (`4f26417`)

### Documentation
- **readme**: add public launch readme and visual onboarding (#18) (`6fe0ba9`)
- **agents**: mandate --body-file for issue comments to prevent shell escaping bugs (`e08e4ac`)
- initialize repository documentation and agents setup (`aded73d`)

### Maintenance
- **changelog**: record automated changelog generation commit in CHANGELOG.md (`32cc983`)
- **release**: clean up root distribution zip in afterAll hook (#16) (`6fe5058`)
- **release**: extend timeout for distribution packaging integration test (#16) (`247d252`)
- ignore .worktrees/ directory in eslint config (`c2192e9`)
- codify retro findings into standards, mechanical guardrails, and real fixtures (`07dfb8c`)
- ignore release zip archives (`a510659`)
- ignore .worktrees/ directory (`c984302`)
- codify spec retro findings into standards and schema/echo guardrails (`241b67a`)
- codify retro findings into coding standards, selector guardrail, and pre-push hook (`930b8db`)
- codify retro findings into guardrails, standards, and docs (`5123e51`)
- codify retro findings into coding standards and add check script (`bbf41d5`)
- add .agents and .scratch to .gitignore (`a111313`)
- configure ESLint, gitattributes, spec navigation pointer, and CI lint step (`37ee733`)
- add GitHub Actions workflow, core tsconfig guardrail, and coding standards (`de94a3f`)
