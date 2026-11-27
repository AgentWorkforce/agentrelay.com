---
title: Downloads
description: The helper scripts and values templates the install guides use, with their SHA-256 checksums.
---

Step 1 of each install guide downloads every file for its cloud and checks it
against the folder's `SHA256SUMS`. You can also fetch and check a file on its
own:

```sh
curl -fsSLO https://agentrelay.com/self-hosting/files/eks/rds-setup.sh
curl -fsSL https://agentrelay.com/self-hosting/files/eks/SHA256SUMS | grep ' rds-setup.sh$' | shasum -a 256 -c
```

Read a script before you run it. None of them sends anything to Agent Relay,
and none prints a secret.

<!-- files:start -->
## AWS (EKS)

Used by [this guide](/docs/self-hosting/install-eks). Checksums: [`SHA256SUMS`](https://agentrelay.com/self-hosting/files/eks/SHA256SUMS).

| File | SHA-256 |
|---|---|
| [`add-user.sh`](https://agentrelay.com/self-hosting/files/eks/add-user.sh) | `fe4e879e558c0a2c5f7d52a0a1cfd7a48f5df7b4c7a1ace36b8197576e65967e` |
| [`create-iam.sh`](https://agentrelay.com/self-hosting/files/eks/create-iam.sh) | `bbf3283ad181d7d9245f33b4cdf1e2a961d9eb87462b78945bd112909424acd1` |
| [`helm-secrets-prepare.sh`](https://agentrelay.com/self-hosting/files/eks/helm-secrets-prepare.sh) | `f3d790f69e3b544b4c6b2e1dfdf85cef2777f861e9419cfc839524281b118852` |
| [`okta-setup.sh`](https://agentrelay.com/self-hosting/files/eks/okta-setup.sh) | `d2208cdf9011cd06fb103250da1fc9129b69dc6f4119456da531593c2728f1d7` |
| [`opensearch-roles-via-cluster.sh`](https://agentrelay.com/self-hosting/files/eks/opensearch-roles-via-cluster.sh) | `b43755a02f2972ad9f8b405b8f2c3acd20cf1f6d999009f1cbe644f3f4fa90b8` |
| [`rds-session-erase-search.sql`](https://agentrelay.com/self-hosting/files/eks/rds-session-erase-search.sql) | `fcfbca110103573d9f6b168c15f2526c23bf678c18e3b48b21c47ea3b80e3933` |
| [`rds-setup.sh`](https://agentrelay.com/self-hosting/files/eks/rds-setup.sh) | `f5ec7386147341788a0fd454c3bf6202102b976eb36d791f77fda48acc1629e9` |
| [`values.yaml`](https://agentrelay.com/self-hosting/files/eks/values.yaml) | `0ece6666b88d11c42f5eee445d423698a278e87519dd8019706e213b827ade3c` |

## Google Cloud (GKE)

Used by [this guide](/docs/self-hosting/install-gke). Checksums: [`SHA256SUMS`](https://agentrelay.com/self-hosting/files/gke/SHA256SUMS).

| File | SHA-256 |
|---|---|
| [`add-user.sh`](https://agentrelay.com/self-hosting/files/gke/add-user.sh) | `64656f743f1c04b69044f5403bb70914d824179edfb3de596f84e559e7105303` |
| [`cloud-sql-setup.sh`](https://agentrelay.com/self-hosting/files/gke/cloud-sql-setup.sh) | `044f4227a119438cf4bf42b5eb32a2bcac112dcc223dbd4a5bb99df290639a0b` |
| [`create-workload-identity.sh`](https://agentrelay.com/self-hosting/files/gke/create-workload-identity.sh) | `b474bf2ddd9e01ca67c905a1d9652ccaf80b74eb47a56ddffb46071b2fafff7e` |
| [`first-admin.sh`](https://agentrelay.com/self-hosting/files/gke/first-admin.sh) | `7991981ce1bab75fd4385f851f7a1e67bdc9733a51ad3ab9951ca3fbd7c3e2a0` |
| [`helm-secrets-prepare.sh`](https://agentrelay.com/self-hosting/files/gke/helm-secrets-prepare.sh) | `2ae3074e1577fd32f3b10c2d104a239b144454068a37fb0cecdb62e31de3d124` |
| [`managed-values-byo.sh`](https://agentrelay.com/self-hosting/files/gke/managed-values-byo.sh) | `9fa8e76b98949612855498795c36a77557717a905b18d7cfe34dca78aeac56ea` |
| [`okta-setup.sh`](https://agentrelay.com/self-hosting/files/gke/okta-setup.sh) | `d2208cdf9011cd06fb103250da1fc9129b69dc6f4119456da531593c2728f1d7` |
| [`values.yaml`](https://agentrelay.com/self-hosting/files/gke/values.yaml) | `5bc10c1e43428ad2a5b1c6ad30883899d5ea3727da33a76e8c69b59c407aad55` |
<!-- files:end -->

The charts, Terraform and the remaining scripts (the load balancer generator,
the upgrader, the support bundle) come from the public
[AgentWorkforce/infra](https://github.com/AgentWorkforce/infra) repository at
the release tag each guide names.
