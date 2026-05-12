---
title: Template Response Restructure
date: 2026-05-12
status: ready-for-planning
---

# Template Response Restructure

## Problem

The current template response shape has two issues:

1. **Type-specific fields are scattered** — `email`, `doc`, and `comEmail` appear as separate optional fields depending on category. Consumers must know which field to check per category; adding a new category requires another top-level field.
2. **Base template is underrepresented** — only `baseTemplateId` (a string) is returned. Consumers need a second request to get the base template's content or schema.

## Goal

Return a consistent, predictable shape from all template-returning endpoints regardless of category, with the full base template object included.

## Desired Response Shape

```json
{
  "data": {
    "template": {
      "id": "uuid",
      "category": "EMAIL_INTERNAL",
      "name": "appointment_confirmation",
      "isActive": true,
      "schema": { "patientName": "string", "date": "string" },
      "content": "<p>{{patientName}}</p>",
      "description": "Confirmation email",
      "metadata": {
        "subject": "Your appointment",
        "fromEmail": "no-reply@hsm.org",
        "fromName": "HSM",
        "cc": [],
        "bcc": [],
        "hasAttachment": false
      }
    },
    "baseTemplate": {
      "id": "uuid",
      "category": "BASE",
      "name": "email_layout",
      "isActive": true,
      "schema": { "body": "string", "title": "string" },
      "content": "<html>{{body}}</html>",
      "description": "Base email layout",
      "metadata": null
    }
  }
}
```

For a BASE-category template (no parent):

```json
{
  "data": {
    "template": {
      "id": "uuid",
      "category": "BASE",
      "name": "email_layout",
      "isActive": true,
      "schema": { "body": "string" },
      "content": "<html>{{body}}</html>",
      "description": null,
      "metadata": null
    },
    "baseTemplate": null
  }
}
```

## Behavioral Rules

| Category | `template.metadata` | `baseTemplate` |
|---|---|---|
| BASE | `null` | `null` |
| EMAIL_INTERNAL / EMAIL_EXTERNAL | `EmailTemplateFieldsDto` | full object |
| DOCS | `DocTemplateFieldsDto` | full object |

- `metadata` is always present in the response: typed object or `null`. Never absent.
- `baseTemplate` is always present: full object or `null`. Never absent.
- `baseTemplate` itself also follows this shape (with `metadata: null` since BASE templates never have channel-specific data).

## Affected Endpoints

| Endpoint | Change |
|---|---|
| `GET /templates/:identifier` | New response shape |
| `POST /templates` | New response shape |
| `PUT /templates/:id` | New response shape |
| `POST /templates/validate` | Review for compatibility; response shape (`valid`, `issues`, `templateId`) unchanged |
| `DELETE /templates/:id` | Not touched — returns `{ id }` |

## Schema

`schema` on any template (including BASE) describes the variables expected in that template's `content`. No shape is enforced — BASE templates are free to name their variables anything. This is unchanged behavior.

## Out of Scope

- Database entity or migration changes
- Delete endpoint response
- Validate endpoint response shape
- Any new template categories or fields

## Seeds

Database seeds must be updated to align with the new DTO and service mapping. Verify seed templates produce valid responses under the new shape.
