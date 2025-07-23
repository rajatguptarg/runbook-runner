# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

-   **Containerized Execution Environments**: Users can now define custom execution environments using Dockerfiles. Command blocks can be run within these containerized environments, ensuring consistent and isolated executions.
    -   Added `ExecutionEnvironment` model and corresponding CRUD APIs under `/environments`.
    -   Runbooks can now be associated with an execution environment.
    -   The execution worker now uses the `docker` SDK to build images and run commands in containers.
-   **Timer Block Functionality**: The "Timer" block is now fully executable. When included in a runbook, it will pause execution for the specified duration before proceeding to the next step.

### Fixed

-   Corrected a bug in the execution service where conditional blocks would fail if an execution environment was configured.
