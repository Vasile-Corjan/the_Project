# the_Project — CDE Platform for AEC

A modern **Common Data Environment (CDE)** for the **Architecture, Engineering, and Construction (AEC)** industry.

It brings together:
- Centralized file storage for AEC file formats (BIM/IFC, DWG, PDF, and related documents)
- 3D model access (IFC visualization workflow)
- A foundation for transparent design coordination across disciplines

---

## Why this exists

AEC teams still lose time and money because project information is fragmented:
- files live across multiple drives/tools,
- revisions are hard to trace,
- discipline coordination is reactive instead of continuous.

This platform is designed to create a **single source of truth** where project teams can:
1. Store and organize project files in one place
2. Track changes with clear revision history
3. Review model/document state with confidence
4. Improve handover quality and auditability

---

## Product vision

**Main Goal:**  
A collaborative engineering workspace built with open source tools where architects, engineers, contractors, and owners can manage building information with the same clarity and confidence software teams get from Git platforms.

### Core product pillars

- **CDE-first data management**
  - Project-centric information structure
  - Controlled file lifecycle (upload, review, publish/archive)
  - Consistent naming and retrieval

- **AEC-native file support**
  - BIM/IFC workflows
  - Drawing/document handling (e.g., DWG/PDF)
  - Metadata-ready architecture for discipline coordination

*Coming soon*
- **Versioned collaboration**
  - Traceable changes over time
  - Foundation for compare/review workflows
  - Better accountability across teams

- **Model-aware experience**
  - IFC viewing flow as a first-class capability
  - Context-rich access to geometry + project documentation

---

## Who it is for

- **Architects** who need reliable model/document coordination
- **Engineers** who need revision confidence and dependency visibility
- **Contractors** who need current information on site and in planning
- **Owners/PM teams** who need traceability, governance, and clean handover records

---

## Current status

This repository contains the active implementation of:
- **Frontend:** Vanilla JavaScript-based web interface based on thatopen engine https://github.com/ThatOpen
- **Backend:** Django-based application services

The codebase is evolving toward a full CDE platform with stronger versioning, model workflows, and project-level governance features.

---

## Contact / Ownership

Maintained by **Vasile-Corjan**.  
Repository: https://github.com/Vasile-Corjan/the_Project