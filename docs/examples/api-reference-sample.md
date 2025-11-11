---
title: List invoices with pagination
slug: /api/billing-api/list-invoices
service: billing-api
serviceVersion: 2.1.0
operationId: listInvoices
method: GET
path: /v2/invoices
tags:
  - billing
  - finance
  - critical
healthScore: 92
freshnessScore: 90
coveragePercentage: 95
severity: low
semanticId: billing-api-list-invoices
generatedAt: 2025-11-08T00:00:00.000Z
---

# GET /v2/invoices

:::generated-section{#billing-api-list-invoices data-service="billing-api" data-method="GET" data-path="/v2/invoices"}
## Summary
List invoices with pagination

## Description
Retrieve a paginated list of invoices for the authenticated tenant.

## Endpoint Metadata
- **Service:** billing-api
- **Version:** 2.1.0
- **Method:** `GET`
- **Path:** `/v2/invoices`
- **Authentication:** oauth2 (scopes: billing:read, billing:write, subscriptions:manage)
- **Tags:** billing, finance, critical

## Health
- **Freshness:** 90/100 (low)
- **Coverage:** 95% (19/20)
- **Overall Health:** 92/100

## Parameters
| Name | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| status | query | enum | No | Filter by invoice status |
| customer_id | query | string | No | Filter by customer ID |
| limit | query | integer | No | Number of results per page |
| cursor | query | string | No | Pagination cursor for next page |

## Request
- **Content Type:** `application/json`

## Responses
| Status | Description | Schema |
| --- | --- | --- |
| 200 | Successful response with invoice list | object |

## Errors
- `INVALID_DATE_RANGE` → HTTP 400 — date_from must be earlier than date_to
- `AUTHORIZATION_FAILED` → HTTP 403 (retriable)
- `INTERNAL_ERROR` → HTTP 500

## Pagination
- **Style:** cursor
- **cursor:** `cursor`
- **limit:** `limit`

## Long-running Operations
_No long-running metadata_
:::
