---
title: Logistics Orchestration Pipeline
slug: /workflows/logistics-pipeline
workflowId: logistics-pipeline
workflowName: Logistics Orchestration Pipeline
version: 4.0.0
owner: orchestration-team
tags:
  - logistics
  - demo
  - workflow
semanticId: workflow-logistics-pipeline
generatedAt: '2025-11-11T23:55:41.169Z'

---

# Workflow: Logistics Orchestration Pipeline

:::generated-section{#workflow-logistics-pipeline data-workflow="logistics-pipeline" data-steps="60" data-has-cycle="false"}
## Overview {#workflow-logistics-pipeline-overview}

Synthetic workflow to demonstrate 50+ node rendering

- **Version:** 4.0.0
- **Owner:** orchestration-team
- **Tags:** logistics, demo, workflow
- **Criticality:** medium

## Diagram {#workflow-logistics-pipeline-diagram}

```mermaid
%%{init: {"layout": "elk", "elk": {"nodePlacementStrategy": "NETWORK_SIMPLEX", "mergeEdges": true}}}%%
graph TD
classDef startNode fill:#0f62fe,stroke:#0f62fe,color:#fff;font-weight:bold;
classDef processNode fill:#08BDBA,stroke:#046c63,color:#fff;
classDef humanNode fill:#f6c945,stroke:#b38b00,color:#1b1b1b;
classDef decisionNode fill:#ffa8a8,stroke:#d15454,color:#1b1b1b;
classDef eventNode fill:#a66bff,stroke:#5f249f,color:#fff;
classDef endNode fill:#555,stroke:#222,color:#fff;
classDef defaultNode fill:#dcdcdc,stroke:#666,color:#1b1b1b;
  wf_node_0["Workflow Node 0\nAuto-generated workflow node 0\n(service)"]:::processNode
  wf_node_1["Workflow Node 1\nAuto-generated workflow node 1\n(event)"]:::eventNode
  wf_node_2["Workflow Node 2\nAuto-generated workflow node 2\n(human)"]:::humanNode
  wf_node_3["Workflow Node 3\nAuto-generated workflow node 3\n(decision)"]:::decisionNode
  wf_node_4["Workflow Node 4\nAuto-generated workflow node 4\n(service)"]:::processNode
  wf_node_5["Workflow Node 5\nAuto-generated workflow node 5\n(event)"]:::eventNode
  wf_node_6["Workflow Node 6\nAuto-generated workflow node 6\n(human)"]:::humanNode
  wf_node_7["Workflow Node 7\nAuto-generated workflow node 7\n(decision)"]:::decisionNode
  wf_node_8["Workflow Node 8\nAuto-generated workflow node 8\n(service)"]:::processNode
  wf_node_9["Workflow Node 9\nAuto-generated workflow node 9\n(event)"]:::eventNode
  wf_node_10["Workflow Node 10\nAuto-generated workflow node 10\n(human)"]:::humanNode
  wf_node_11["Workflow Node 11\nAuto-generated workflow node 11\n(decision)"]:::decisionNode
  wf_node_12["Workflow Node 12\nAuto-generated workflow node 12\n(service)"]:::processNode
  wf_node_13["Workflow Node 13\nAuto-generated workflow node 13\n(event)"]:::eventNode
  wf_node_14["Workflow Node 14\nAuto-generated workflow node 14\n(human)"]:::humanNode
  wf_node_15["Workflow Node 15\nAuto-generated workflow node 15\n(decision)"]:::decisionNode
  wf_node_16["Workflow Node 16\nAuto-generated workflow node 16\n(service)"]:::processNode
  wf_node_17["Workflow Node 17\nAuto-generated workflow node 17\n(event)"]:::eventNode
  wf_node_18["Workflow Node 18\nAuto-generated workflow node 18\n(human)"]:::humanNode
  wf_node_19["Workflow Node 19\nAuto-generated workflow node 19\n(decision)"]:::decisionNode
  wf_node_20["Workflow Node 20\nAuto-generated workflow node 20\n(service)"]:::processNode
  wf_node_21["Workflow Node 21\nAuto-generated workflow node 21\n(event)"]:::eventNode
  wf_node_22["Workflow Node 22\nAuto-generated workflow node 22\n(human)"]:::humanNode
  wf_node_23["Workflow Node 23\nAuto-generated workflow node 23\n(decision)"]:::decisionNode
  wf_node_24["Workflow Node 24\nAuto-generated workflow node 24\n(service)"]:::processNode
  wf_node_25["Workflow Node 25\nAuto-generated workflow node 25\n(event)"]:::eventNode
  wf_node_26["Workflow Node 26\nAuto-generated workflow node 26\n(human)"]:::humanNode
  wf_node_27["Workflow Node 27\nAuto-generated workflow node 27\n(decision)"]:::decisionNode
  wf_node_28["Workflow Node 28\nAuto-generated workflow node 28\n(service)"]:::processNode
  wf_node_29["Workflow Node 29\nAuto-generated workflow node 29\n(event)"]:::eventNode
  wf_node_30["Workflow Node 30\nAuto-generated workflow node 30\n(human)"]:::humanNode
  wf_node_31["Workflow Node 31\nAuto-generated workflow node 31\n(decision)"]:::decisionNode
  wf_node_32["Workflow Node 32\nAuto-generated workflow node 32\n(service)"]:::processNode
  wf_node_33["Workflow Node 33\nAuto-generated workflow node 33\n(event)"]:::eventNode
  wf_node_34["Workflow Node 34\nAuto-generated workflow node 34\n(human)"]:::humanNode
  wf_node_35["Workflow Node 35\nAuto-generated workflow node 35\n(decision)"]:::decisionNode
  wf_node_36["Workflow Node 36\nAuto-generated workflow node 36\n(service)"]:::processNode
  wf_node_37["Workflow Node 37\nAuto-generated workflow node 37\n(event)"]:::eventNode
  wf_node_38["Workflow Node 38\nAuto-generated workflow node 38\n(human)"]:::humanNode
  wf_node_39["Workflow Node 39\nAuto-generated workflow node 39\n(decision)"]:::decisionNode
  wf_node_40["Workflow Node 40\nAuto-generated workflow node 40\n(service)"]:::processNode
  wf_node_41["Workflow Node 41\nAuto-generated workflow node 41\n(event)"]:::eventNode
  wf_node_42["Workflow Node 42\nAuto-generated workflow node 42\n(human)"]:::humanNode
  wf_node_43["Workflow Node 43\nAuto-generated workflow node 43\n(decision)"]:::decisionNode
  wf_node_44["Workflow Node 44\nAuto-generated workflow node 44\n(service)"]:::processNode
  wf_node_45["Workflow Node 45\nAuto-generated workflow node 45\n(event)"]:::eventNode
  wf_node_46["Workflow Node 46\nAuto-generated workflow node 46\n(human)"]:::humanNode
  wf_node_47["Workflow Node 47\nAuto-generated workflow node 47\n(decision)"]:::decisionNode
  wf_node_48["Workflow Node 48\nAuto-generated workflow node 48\n(service)"]:::processNode
  wf_node_49["Workflow Node 49\nAuto-generated workflow node 49\n(event)"]:::eventNode
  wf_node_50["Workflow Node 50\nAuto-generated workflow node 50\n(human)"]:::humanNode
  wf_node_51["Workflow Node 51\nAuto-generated workflow node 51\n(decision)"]:::decisionNode
  wf_node_52["Workflow Node 52\nAuto-generated workflow node 52\n(service)"]:::processNode
  wf_node_53["Workflow Node 53\nAuto-generated workflow node 53\n(event)"]:::eventNode
  wf_node_54["Workflow Node 54\nAuto-generated workflow node 54\n(human)"]:::humanNode
  wf_node_55["Workflow Node 55\nAuto-generated workflow node 55\n(decision)"]:::decisionNode
  wf_node_56["Workflow Node 56\nAuto-generated workflow node 56\n(service)"]:::processNode
  wf_node_57["Workflow Node 57\nAuto-generated workflow node 57\n(event)"]:::eventNode
  wf_node_58["Workflow Node 58\nAuto-generated workflow node 58\n(human)"]:::humanNode
  wf_node_59["Workflow Node 59\nAuto-generated workflow node 59\n(decision)"]:::decisionNode
  subgraph phase_0["Phase 1"]
    wf_node_0
    wf_node_1
    wf_node_2
    wf_node_3
    wf_node_4
    wf_node_5
    wf_node_6
    wf_node_7
    wf_node_8
    wf_node_9
  end
  subgraph phase_1["Phase 2"]
    wf_node_10
    wf_node_11
    wf_node_12
    wf_node_13
    wf_node_14
    wf_node_15
    wf_node_16
    wf_node_17
    wf_node_18
    wf_node_19
  end
  subgraph phase_2["Phase 3"]
    wf_node_20
    wf_node_21
    wf_node_22
    wf_node_23
    wf_node_24
    wf_node_25
    wf_node_26
    wf_node_27
    wf_node_28
    wf_node_29
  end
  subgraph phase_3["Phase 4"]
    wf_node_30
    wf_node_31
    wf_node_32
    wf_node_33
    wf_node_34
    wf_node_35
    wf_node_36
    wf_node_37
    wf_node_38
    wf_node_39
  end
  subgraph phase_4["Phase 5"]
    wf_node_40
    wf_node_41
    wf_node_42
    wf_node_43
    wf_node_44
    wf_node_45
    wf_node_46
    wf_node_47
    wf_node_48
    wf_node_49
  end
  subgraph phase_5["Phase 6"]
    wf_node_50
    wf_node_51
    wf_node_52
    wf_node_53
    wf_node_54
    wf_node_55
    wf_node_56
    wf_node_57
    wf_node_58
    wf_node_59
  end
  wf_node_0 --> wf_node_1
  wf_node_1 --> wf_node_2
  wf_node_2 --> wf_node_3
  wf_node_3 --> wf_node_4
  wf_node_4 --> wf_node_5
  wf_node_5 --> wf_node_6
  wf_node_6 --> wf_node_7
  wf_node_7 --> wf_node_8
  wf_node_8 --> wf_node_9
  wf_node_9 --> wf_node_10
  wf_node_10 --> wf_node_11
  wf_node_11 --> wf_node_12
  wf_node_12 --> wf_node_13
  wf_node_13 --> wf_node_14
  wf_node_14 --> wf_node_15
  wf_node_15 --> wf_node_16
  wf_node_16 --> wf_node_17
  wf_node_17 --> wf_node_18
  wf_node_18 --> wf_node_19
  wf_node_19 --> wf_node_20
  wf_node_20 --> wf_node_21
  wf_node_21 --> wf_node_22
  wf_node_22 --> wf_node_23
  wf_node_23 --> wf_node_24
  wf_node_24 --> wf_node_25
  wf_node_25 --> wf_node_26
  wf_node_26 --> wf_node_27
  wf_node_27 --> wf_node_28
  wf_node_28 --> wf_node_29
  wf_node_29 --> wf_node_30
  wf_node_30 --> wf_node_31
  wf_node_31 --> wf_node_32
  wf_node_32 --> wf_node_33
  wf_node_33 --> wf_node_34
  wf_node_34 --> wf_node_35
  wf_node_35 --> wf_node_36
  wf_node_36 --> wf_node_37
  wf_node_37 --> wf_node_38
  wf_node_38 --> wf_node_39
  wf_node_39 --> wf_node_40
  wf_node_40 --> wf_node_41
  wf_node_41 --> wf_node_42
  wf_node_42 --> wf_node_43
  wf_node_43 --> wf_node_44
  wf_node_44 --> wf_node_45
  wf_node_45 --> wf_node_46
  wf_node_46 --> wf_node_47
  wf_node_47 --> wf_node_48
  wf_node_48 --> wf_node_49
  wf_node_49 --> wf_node_50
  wf_node_50 --> wf_node_51
  wf_node_51 --> wf_node_52
  wf_node_52 --> wf_node_53
  wf_node_53 --> wf_node_54
  wf_node_54 --> wf_node_55
  wf_node_55 --> wf_node_56
  wf_node_56 --> wf_node_57
  wf_node_57 --> wf_node_58
  wf_node_58 --> wf_node_59
```

## Monitoring {#workflow-logistics-pipeline-monitoring}

- **workflow\_success\_rate:** Success ratio across synthetic pipeline
:::
