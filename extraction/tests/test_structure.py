from app.structure import structure_document_text

SAMPLE = """
CLINTON KHOZA

CONTACTS

EXECUTIVE SUMMARY

Pretoria, Gauteng

Expert in Web Applications, Cybersecurity & Data-Driven Solutions

+27 64 737 5926

Results-driven Full-Stack Developer with 3+ years of experience

Clintonbonganikhoza@gmail.com

building scalable web and mobile applications using React, Next.js,

Portfolio: (Portfolio link)

Angular, Node.js, ASP.NET, and SQL. Combines technical

linkedin (LinkedIn link)

expertise in Artificial Intelligent and Machine learning,

cybersecurity, and business analysis to deliver secure, high-

performance digital solutions.

EDUCATION

PROFESSIONAL EXPERIENCE

Tshwane University of Technology

National diploma in Information

Intermediate Web Developer

Technology (Intelligent Industrial

¢ TPC Performance Centre! Pretoria, Gauteng ! June 2025 — Present

System)

e

Developed Al-powered features using pre-trained models to

Status: completed

automatically generate educational content and mark assessment

scripts.

TECHNICAL SKILLS

Integrated Al capabilities for personalized learning paths and adaptive

.

Frontend: React, Next.js, Angular,

content delivery, enhancing learning efficiency...

HTMLICSS, JavaScript,

Mentored leamers in web development, providing guidance on React,

TypeScript, Tailwind CSS

JavaScript, and modern programming.

Backend: Node.js, ASP.NET

Core, C#, Python, Java,C++

Built scalable cloud infrastructure with SQL databases, ensuring

platform reliability and performance.

Databases: PostgreSQL,

Microsoft SQL Server, Progress

Engineered full-stack solutions connecting React frontend to Node.js

backend via Cloud Functions APIs for seamless educational experiences.

Database

Cloud & DevOps: Azure (AZ-900),

Full-Stack Developer

Docker, Kubernetes, CI/CD

* Softelsie solutions! Randburg, Gauteng | Feb 2023 — Feb 2025

Pipelines.

e

AI/ML: Data Analysis, Machine

Developed scalable web applications using React, Next.js, Angular, and

Learning, Statistical Modeling

ASP.NET Core, significantly improving client operational efficiency.

(Python, R), REST APIs, Docker,

Optimized SQL Server and Progress Database interactions

Scrum, AWS/Google Cloud.

through indexing and query refactoring, achieving faster response times

Security: CompTIA Secunity+,

Led Agile teams to build platforms including Squatta (accommodation

Cybersecurity Best Practices

app), Doctor Queue Management System, and WePledge (community

Tools: Git, Unity, Blender, Agile

platform).

Methodologies, AR/VR demos,

and web applications.

Implemented responsive designs and cross-browser

compatibility, resulting in higher user engagement and satisfaction.

CERTIFICATION

Collaborated remotely using Git, JIRA, and CI/CD pipelines to maintain

productivity across distributed teams.

AZ-900] CompTIA Security+] Cisco

Certified Network Assoriatel
"""


def test_resume_structuring() -> None:
    result = structure_document_text(SAMPLE)
    assert result["title"] == "CLINTON KHOZA"
    assert "contacts" in result["sections"]
    assert result["sections"]["contacts"]["email"] == "Clintonbonganikhoza@gmail.com"
    assert "executive_summary" in result["sections"]
    assert "experience" in result["sections"]
    assert len(result["sections"]["experience"]) >= 2
    assert "skills" in result["sections"]
    formatted = result["formatted"]
    assert "Executive Summary" in formatted
    assert "Professional Experience" in formatted
    assert "CLINTON KHOZA" in formatted
    dp = result["data_points"]
    assert dp["profile"]["full_name"] == "CLINTON KHOZA"
    assert dp["contact"]["email"] == "Clintonbonganikhoza@gmail.com"
    assert dp["statistics"]["role_count"] >= 2
    assert dp["skills"]["count"] > 0
