# Solo CISO Operating System

This repository now includes a dedicated `Command Center` workflow designed for a one-person cybersecurity leader who must blend strategy, operations, and execution.

## Product Direction

The product is structured as a practical operating system, not a dashboard-only portal:

1. **Command Center** (`/app/command-center`)
- Daily risk pulse
- Seven-day mission queue
- Trend-informed action prioritization
- One-click mission-to-task materialization
- Weekly brief export (markdown/html/json)

2. **Execution Surfaces**
- `Security Analyst`: incident and threat analysis
- `Findings`: remediation and exception control
- `Assessments`: control scoring and gap tracking
- `Policies`: governance artifacts
- `Trust Inbox`: customer assurance output
- `Cyber Range`: scenario validation
- `Runbooks`: prebuilt incident task pack generation

3. **Skills Layer**
- Curated installed skills for testing, docs, and security design.
- Custom repo skills for solo-operator cadence, threat intel fusion, and vulnerability triage.

## 2025-2026 Trend Inputs Used

Signals were synthesized from primary-source reports:

- **CrowdStrike Global Threat Report 2026** (February 26, 2026):
  - Breakout time pressure and social-engineering acceleration.
  - [Report](https://www.crowdstrike.com/en-us/global-threat-report/)
- **IBM X-Force Threat Intelligence Index 2026** (February 24, 2026):
  - Critical infrastructure targeting and identity attack shifts.
  - [Report](https://www.ibm.com/reports/threat-intelligence)
- **Unit 42 Cloud Threat Report 2026** (February 24, 2026):
  - Cloud attack path concentration and extortion prevalence.
  - [Report](https://www.paloaltonetworks.com/resources/research/unit-42-cloud-threat-report-2026)
- **Mandiant M-Trends 2025** (April 24, 2025):
  - Initial access vectors and dwell-time benchmarks.
  - [Report](https://cloud.google.com/blog/topics/threat-intelligence/m-trends-2025)
- **Verizon DBIR 2025** (April 23, 2025):
  - Breach patterns, third-party concentration, and extortion economics.
  - [Report](https://www.verizon.com/business/resources/T23c/reports/2025-dbir-data-breach-investigations-report.pdf)
- **Microsoft Digital Defense Report 2025** (October 15, 2025):
  - Identity attack velocity and nation-state pressure.
  - [Report](https://www.microsoft.com/en-us/security/security-insider/microsoft-digital-defense-report-2025)
- **ENISA Threat Landscape 2024** (November 20, 2024):
  - Ransomware and supply-chain incident patterns in a broad regional dataset.
  - [Report](https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024)

## Operating Cadence (Recommended)

### Daily

1. Review command-center pulse and notifications.
2. Execute one `P0` action to reduce immediate risk.
3. Log outcome and any escalations.

### Weekly

1. Burn down exploit-driven vulnerabilities.
2. Resolve expiring exceptions and stale evidence.
3. Refresh trust packet materials.
4. Run one incident runbook drill and verify task closure evidence.

### Monthly

1. Regenerate high-priority policy artifacts.
2. Validate one adversary scenario in cyber range.
3. Review residual risk with leadership.
