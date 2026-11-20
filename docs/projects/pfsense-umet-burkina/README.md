# Design and Deployment of a pfSense-Based Network Security Solution
**Case study: UMET Burkina university network**

| | |
|---|---|
| **Type** | Bachelor's thesis (Licence en Génie Informatique – Information and Industrial Systems Security) |
| **Institution** | UMET Burkina – Institut des Sciences et Techniques de l'Ingénieur (ISTI) |
| **Academic year** | 2024–2025 · publicly defended on 17 January 2026 |
| **Authors** | Gérald Marie Wend-Kuuni Kabré, Rahim Gildas Dabone |
| **Supervisor** | Mr. Pousga Martin Kiendrebeogo |
| **Keywords** | pfSense, network segmentation, firewall, IDS/IPS, defense in depth |

---

## Abstract
This work presents the design and deployment of a centralized network security architecture for the information system of UMET Burkina. An audit of the existing infrastructure revealed a flat, unsegmented network with a single addressing plan, Wi-Fi protected only by shared WPA2-PSK keys, and no filtering, intrusion detection or centralized logging.

A pfSense-based architecture was designed to segment the network into five isolated VLANs, enforce a deny-by-default filtering policy and provide integrated security services: web filtering, intrusion detection and prevention, WPA-Enterprise authentication and centralized logging. The solution was validated through six functional tests and completed by operational procedures (backup, disaster recovery, change management and monitoring). It shows that a robust, scalable and cost-effective security infrastructure is achievable in a resource-constrained environment.

---

## 1. Initial Situation
- Flat network: all users (administration, computer lab, students, visitors) shared one address space.
- Unmanaged switching and Wi-Fi access points secured with easily shared pre-shared keys.
- No inter-segment filtering, no intrusion detection, no web filtering, no centralized logs.
- Consequence: a single compromised device could reach every system on campus, including administrative data.

## 2. Target Architecture
pfSense is the central control point. It handles inter-VLAN routing, stateful filtering, intrusion prevention, web proxying and logging.

- **Dual-WAN** (Orange and Moov) with load balancing and automatic failover.
- **Redundant core**: two managed HP switches linked by a trunk, each connected to pfSense; **RSTP** prevents loops while keeping automatic recovery.
- **Access ports** assigned per VLAN; unused ports disabled or placed in a quarantine VLAN (999); **Port Security** limits MAC addresses per port.

### Segmentation and Addressing Plan
| VLAN | Name | Subnet | Gateway | Users / SSIDs |
|---|---|---|---|---|
| 10 | ADMINISTRATION | 192.168.10.0/24 | 192.168.10.1 | Management, registrar, accounting · SSIDs *DAAS*, *ATTENTION* (WPA-Enterprise) |
| 20 | SALLE_INFO | 192.168.20.0/24 | 192.168.20.1 | Computer lab |
| 30 | ETUDIANTS_WIFI | 192.168.30.0/24 | 192.168.30.1 | Students · SSIDs *UMET 1*, *UMET 2* |
| 40 | INVITES | 192.168.40.0/24 | 192.168.40.1 | Visitors · SSID *SUBF* (Internet only) |
| 50 | DMZ | 192.168.50.0/24 | 192.168.50.1 | Exposed services, video surveillance |

## 3. Implementation
| Area | Implementation |
|---|---|
| Firewall policy | Per-VLAN rule sets, deny by default, explicit allow rules only |
| Addressing | DHCP server per VLAN on pfSense |
| Web filtering | Squid transparent proxy with **SquidGuard**, plus **pfBlockerNG** block lists; **SARG** usage reports |
| Intrusion detection and prevention | **Suricata** in IPS mode with Emerging Threats signatures |
| Wireless security | **WPA-Enterprise (IEEE 802.1X)** with RADIUS authentication for administrative staff; strong, rotated keys elsewhere |
| Logging | Centralized logging of firewall, proxy and IDS events |
| Lab environment | pfSense VM on VMware Workstation Pro |

## 4. Validation
| # | Test | Result |
|---|---|---|
| 1 | WAN connectivity | Stable external access from the firewall |
| 2 | DHCP per VLAN | A host on VLAN 10 received an address in 192.168.10.0/24 |
| 3 | Inter-VLAN isolation | Ping from VLAN 30 (students) to VLAN 10 (administration) blocked |
| 4 | Guest access | VLAN 40 reaches the Internet but no internal resource |
| 5 | Web filtering | Access to a blocked domain from VLAN 30 denied by the proxy |
| 6 | IDS/IPS | An external Nmap port scan was detected by Suricata and the source automatically blocked |

## 5. Operations and Resilience
- Configuration backups (local and external media) with restore tests
- Disaster recovery plan (RTO/RPO defined)
- Change management procedure
- Continuous monitoring and staff training

## 6. Cost
Estimated hardware budget: **535,000 – 1,140,000 FCFA** (about USD 900 – 1,900), using open-source software only.

## 7. Future Work
- High availability with two pfSense nodes using **CARP**
- Open-source **SIEM** (Wazuh, Graylog or ELK) for event correlation and automated response
- Captive portal with RADIUS/LDAP authentication on the remaining VLANs

---

## Skills Demonstrated
`pfSense` · `VLAN design` · `Firewall policy` · `Dual-WAN failover` · `RSTP` · `Port Security` · `Suricata IDS/IPS` · `SquidGuard / pfBlockerNG` · `802.1X / RADIUS` · `Logging and monitoring` · `Disaster recovery planning`

<!-- TODO: add architecture diagram (architecture.png) and test screenshots to this folder -->
