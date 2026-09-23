#!/usr/bin/env python3
"""Genera cartel PDF de extraescolares con QR (una página A4 apaisada, optimizado para imprimir)."""

import sys
from io import BytesIO
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / ".tmp-pdf-deps"))

import qrcode
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from qrcode.constants import ERROR_CORRECT_M

URL = "https://afatierno.github.io/web/extraescolares/web/"
OUTPUT = Path(__file__).resolve().parents[1] / "assets/pdf/extraescolares-cartel-qr.pdf"
BLACK = colors.black
WHITE = colors.white
ACCENT = colors.HexColor("#1d4ed8")
ACCENT_DARK = colors.HexColor("#1e3a8a")

DASH = "—"

SCHEDULE = [
    ("Gimnasio", [
        ["Gimn. acrobática · 5A+P", "Baile moderno · 5A+P"],
        ["Kaisaido · 5A+P", "Bujinkan · 5A+P"],
        ["Gimn. acrobática · 5A+P", "Baile moderno · 5A+P"],
        ["Kaisaido · 5A+P", "Bujinkan · 5A+P"],
        ["Gimn. rítmica · I+P"],
    ]),
    ("Pista Grande", [
        ["Baloncesto · P"],
        ["Patines I/II · 5A+P"],
        ["Baloncesto · P"],
        ["Patines I/II · 5A+P"],
        [],
    ]),
    ("Pista Pequeña", [
        ["Atletismo · 2P-6P"],
        ["Fútbol sala · P"],
        ["Atletismo · 2P-6P"],
        ["Fútbol sala · P"],
        [],
    ]),
    ("Exteriores", [
        ["Tenis de mesa · P"],
        [],
        ["Tenis de mesa · P"],
        [],
        [],
    ]),
    ("Aulas Infantil", [
        ["Inglés · I", "Científ. chiflados · I", "Sportkids · I"],
        ["Inglés · I", "Culturekids · I"],
        ["Inglés · I", "Científ. chiflados · I", "Sportkids · I"],
        ["Inglés · I", "Culturekids · I"],
        ["Dancekids · I"],
    ]),
    ("Aulas Primaria", [
        ["Inglés · P", "Teatro · I+P"],
        ["Inglés · P", "Ajedrez M/J · P", "Homework · P", "Pintura · P"],
        ["Inglés · P", "Oratoria · P", "Teatro · I+P"],
        ["Inglés · P", "Ajedrez M/J · P", "Homework · P", "Pintura · P"],
        ["Ajedrez V · P", "Informática/videojuegos · P"],
    ]),
]


def cell_paragraph(items, style):
    if not items:
        return Paragraph(f"<font color='#444444'>{DASH}</font>", style)
    lines = [item.replace("&", "&amp;") for item in items]
    return Paragraph("<br/>".join(lines), style)


def make_qr_image(size_mm=34):
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=12,
        border=2,
    )
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Image(buf, width=size_mm * mm, height=size_mm * mm)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(A4),
        leftMargin=8 * mm,
        rightMargin=8 * mm,
        topMargin=8 * mm,
        bottomMargin=6 * mm,
        title="Extraescolares 26/27",
    )

    day_col = doc.width / 5

    eyebrow_style = ParagraphStyle(
        "eyebrow", fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=ACCENT_DARK
    )
    title_style = ParagraphStyle(
        "title", fontName="Helvetica-Bold", fontSize=19, leading=22, textColor=BLACK
    )
    subtitle_style = ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=10.5, leading=13, textColor=BLACK
    )
    qr_title = ParagraphStyle(
        "qr_title", fontName="Helvetica-Bold", fontSize=9.5, leading=11, alignment=TA_CENTER, textColor=BLACK
    )
    qr_caption = ParagraphStyle(
        "qr_caption", fontName="Helvetica", fontSize=6.5, leading=7.5, alignment=TA_CENTER, textColor=BLACK
    )
    th_style = ParagraphStyle(
        "th", fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=WHITE, alignment=TA_CENTER
    )
    cell_style = ParagraphStyle(
        "cell", fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=BLACK
    )
    foot_style = ParagraphStyle(
        "foot", fontName="Helvetica", fontSize=7, leading=9, textColor=BLACK
    )
    req_style = ParagraphStyle(
        "req", fontName="Helvetica-Bold", fontSize=8.5, leading=10, textColor=BLACK, alignment=TA_CENTER
    )

    qr_size_mm = 32
    qr_col_mm = 42
    qr = make_qr_image(qr_size_mm)
    qr_box = Table(
        [
            [Paragraph("ESCANEA AQUÍ", qr_title)],
            [qr],
            [Paragraph("Más información e inscripciones", qr_caption)],
        ],
        colWidths=[qr_col_mm * mm],
    )
    qr_box.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 2, BLACK),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    header = Table(
        [[
            [
                Paragraph("AMPA/AFA ENRIQUE TIERNO GALVÁN", eyebrow_style),
                Spacer(1, 1 * mm),
                Paragraph("Extraescolares 26/27", title_style),
                Paragraph("CEIP Enrique Tierno Galván · Getafe", subtitle_style),
            ],
            qr_box,
        ]],
        colWidths=[doc.width - qr_col_mm * mm, qr_col_mm * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    table_data = [[
        Paragraph("LUNES", th_style),
        Paragraph("MARTES", th_style),
        Paragraph("MIÉRCOLES", th_style),
        Paragraph("JUEVES", th_style),
        Paragraph("VIERNES", th_style),
    ]]

    for _space, days in SCHEDULE:
        table_data.append([cell_paragraph(day_items, cell_style) for day_items in days])

    schedule = Table(table_data, colWidths=[day_col] * 5, repeatRows=1)
    schedule.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#fafafa")]),
        ("GRID", (0, 0), (-1, -1), 1, BLACK),
        ("LINEBELOW", (0, 0), (-1, 0), 2, BLACK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))

    requirement = Table(
        [[Paragraph("Imprescindible ser familia socia del AFA · Curso 26/27", req_style)]],
        colWidths=[doc.width],
    )
    requirement.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    legend = Paragraph(
        "<b>Leyenda:</b> I = Infantil · P = Primaria · I+P = Infantil y Primaria · "
        "2P-6P = 2.º a 6.º Primaria · 5A+P = Desde 5 años · "
        "M/J = Martes y jueves · V = Viernes &nbsp;|&nbsp; "
        "<b>Web:</b> afatierno.github.io/web/extraescolares/web/ &nbsp;|&nbsp; "
        "<b>Dudas:</b> ampa.etierno@gmail.com",
        foot_style,
    )

    doc.build([
        header,
        Spacer(1, 3 * mm),
        schedule,
        Spacer(1, 2 * mm),
        requirement,
        Spacer(1, 1.5 * mm),
        legend,
    ])
    print(f"Generado: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
