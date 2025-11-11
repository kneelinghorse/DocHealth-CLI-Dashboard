---
title: user_events
slug: /data/user-events
dataset: user_events
datasetType: fact-table
owner: analytics-team
tags:
  - events
  - user-behavior
  - analytics
  - pii-potential
healthScore: 100
freshnessScore: 99
coveragePercentage: 100
severity: fresh
semanticId: dataset-user-events
piiFieldCount: 0
rowCountEstimate: 15432000
generatedAt: '2025-11-11T22:31:09.458Z'

---

# Dataset: user\_events

:::generated-section{#dataset-user-events data-dataset="user-events" data-type="fact-table" data-pii="false"}
## Overview {#dataset-user-events-overview}

User activity events for analytics and personalization

- **Type:** fact-table
- **Status:** active
- **Created:** 2025-09-01T00:00:00Z
- **Refresh:** hourly (expected by 08:00Z)
- **Retention:** 2-years
- **Criticality:** high
- **PII Fields:** None detected

## Health {#dataset-user-events-health}

- **Freshness:** 99/100 (fresh)
- **Coverage:** 100% (16/16)
- **Overall Health:** 100/100

## Schema {#dataset-user-events-schema}

| Field | Type | Required | PII | Description |
| --- | --- | --- | --- | --- |
| event\_id | string | Yes | No | Unique identifier for each event |
| user\_id | string | Yes | No | User identifier (anonymized) |
| session\_id | string | No | No | Session identifier for grouping events |
| event\_type | string | Yes | No | Type of event (page\_view, click, purchase, etc.) |
| event\_timestamp | timestamp | Yes | No | When the event occurred |
| page\_url | string | No | No | URL of the page where event occurred |
| referrer\_url | string | No | No | Referring URL |
| device\_type | string | No | No | Device type (desktop, mobile, tablet) |
| browser | string | No | No | Browser name and version |
| geo\_country | string | No | No | Geographic country code |
| geo\_city | string | No | No | Geographic city name |
| utm\_source | string | No | No | UTM source for campaign tracking |
| utm\_medium | string | No | No | UTM medium for campaign tracking |
| utm\_campaign | string | No | No | UTM campaign for campaign tracking |
| revenue | decimal | No | No | Revenue amount for purchase events |
| items\_purchased | integer | No | No | Number of items purchased |

## Keys {#dataset-user-events-keys}

- **Primary Key:** event\_id
- **Unique Constraints:** event\_id
- **Foreign Keys:**
  - `user_id` → dim\_users.id
- **Partitioning:** event\_timestamp (daily)

## Lineage {#dataset-user-events-lineage}

### Sources

- **web-analytics-collector** (service) — Web analytics collection service
- **mobile-sdk** (service) — Mobile app analytics SDK

### Consumers

- **user-segmentation-ml** (model) — ML model for user segmentation
- **churn-prediction** (model) — Churn prediction model
- **executive-dashboard** (dashboard) — Executive analytics dashboard
- **marketing-platform** (external) — Third-party marketing platform

## Catalog {#dataset-user-events-catalog}

- **Owner:** analytics-team
- **Steward:** data-governance@company.com
- **Tags:** events, user-behavior, analytics, pii-potential
- **Domain:** product-analytics
- **Dataset Type:** fact-table
- **Criticality:** high
- **Last Reviewed:** 2025-10-15T00:00:00Z
- **Review Cycle:** Every 90 days

## Governance {#dataset-user-events-governance}

- **Classification:** internal
- **Legal Basis:** GDPR
- **Data Subject Rights:** Required
- **Storage:** aws-s3 (eu-west-1)
- **Encrypted at Rest:** Yes
- **Encrypted In Transit:** Yes
- **Access Control:** Role-based access enforced
- **Row-level Security:** Enabled
- **Column Masking:** user\_id

## Operations {#dataset-user-events-operations}

- **Refresh Schedule:** hourly (expected by 08:00Z)
- **Retention:** 2-years
- **Latency SLA:** 15 minutes
- **Backfill:** Enabled (max lookback 90 days)

## Data Quality {#dataset-user-events-quality}

- **Last Refresh:** 2025-11-10T18:00:00Z
- **Row Count (est.):** 15,432,000
- **Completeness:** 78.0%
- **Accuracy:** 95.0%
- **Highest Null Rates:** revenue 92%, items\_purchased 92%, utm\_campaign 72%, utm\_source 68%, utm\_medium 68%
- **Consistency Checks:**
  - event\_timestamp\_not\_null (100% pass)
  - event\_id\_unique (100% pass)
  - user\_id\_not\_null (100% pass)
:::
