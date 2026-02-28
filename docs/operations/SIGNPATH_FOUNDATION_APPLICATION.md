# SignPath Foundation Application Checklist

Status: draft  
Owner: Emmanuel Sandorfi

Use this checklist to prepare and submit the official SignPath Foundation application.

## 1) Eligibility pre-check
- [ ] Project is public and actively maintained.
- [ ] License is OSI-approved (Apache-2.0).
- [ ] No commercial dual-licensing or restricted source terms for shipped components.
- [ ] Maintainer MFA policy is in place.

## 2) Required public policy links
- [ ] Home page includes a section named **Code signing policy**:
  - [README.md#code-signing-policy](../../README.md#code-signing-policy)
- [ ] Dedicated policy page:
  - [docs/operations/CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md)
- [ ] Privacy policy reference:
  - [PRIVACY.md](../../PRIVACY.md)
- [ ] Roles and maintainers:
  - [docs/PROJECT_GOVERNANCE.md](../PROJECT_GOVERNANCE.md)

## 3) Organization and approver setup
- [ ] Define SignPath users/groups:
  - Authors
  - Reviewers
  - Approvers
- [ ] Require manual approval for every production signing request.
- [ ] Restrict trusted submitters to CI identities only.

## 4) CI readiness (already prepared)
- [ ] Release workflow contains trust gate preflight:
  - `.github/workflows/release-packaging.yml`
  - `scripts/check-release-signing.sh`
- [ ] Trust toggles are documented:
  - `LEPUPITRE_REQUIRE_WINDOWS_SIGNING`
  - `LEPUPITRE_WINDOWS_SIGNING_PROVIDER`
  - `LEPUPITRE_REQUIRE_MACOS_NOTARIZATION`

## 5) SignPath submission form data (fill before submit)
- Project name: `Le Pupitre`
- Repository URL: `https://github.com/esandorfi/lepupitre`
- Maintainer contact: `Emmanuel Sandorfi`
- License: `Apache-2.0`
- Code signing policy URL:
  - `https://github.com/esandorfi/lepupitre/blob/main/docs/operations/CODE_SIGNING_POLICY.md`
- Privacy policy URL:
  - `https://github.com/esandorfi/lepupitre/blob/main/PRIVACY.md`
- Governance/roles URL:
  - `https://github.com/esandorfi/lepupitre/blob/main/docs/PROJECT_GOVERNANCE.md`

## 6) Official submission
- [ ] Download and complete the current official application form from SignPath:
  - [SignPath apply page](https://signpath.org/apply)
- [ ] Submit the form and track communication thread.
- [ ] Record SignPath decision and required follow-up actions in this file.

## 7) Post-approval actions
- [ ] Add required SignPath secrets in GitHub repository settings.
- [ ] Set variables:
  - `LEPUPITRE_REQUIRE_WINDOWS_SIGNING=true`
  - `LEPUPITRE_WINDOWS_SIGNING_PROVIDER=signpath`
- [ ] Run `Release Packaging` workflow on a pre-release tag and verify signatures.
- [ ] Promote to production release after successful validation.
