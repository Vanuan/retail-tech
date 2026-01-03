# Repositories

This module defines the interfaces for data access and persistence.

## Contents

- **interfaces.ts**: `IProductRepository`, `IFixtureRepository`, `IPlanogramRepository`.
- **providers.ts**: `IAssetProvider` for resolving sprite and mask URLs.
- **facade.ts**: `IDataAccessLayer` - a unified entry point for all data operations.

## Architecture

By using interfaces here, the VST library remains agnostic of the actual persistence mechanism (SQL, NoSQL, LocalStorage, or Mock/Memory during testing).
