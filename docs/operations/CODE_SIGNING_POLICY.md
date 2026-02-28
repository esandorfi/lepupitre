# Code Signing Policy

This policy is published for release trust and SignPath Foundation compliance.

Free code signing provided by SignPath.io, certificate by SignPath Foundation.

## Roles
- Committers/reviewers: [Project governance](../PROJECT_GOVERNANCE.md#signing-roles)
- Approver(s): [Project governance](../PROJECT_GOVERNANCE.md#signing-roles)

## Approval process
- Every production signing request must be manually approved by an approver.
- Automated builds can submit signing requests, but release trust is only valid after manual approval.

## Privacy reference
- [Privacy Policy](../../PRIVACY.md)
- If a dedicated privacy policy is unavailable, the following sentence applies:
  - "This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it."

## Scope and restrictions
- Signatures are used only for Le Pupitre release artifacts.
- Unsigned artifacts must never be uploaded as trusted production release assets when trust gates are enabled.
