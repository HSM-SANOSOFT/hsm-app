# CLAUDE.md — `@hsm/common`

Shared DTOs, interfaces, enums, errors, types. **Source-only** package (`main` points at `src/index.ts`) — no build step needed for consumers; TypeScript path mapping resolves it directly.

## Import via subpaths

The root `src/index.ts` is intentionally empty. Always import from a subpath:

```ts
import { SuccessResponseDto } from '@hsm/common/dtos';
import { RolesEnum } from '@hsm/common/enums';
import type { ISignedUser } from '@hsm/common/interfaces';
import type { RolesType } from '@hsm/common/types';
```

Each subdir has its own `index.ts` barrel. Don't add re-exports to the root index — keeps tree-shaking and tsserver navigation clean.

## Layout

```
src/
├── dtos/         common-request, common-response, core-* (coms/docs/templates/user), security-auth, storage
├── enums/        core-* enums, security-* enums, common-response, administrative-scheduling-availability
├── errors/       (currently empty barrel — populate here, don't scatter error classes)
├── events/       cross-app event payload shapes
├── interfaces/   common-response, security-auth (ISignedUser, ITokens, …)
├── maps/
├── models/
├── types/        common-utils, core-coms, security-roles
└── __extra/      sandbox / scratch — don't import from app code
```

## Conventions

- File names follow `<domain>-<feature>.<kind>.ts` (e.g. `core-coms.dto.ts`, `security-auth.interface.ts`). Match this when adding files.
- Class-validator + class-transformer decorators live on DTOs; the API's global `ValidationPipe` relies on them.
- Swagger decorators (`@ApiProperty`) are fine here — `@nestjs/swagger` is a runtime dep of the package.
- No NestJS providers/modules in this package. Pure shapes only.

## When adding a new shape

1. Drop the file in the matching subdir.
2. Add the export to that subdir's `index.ts`.
3. Use it via `@hsm/common/<subdir>` — never deep-import the file.
