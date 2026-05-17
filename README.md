# daw-core

Core utilities for browser and Node.js digital audio workstation projects.

## Install

```sh
pnpm add daw-core
```

## Usage

```ts
import { secondsToSamples, beatsToSeconds } from "daw-core";

const samples = secondsToSamples(1.5, 48_000);
const seconds = beatsToSeconds(4, 120);
```

The package publishes both ESM and CommonJS builds with TypeScript declarations.

## Scripts

```sh
pnpm build
pnpm test
pnpm typecheck
```
