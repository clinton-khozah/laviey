"""Turn noisy OCR resume text into readable structured sections."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

SECTION_ALIASES: dict[str, str] = {
    "CONTACT": "contacts",
    "CONTACTS": "contacts",
    "EXECUTIVE SUMMARY": "executive_summary",
    "SUMMARY": "executive_summary",
    "EDUCATION": "education",
    "PROFESSIONAL EXPERIENCE": "experience",
    "WORK EXPERIENCE": "experience",
    "EXPERIENCE": "experience",
    "TECHNICAL SKILLS": "skills",
    "SKILLS": "skills",
    "CERTIFICATION": "certifications",
    "CERTIFICATIONS": "certifications",
}

EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w+")
PHONE_RE = re.compile(r"\+?\d[\d\s\-()]{7,}\d")
DATE_RANGE_RE = re.compile(
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[—\-–]\s*"
    r"(Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})",
    re.I,
)
SKILL_CATEGORY_RE = re.compile(
    r"^(Frontend|Backend|Databases|Cloud\s*&\s*DevOps|AI/ML|Security|Tools)\s*:\s*(.+)$",
    re.I,
)
JOB_LINE_RE = re.compile(r"^[\*\u00a2\u2022eEoO\-\u2013\u2014]?\s*(.+)$")
NOISE_LINE_RE = re.compile(r"^[\s\-—_=*\u00a2\u2022.]+$")
EXPERIENCE_VERBS_RE = re.compile(
    r"^(Developed|Built|Led|Integrated|Mentored|Engineered|Optimized|Implemented|Collaborated|automatically)\b",
    re.I,
)
SUMMARY_HINTS_RE = re.compile(
    r"\b(years of experience|Results-driven|Expert in|deliver secure)\b",
    re.I,
)
TECH_TOKEN_RE = re.compile(
    r"\b(React|Next\.js|Angular|Node\.js|TypeScript|JavaScript|Docker|Kubernetes|Azure|Python|SQL)\b",
    re.I,
)
CERT_KEYWORDS_RE = re.compile(r"\b(AZ-900|CompTIA|Cisco|Certified)\b", re.I)
YEARS_EXPERIENCE_RE = re.compile(r"(\d+)\+?\s*years?\s+of\s+experience", re.I)
DEGREE_RE = re.compile(
    r"\b(Bachelor|Master|PhD|Doctorate|National\s+diploma|Diploma|Certificate|B\.?Sc|M\.?Sc)\b",
    re.I,
)
KNOWN_TECHNOLOGIES = (
    "React",
    "Next.js",
    "Angular",
    "Node.js",
    "ASP.NET",
    "C#",
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "SQL",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
    "Azure",
    "AWS",
    "Git",
    "TensorFlow",
    "Machine Learning",
    "AI",
)
DOMAIN_KEYWORDS = (
    "cybersecurity",
    "web applications",
    "data-driven",
    "full-stack",
    "cloud",
    "agile",
    "machine learning",
    "artificial intelligence",
)


def _normalize_header(line: str) -> str:
    cleaned = re.sub(r"[^A-Za-z &/]", " ", line).strip()
    return re.sub(r"\s+", " ", cleaned).upper()


def _normalize_text(line: str) -> str:
    text = line.strip()
    replacements = {
        "Al-powered": "AI-powered",
        "Al powered": "AI-powered",
        "leamers": "learners",
        "HTMLICSS": "HTML/CSS",
        "Secunity+": "Security+",
        "Assoriatel": "Associate",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = text.replace("!", " | ")
    text = re.sub(r"\s+\|\s+\|", " | ", text)
    return text.strip()


def _is_section_header(line: str) -> str | None:
    header = _normalize_header(line)
    if not header or len(header) < 4:
        return None
    if header in SECTION_ALIASES:
        return SECTION_ALIASES[header]
    for key, value in SECTION_ALIASES.items():
        if key in header and len(header) <= len(key) + 6:
            return value
    return None


def _is_noise(line: str) -> bool:
    return not line or NOISE_LINE_RE.fullmatch(line) or line in {"e"}


def _split_lines(raw: str) -> list[str]:
    lines = [_normalize_text(line) for line in raw.splitlines()]
    return [line for line in lines if not _is_noise(line)]


def _is_job_title(line: str) -> bool:
    return bool(
        re.search(
            r"\b(Developer|Engineer|Analyst|Manager|Intern|Consultant|Designer)\b",
            line,
            re.I,
        )
        and len(line) < 100
        and not DATE_RANGE_RE.search(line)
    )


def _is_company_line(line: str) -> bool:
    return bool(DATE_RANGE_RE.search(line) or (" | " in line and re.search(r"\d{4}", line)))


def _is_summary_line(line: str) -> bool:
    return bool(SUMMARY_HINTS_RE.search(line))


def _is_skill_fragment(line: str) -> bool:
    if SKILL_CATEGORY_RE.match(line):
        return True
    if EXPERIENCE_VERBS_RE.match(line) or DATE_RANGE_RE.search(line):
        return False
    if len(line) > 70 and re.search(r"\b(to|for|with|ensuring|improving|including)\b", line, re.I):
        return False
    # Short technology-only lines OCR dropped into the wrong column.
    return bool(TECH_TOKEN_RE.search(line) and len(line) < 55 and line.count(" ") < 8)


def _is_valid_experience_bullet(line: str) -> bool:
    if len(line) < 18:
        return False
    if _is_skill_fragment(line) and not EXPERIENCE_VERBS_RE.match(line):
        return False
    if line.strip(".") in {"Database", "Pipelines", "Learning, Statistical Modeling"}:
        return False
    if re.match(r"^(Scrum|Cybersecurity Best Practices|through indexing)", line, re.I):
        return False
    return True


def _is_education_line(line: str) -> bool:
    lower = line.lower()
    return bool(
        "university" in lower
        or "diploma" in lower
        or lower.startswith("status:")
        or "technology (" in lower
        or lower.endswith("system)")
        or (lower.startswith("national ") and "information" in lower)
    )


def _guess_section(line: str, current: str | None) -> str | None:
    lower = line.lower()

    if EMAIL_RE.search(line) or PHONE_RE.search(line):
        return "contacts"
    if "portfolio" in lower or "linkedin" in lower:
        return "contacts"
    if any(token in lower for token in ("gauteng", "pretoria")) and len(line) < 60:
        return "contacts"
    if _is_summary_line(line):
        return "executive_summary"
    if SKILL_CATEGORY_RE.match(line) or _is_skill_fragment(line):
        return "skills"
    if CERT_KEYWORDS_RE.search(line):
        return "certifications"
    if _is_education_line(line):
        return "education"
    if DATE_RANGE_RE.search(line) or EXPERIENCE_VERBS_RE.match(line):
        return "experience"
    if _is_job_title(line) and not _is_summary_line(line):
        return "experience"
    if _is_company_line(line):
        return "experience"

    if current in {"executive_summary", "education", "experience", "skills"}:
        if current == "education" and EXPERIENCE_VERBS_RE.match(line):
            return "experience"
        if current == "experience" and _is_skill_fragment(line):
            return "skills"
        return current

    if current == "contacts" and len(line) > 40:
        return "executive_summary"

    return current


def _assign_lines_to_sections(lines: list[str]) -> tuple[str, dict[str, list[str]]]:
    sections: dict[str, list[str]] = defaultdict(list)
    current: str | None = None
    title = ""

    for index, line in enumerate(lines):
        header = _is_section_header(line)
        if header:
            current = header
            continue

        if index == 0 and not header:
            title = line
            continue

        section = _guess_section(line, current)
        if not section and current:
            section = current
        if not section:
            section = "executive_summary"
        sections[section].append(line)
        current = section

    return title, dict(sections)


def _parse_contacts(lines: list[str]) -> dict[str, Any]:
    contacts: dict[str, Any] = {}
    for line in lines:
        lower = line.lower()
        if EMAIL_RE.search(line):
            contacts["email"] = EMAIL_RE.search(line).group(0)
        elif PHONE_RE.search(line):
            contacts["phone"] = PHONE_RE.search(line).group(0).strip()
        elif "linkedin" in lower:
            contacts["linkedin"] = line
        elif "portfolio" in lower:
            contacts["portfolio"] = line
        elif any(token in lower for token in ("gauteng", "pretoria")):
            contacts["location"] = line
    return contacts


def _merge_paragraph(lines: list[str]) -> str:
    sentences: list[str] = []
    buffer: list[str] = []
    for line in lines:
        buffer.append(line)
        if line.endswith((".", "...", "solutions")) or len(" ".join(buffer)) > 120:
            sentences.append(" ".join(buffer))
            buffer = []
    if buffer:
        sentences.append(" ".join(buffer))
    return "\n\n".join(sentences)


def _parse_education(lines: list[str]) -> list[dict[str, Any]]:
    entry: dict[str, Any] = {"institution": "", "details": []}
    entries: list[dict[str, Any]] = []

    for line in lines:
        if EXPERIENCE_VERBS_RE.match(line) or _is_company_line(line):
            continue
        lower = line.lower()
        if "university" in lower or "college" in lower:
            if entry.get("institution"):
                entries.append(entry)
            entry = {"institution": line, "details": []}
        elif lower.startswith("status:"):
            entry["status"] = line.split(":", 1)[-1].strip()
        else:
            entry.setdefault("details", []).append(line)

    if entry.get("institution") or entry.get("details"):
        entries.append(entry)
    return entries


def _clean_bullet(line: str) -> str:
    match = JOB_LINE_RE.match(line)
    return match.group(1).strip() if match else line.strip()


def _parse_experience(lines: list[str]) -> list[dict[str, Any]]:
    roles: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in lines:
        if _is_summary_line(line) or _is_skill_fragment(line) or _is_education_line(line):
            continue
        if _is_job_title(line):
            if current:
                roles.append(current)
            current = {"title": line, "company": "", "dates": "", "bullets": []}
            continue
        if current and _is_company_line(line):
            dates = DATE_RANGE_RE.search(line)
            current["company"] = DATE_RANGE_RE.sub("", line).strip(" |-*")
            if dates:
                current["dates"] = dates.group(0).strip()
            continue
        if current:
            bullet = _clean_bullet(line)
            if bullet and not _is_job_title(bullet) and _is_valid_experience_bullet(bullet):
                current["bullets"].append(bullet)
        elif EXPERIENCE_VERBS_RE.match(line) or len(line) > 30:
            if not current:
                current = {"title": "", "company": "", "dates": "", "bullets": []}
            current["bullets"].append(_clean_bullet(line))

    if current and (current.get("title") or current.get("bullets")):
        roles.append(current)
    return roles


def _parse_skills(lines: list[str]) -> list[dict[str, str]]:
    categories: list[dict[str, str]] = []
    for line in lines:
        if EXPERIENCE_VERBS_RE.match(line) or _is_company_line(line) or _is_summary_line(line):
            continue
        match = SKILL_CATEGORY_RE.match(line)
        if match:
            categories.append(
                {"category": match.group(1).strip(), "skills": match.group(2).strip().rstrip(".")}
            )
        elif categories and not CERT_KEYWORDS_RE.search(line):
            fragment = line.strip(" .,")
            if (
                fragment
                and len(fragment) < 80
                and not re.search(r"\b(improving|including|delivery|efficiency|platform\))\b", fragment, re.I)
            ):
                categories[-1]["skills"] += ", " + fragment
    for group in categories:
        skills = group["skills"]
        for noise in (
            "content delivery, enhancing learning efficiency",
            "platform), Methodologies, AR/VR demos, and web applications",
            "JavaScript, and modern programming",
        ):
            skills = skills.replace(noise, "")
        group["skills"] = re.sub(r",\s*,", ",", skills).strip(" ,")
    return categories


def _parse_certifications(lines: list[str]) -> list[str]:
    joined = " ".join(lines)
    parts = re.split(r"[\]|]+", joined)
    return [part.strip(" -—") for part in parts if part.strip(" -—")]


def _split_name(full_name: str) -> dict[str, str]:
    parts = full_name.strip().split()
    if not parts:
        return {"full_name": "", "first_name": "", "last_name": ""}
    return {
        "full_name": full_name.strip(),
        "first_name": parts[0],
        "last_name": " ".join(parts[1:]) if len(parts) > 1 else "",
    }


def _parse_location(location: str) -> dict[str, str]:
    if not location:
        return {"raw": "", "city": "", "region": "", "country": ""}
    pieces = [part.strip() for part in re.split(r",|\|", location) if part.strip()]
    city = pieces[0] if pieces else location
    region = pieces[1] if len(pieces) > 1 else ""
    country = pieces[2] if len(pieces) > 2 else ("South Africa" if "gauteng" in location.lower() else "")
    return {"raw": location, "city": city, "region": region, "country": country}


def _parse_date_range(dates: str) -> dict[str, Any]:
    if not dates:
        return {"raw": "", "start_date": "", "end_date": "", "is_current": False}
    parts = re.split(r"[—\-–]", dates, maxsplit=1)
    start = parts[0].strip() if parts else ""
    end = parts[1].strip() if len(parts) > 1 else ""
    is_current = "present" in dates.lower()
    return {
        "raw": dates.strip(),
        "start_date": start,
        "end_date": end,
        "is_current": is_current,
    }


def _parse_company_location(company_line: str) -> dict[str, str]:
    parts = [part.strip() for part in company_line.split("|") if part.strip()]
    company = parts[0] if parts else company_line
    location = ""
    for part in parts[1:]:
        if DATE_RANGE_RE.search(part) or re.search(r"\d{4}", part):
            continue
        if any(token in part.lower() for token in ("gauteng", "pretoria", "randburg", "cape")):
            location = part
            break
    company = re.sub(r"^[\*\u00a2\u2022]+\s*", "", company)
    return {"company": company.strip(" •*"), "location": location}


def _split_skill_list(skills: str) -> list[str]:
    items = re.split(r",|/|;", skills)
    return [item.strip() for item in items if item.strip() and len(item.strip()) > 1]


def _find_technologies(*texts: str) -> list[str]:
    combined = " ".join(texts).lower()
    found: list[str] = []
    for tech in KNOWN_TECHNOLOGIES:
        if tech.lower() in combined and tech not in found:
            found.append(tech)
    return sorted(found, key=str.lower)


def _find_domains(*texts: str) -> list[str]:
    combined = " ".join(texts).lower()
    return [domain for domain in DOMAIN_KEYWORDS if domain in combined]


def _parse_degree_details(details: list[str]) -> dict[str, str]:
    joined = " ".join(details)
    degree_match = DEGREE_RE.search(joined)
    degree = degree_match.group(0) if degree_match else ""
    field = joined
    if degree:
        field = joined.replace(degree, "").strip(" -(),")
    level = ""
    lower = degree.lower()
    if "diploma" in lower:
        level = "diploma"
    elif "bachelor" in lower or "b.sc" in lower:
        level = "bachelor"
    elif "master" in lower:
        level = "master"
    return {
        "degree": degree,
        "field_of_study": field.strip(),
        "qualification_level": level,
    }


def _enrich_experience_role(role: dict[str, Any]) -> dict[str, Any]:
    company_info = _parse_company_location(role.get("company", ""))
    dates_info = _parse_date_range(role.get("dates", ""))
    bullets = role.get("bullets", [])
    return {
        "job_title": role.get("title", ""),
        "company": company_info["company"],
        "location": company_info["location"],
        "start_date": dates_info["start_date"],
        "end_date": dates_info["end_date"],
        "is_current": dates_info["is_current"],
        "date_range": dates_info["raw"],
        "responsibilities": bullets,
        "achievement_count": len(bullets),
        "technologies": _find_technologies(" ".join(bullets)),
    }


def _extract_headline(summary: str, contact_lines: list[str]) -> str:
    for line in contact_lines:
        if "expert in" in line.lower() or "developer" in line.lower():
            return line
    first_line = summary.split("\n\n")[0] if summary else ""
    return first_line[:160]


def _extract_years_of_experience(summary: str) -> int | None:
    match = YEARS_EXPERIENCE_RE.search(summary)
    return int(match.group(1)) if match else None


def build_cv_data_points(structured: dict[str, Any]) -> dict[str, Any]:
    """Extract main CV data points from structured resume sections."""
    sections = structured.get("sections", {})
    title = structured.get("title", "")
    name = _split_name(title)

    contacts = sections.get("contacts", {})
    summary = sections.get("executive_summary", "")
    contact_lines: list[str] = []
    if isinstance(contacts, dict):
        contact_lines = [str(value) for value in contacts.values() if value]

    location = _parse_location(contacts.get("location", "") if isinstance(contacts, dict) else "")

    experience_raw = sections.get("experience", [])
    experience = [_enrich_experience_role(role) for role in experience_raw]

    education_raw = sections.get("education", [])
    education: list[dict[str, Any]] = []
    for entry in education_raw:
        degree_info = _parse_degree_details(entry.get("details", []))
        education.append(
            {
                "institution": entry.get("institution", ""),
                "degree": degree_info["degree"],
                "field_of_study": degree_info["field_of_study"],
                "qualification_level": degree_info["qualification_level"],
                "status": entry.get("status", ""),
                "details": entry.get("details", []),
            }
        )

    skills_raw = sections.get("skills", [])
    by_category: dict[str, list[str]] = {}
    all_skills: list[str] = []
    for group in skills_raw:
        category = group.get("category", "Other")
        items = _split_skill_list(group.get("skills", ""))
        by_category[category] = items
        all_skills.extend(items)
    all_skills = sorted(set(all_skills), key=str.lower)

    certifications_raw = sections.get("certifications", [])
    certifications = [{"name": cert, "issuer": _guess_cert_issuer(cert)} for cert in certifications_raw]

    summary_technologies = _find_technologies(summary)
    role_technologies = [tech for role in experience for tech in role.get("technologies", [])]
    technologies = sorted(set(summary_technologies + role_technologies + all_skills), key=str.lower)

    domains = _find_domains(summary, " ".join(role.get("job_title", "") for role in experience))

    current_role = next((role for role in experience if role.get("is_current")), None)
    latest_role = experience[0] if experience else None

    return {
        "profile": {
            **name,
            "headline": _extract_headline(summary, contact_lines if isinstance(contact_lines, list) else []),
            "location": location,
            "years_of_experience": _extract_years_of_experience(summary),
            "current_job_title": current_role.get("job_title") if current_role else (latest_role or {}).get("job_title", ""),
            "current_company": current_role.get("company") if current_role else "",
        },
        "contact": {
            "email": contacts.get("email", "") if isinstance(contacts, dict) else "",
            "phone": contacts.get("phone", "") if isinstance(contacts, dict) else "",
            "linkedin": contacts.get("linkedin", "") if isinstance(contacts, dict) else "",
            "portfolio": contacts.get("portfolio", "") if isinstance(contacts, dict) else "",
        },
        "summary": {
            "text": summary,
            "years_of_experience": _extract_years_of_experience(summary),
            "domains": domains,
            "technologies_mentioned": summary_technologies,
        },
        "experience": experience,
        "education": education,
        "skills": {
            "by_category": by_category,
            "all": all_skills,
            "count": len(all_skills),
        },
        "certifications": certifications,
        "current_role": current_role,
        "latest_role": latest_role,
        "statistics": {
            "role_count": len(experience),
            "education_count": len(education),
            "certification_count": len(certifications),
            "skill_count": len(all_skills),
            "responsibility_count": sum(role.get("achievement_count", 0) for role in experience),
            "technology_count": len(technologies),
        },
        "keywords": {
            "technologies": technologies[:40],
            "domains": domains,
        },
    }


def _guess_cert_issuer(cert_name: str) -> str:
    lower = cert_name.lower()
    if "azure" in lower or "az-900" in lower:
        return "Microsoft"
    if "comptia" in lower:
        return "CompTIA"
    if "cisco" in lower:
        return "Cisco"
    return ""


def structure_document_text(raw: str) -> dict[str, Any]:
    lines = _split_lines(raw)
    if not lines:
        return {"title": "", "sections": {}, "formatted": ""}

    title, sections = _assign_lines_to_sections(lines)

    structured: dict[str, Any] = {"title": title, "sections": {}}

    if sections.get("contacts"):
        structured["sections"]["contacts"] = _parse_contacts(sections["contacts"])
    if sections.get("executive_summary"):
        structured["sections"]["executive_summary"] = _merge_paragraph(sections["executive_summary"])
    if sections.get("education"):
        structured["sections"]["education"] = _parse_education(sections["education"])
    if sections.get("experience"):
        structured["sections"]["experience"] = _parse_experience(sections["experience"])
    if sections.get("skills"):
        structured["sections"]["skills"] = _parse_skills(sections["skills"])
    if sections.get("certifications"):
        structured["sections"]["certifications"] = _parse_certifications(sections["certifications"])

    structured["formatted"] = format_structured_document(structured)
    structured["data_points"] = build_cv_data_points(structured)
    return structured


def format_structured_document(data: dict[str, Any]) -> str:
    parts: list[str] = []
    title = data.get("title", "")
    if title:
        parts.extend([title, "=" * len(title), ""])

    sections: dict[str, Any] = data.get("sections", {})

    def heading(label: str) -> None:
        parts.extend([label, "-" * len(label), ""])

    if sections.get("contacts"):
        heading("Contacts")
        contacts = sections["contacts"]
        for key in ("location", "phone", "email", "portfolio", "linkedin"):
            if contacts.get(key):
                parts.append(str(contacts[key]))
        parts.append("")

    if sections.get("executive_summary"):
        heading("Executive Summary")
        parts.append(sections["executive_summary"])
        parts.append("")

    if sections.get("education"):
        heading("Education")
        for entry in sections["education"]:
            if entry.get("institution"):
                parts.append(entry["institution"])
            for detail in entry.get("details", []):
                parts.append(f"  {detail}")
            if entry.get("status"):
                parts.append(f"  Status: {entry['status']}")
        parts.append("")

    if sections.get("experience"):
        heading("Professional Experience")
        for role in sections["experience"]:
            if role.get("title"):
                parts.append(role["title"])
            company = role.get("company", "").strip()
            dates = role.get("dates", "").strip()
            if company or dates:
                line = company
                if dates:
                    line = f"{line} | {dates}" if line else dates
                parts.append(f"  {line}")
            for bullet in role.get("bullets", []):
                parts.append(f"  • {bullet}")
            parts.append("")

    if sections.get("skills"):
        heading("Technical Skills")
        for group in sections["skills"]:
            parts.append(f"  {group['category']}: {group['skills']}")
        parts.append("")

    if sections.get("certifications"):
        heading("Certifications")
        for cert in sections["certifications"]:
            parts.append(f"  • {cert}")

    return "\n".join(parts).strip()
