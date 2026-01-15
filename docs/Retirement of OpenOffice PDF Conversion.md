## POA&M – Retirement of OpenOffice PDF Conversion

### POA&M ID
POAM-OO-RETIREMENT-001

### Weakness Description
The EVAuto application currently relies on **OpenOffice** installed on application servers to perform automated document-to-PDF conversion.  
Security scans have identified this configuration as a vulnerability due to the execution of externally installed office software within a server environment.

---

### Affected System / Component
- Application: EVAuto
- Component: Document-to-PDF conversion
- Technology: OpenOffice (headless execution)

---

### Risk Statement
Use of OpenOffice for server-side document conversion introduces:
- Execution of external binaries
- Increased attack surface
- Patch and lifecycle management challenges

This configuration does not align with current security hardening standards.

---

### Risk Level
**Moderate**  
*(Escalates if OpenOffice remains installed post-remediation window)*

---

### Root Cause
OpenOffice was originally selected as a cost-effective PDF conversion mechanism before current security hardening requirements were in place.

---

## Planned Remediation Actions

| # | Action | Description | Owner | Target Date |
|--|-------|-------------|-------|-------------|
| 1 | Select Replacement Technology | Finalize approved replacement (Aspose, MS Cloud, or LibreOffice) | Pringle | TBD |
| 2 | Implement Replacement | Integrate selected PDF conversion solution into EVAuto | Pringle | TBD |
| 3 | Validate Conversion Output | Confirm PDF accuracy and functional equivalence | Pringle | TBD |
| 4 | Remove OpenOffice Dependency | Remove OpenOffice binaries and references from code | Pringle | TBD |
| 5 | Uninstall OpenOffice | Fully uninstall OpenOffice from all environments | Pringle | TBD |
| 6 | Security Validation | Re-run security scans to confirm vulnerability closure | Pringle | TBD |
| 7 | Documentation Update | Update system and security documentation | Pringle | TBD |

---

### Compensating Controls (Interim)
Until OpenOffice is fully retired:
- Access to conversion servers is restricted
- No user-interactive execution is permitted
- Conversion is limited to controlled file sources
- No macros or scripting features are enabled

---

### Residual Risk
- **None** once OpenOffice is fully removed
- **Moderate** if LibreOffice is selected and executed locally (subject to security approval)

---

### POA&M Status
**Open – In Progress**

---

### Dependencies / Constraints
- Procurement approval (if commercial solution selected)
- Security approval for replacement technology
- Deployment scheduling across environments

---

### Notes
This POA&M will be closed once:
- OpenOffice is fully removed from all environments
- Security scans confirm no remaining findings
- Replacement conversion path is operational in production

---

### Approval
- System Owner: ______________________
- ISSO: _______________________________
- Date: _______________________________
