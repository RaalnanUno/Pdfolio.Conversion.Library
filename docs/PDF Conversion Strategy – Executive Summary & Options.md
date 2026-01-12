# PDF Conversion Strategy – Executive Summary & Options

## TL;DR (For Decision Makers)

We must retire **OpenOffice-based PDF conversion** due to a security finding.  
There is no “free, drop-in, zero-risk” replacement.

**Viable options, in order of reliability:**

1. **Aspose.Total**
   - Most reliable and secure
   - Commercial licensing cost
   - Minimal operational risk

2. **Microsoft Cloud Conversion (Graph / Office Services)**
   - Secure and vendor-supported
   - Requires architectural change and cloud dependency
   - Licensing and data-flow approval required

3. **LibreOffice**
   - Lower licensing cost
   - Similar operational and security risks to OpenOffice
   - Still requires server installation and execution

4. **Containerized Conversion (Docker / Kubernetes)**
   - Strong isolation and future-proof design
   - Not feasible in our current environment

**Recommendation:**  
➡️ Short term: **Aspose.Total**  
➡️ Long term: **Containerized or Microsoft-managed conversion**

---

## Background (Why We’re Here)

The EVAuto application performs scheduled processing of files stored in the database.  
Historically, it used **OpenOffice installed on the server** to:

- Open Office documents
- Convert them to PDF
- Store the resulting PDF back into the database

A security scan flagged this approach as a **vulnerability**, requiring removal of OpenOffice.

This forces us to choose a **new PDF conversion strategy**.

---

## Option 1: Aspose.Total (Commercial Library)

### What It Is
A commercial .NET library that converts Office documents directly to PDF **without requiring Office software installed on the server**.

### Pros
- Most reliable and mature solution
- No external executables
- No Office installation required
- Strong vendor support
- Easy integration with existing code

### Cons
- Licensing cost (Aspose.Total required for full coverage)
- Requires procurement approval

### Risk Assessment
- **Low technical risk**
- **Low security risk**
- **Medium financial risk**

---

## Option 2: Microsoft Cloud Conversion (Graph / Office Services)

### What It Is
Using Microsoft’s cloud-hosted Office services (via Graph APIs or similar) to convert documents to PDF.

### Pros
- Microsoft-managed security and patching
- No server-side document execution
- Aligns with enterprise security posture

### Cons
- Requires architectural change (cloud calls instead of local processing)
- Requires licensing validation
- Requires approval for data leaving the environment
- Increased latency and dependency on network availability

### Risk Assessment
- **Low security risk**
- **Medium technical risk**
- **Medium organizational risk (approvals, compliance)**

---

## Option 3: LibreOffice (OpenOffice Alternative)

### What It Is
An open-source Office suite similar to OpenOffice, used in headless mode for conversions.

### Pros
- No licensing fees
- Actively maintained

### Cons
- Requires installation on the server
- Executes external binaries
- Likely to trigger **similar security findings** as OpenOffice
- Fragile in automated environments

### Risk Assessment
- **Medium–High security risk**
- **Medium operational risk**
- Often rejected by security teams for the same reasons as OpenOffice

---

## Option 4: Containerized Conversion (Docker / Kubernetes)

### What It Is
Running the conversion engine inside a container, isolated from the host system.

### Pros
- Strong security isolation
- Clean separation of responsibility
- Scalable and future-proof
- Industry best practice

### Cons
- Not currently supported in our environment
- Requires infrastructure changes
- Higher upfront effort

### Risk Assessment
- **Low long-term risk**
- **High short-term feasibility risk**

---

## Key Reality Check

- **There is no free solution that is also low-risk**
- Installing Office-style software on servers is increasingly considered a security anti-pattern
- The more “free” the solution, the more risk is pushed onto operations and security teams

---

## Recommended Path Forward

### Short Term (Immediate Need)
✔ **Adopt Aspose.Total**
- Fastest path to compliance
- Minimal engineering effort
- Predictable behavior

### Long Term (Strategic Improvement)
✔ Evaluate either:
- Microsoft-managed conversion services, or
- Containerized conversion once infrastructure allows

---

## Decision Required

To proceed, leadership must decide between:
- **Cost vs. Risk**, and
- **Short-term compliance vs. long-term architecture**

Engineering can implement **any** of these options —  
but **only leadership can accept the associated risk profile**.

---
For a Federal government contract, Aspose.Total is realistically:

$20,000 – $50,000+ upfront,
plus annual maintenance renewals if updates are required.

Anything below that range generally does not apply to federal, multi-environment, multi-developer usage.