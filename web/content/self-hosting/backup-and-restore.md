---
title: Backup and restore
description: What to back up in a self-hosted install, how to take a consistent backup on AWS or Google Cloud, and how to prove a restore works.
---

A backup is only useful if every part of it comes from the same moment and you
have restored it at least once. This page says what to capture, and how.

## What a backup covers

| Data | AWS | Google Cloud |
|---|---|---|
| PostgreSQL: `relaycontrol`, `relaycast`, `hoopdb` | RDS snapshot | Cloud SQL backup |
| Session files | the S3 bucket (versioned) | the Cloud Storage bucket (versioned) |
| Relaycast uploads volume | EBS snapshot of its PersistentVolume | Persistent disk snapshot of its PersistentVolume |
| Keys | `~/.agent-relay-install` in your secret store | the same |
| Configuration | `values.yaml`, `settings.sh`, Terraform state | the same, plus `managed-values.json` |

**The keys matter most.** Data encrypted with `selfhost-encryption-key` and
`SUMMARY_MASTER_KEYS` can't be read without them, even from a perfect database
backup. Keep a copy of `~/.agent-relay-install` in your secret store from the
day you install.

<!-- agent
Never read, print or copy files under ~/.agent-relay-install. ASK THE HUMAN to
confirm that folder is in their secret store.
-->

## Rules

- **Capture everything together.** Restore every store from the same backup;
  never mix a database from one moment with files from another.
- **Stop writes while you capture,** for a consistent backup. That is a short
  outage: schedule it.
- **Drill into separate resources.** A restore test never touches production:
  use a new database instance, bucket, namespace and Helm release, with no
  production DNS.
- **No migrations during capture or restore.** Don't upgrade until the backup
  is done.
- Helm rollback, uninstall and migration retries are not recovery. See
  [Upgrades](/docs/self-hosting/upgrades#if-an-upgrade-fails).

## Everyday protection

These run by themselves once switched on, and cover most mistakes:

- **Database:** automated daily backups with point-in-time recovery. The GKE
  Terraform turns them on (14 kept, 7 days of logs). On RDS, set a backup
  retention period on the instance.
- **Session files:** bucket versioning, which both Terraform setups and the
  bring-your-own specs turn on, with noncurrent versions kept for 30 days.

## A consistent backup

**1. Record the release and stop writes:**

```sh
helm -n agent-relay history agent-relay | tail -1
kubectl -n agent-relay get deploy,statefulset -o json > writers-before.json
kubectl -n agent-relay scale deploy,statefulset --all --replicas=0
```

**2. Capture.** On AWS:

```sh
aws rds create-db-snapshot --db-instance-identifier <rds instance id> \
  --db-snapshot-identifier agent-relay-$(date -u +%Y%m%dt%H%M%Sz)
aws rds wait db-snapshot-available --db-snapshot-identifier <that id>
```

On Google Cloud:

```sh
gcloud sql backups create --instance "$CLOUD_SQL_INSTANCE"
```

Then snapshot the Relaycast volume (`kubectl -n agent-relay get pvc` names it)
with your provider's disk snapshot, and note the bucket's state (versioning
keeps every object; for a separate copy, sync it to a second bucket).

**3. Resume:**

```sh
kubectl -n agent-relay scale deploy,statefulset --all --replicas=1
kubectl -n agent-relay rollout status deploy --timeout=10m
```

Every component in this install runs one replica, except the read API if you
scaled it up: restore its count from `writers-before.json`.

**Done when:** the snapshots show as available, every pod is ready again, and
the install's smoke checks pass.

The EKS upgrader takes and waits for an RDS snapshot by itself before every
`--apply`.

<!-- agent
Scaling to zero is an outage: ASK THE HUMAN to approve the window before step 1.
-->

## Restore drill

Prove the backup works, at least before your first upgrade and then regularly:

1. Restore the database snapshot to a **new** instance, the bucket to a **new**
   bucket, and the volume snapshot to a new PersistentVolumeClaim.
2. Install the **same release** into a new namespace and release name, with a
   copy of `values.yaml` pointed at the restored copies, the same keys, and no
   production DNS or load balancer.
3. Turn off migrations in that copy, so the install can't change the restored
   data.
4. Check: pods run on the recorded image digests, known sessions list, open and
   are found by search, and messaging works between two agents.

Measure how long it took: that is your real recovery time.

The scripted capture and drill tools in the infra repository
(`charts/agent-relay/scripts/gcp-recovery-backup.sh` and its drill scripts) were
built for an earlier Google Cloud profile. They haven't been requalified for the
2026.11 profiles, so follow the steps above and [ask us](/docs/self-hosting/support)
before relying on them.

## After a failed upgrade

Prefer side by side: keep the failed install as evidence, restore the
pre-upgrade backup into new resources, install the previous release on it,
check it, then move traffic. Never mix stores from different backups.
