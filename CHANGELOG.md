# Changelog

All notable changes to DocHealth CLI & Dashboard are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-17
### Added
- `dochealth check` CLI command orchestrating manifest loading, analyzer execution, reporting, and JSON/CI output.
- Protocol loader, freshness analyzer, coverage analyzer, and URN resolver wired into CLI and test suites.
- Documentation generator pipeline for API, data catalog, workflow diagrams, and skeleton docs.
- Health reporter that summarizes freshness, coverage, validation signals, and actionable remediation items.
- React/Vite dashboard with health score visualization, stale documentation browser, and coverage gap explorer.
- End-to-end and integration tests covering loader, analyzer, and CLI flows with c8 coverage instrumentation.
- Project documentation set (README, technical architecture, roadmap, usage guide, examples) describing workflows and protocols.

### Changed
- Promoted the CLI and dashboard packages to version `1.0.0` to mark the initial release-ready build.
- Hardened package metadata (repository links, author, homepage, bug tracker) for npm distribution readiness.
- Added MIT LICENSE, release checklist, and explicit changelog to anchor release governance.
- Reviewed and synced documentation to reflect the stable MVP scope and workflows.

### Fixed
- Resolved outstanding release polish tasks discovered during the CMOS backlog review (metadata, licensing, and documentation gaps).

