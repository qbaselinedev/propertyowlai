import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir, platform } from 'os'

function getPythonCmd(): string {
  if (process.env.PYTHON_CMD) return process.env.PYTHON_CMD
  if (platform() === 'win32') return 'python'
  return 'python3'
}
const PYTHON_CMD = getPythonCmd()

function pyPath(p: string): string {
  return p.replace(/\\/g, '/')
}

function getScanPdfScript(): string {
  return `
import sys, json
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, KeepTogether, PageBreak, HRFlowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

# ── Palette ──────────────────────────────────────────────────────────────────
INK      = colors.HexColor('#1A1A1A')
BODY     = colors.HexColor('#2D2D2D')
MUTED    = colors.HexColor('#555555')
RULE     = colors.HexColor('#D4D4D4')
SURFACE  = colors.HexColor('#F7F7F7')
WHITE    = colors.white
C_RED    = colors.HexColor('#C0392B')
C_AMB    = colors.HexColor('#B7710A')
C_BLU    = colors.HexColor('#1D4ED8')
C_GRN    = colors.HexColor('#1E7B45')
C_BRAND  = colors.HexColor('#E8001D')
SLATE    = colors.HexColor('#334155')

W, H = A4
ML = MR = 18*mm
MT = MB = 16*mm
AW = W - ML - MR

def mk(n, **k): return ParagraphStyle(n, **k)

S = {
    'logo':    mk('logo',  fontName='Helvetica-Bold', fontSize=13, textColor=INK),
    'meta':    mk('meta',  fontName='Helvetica', fontSize=7, textColor=MUTED, alignment=TA_RIGHT, leading=10),
    'addr_h':  mk('ah',    fontName='Helvetica-Bold', fontSize=17, textColor=INK, leading=21),
    'addr_s':  mk('as_',   fontName='Helvetica', fontSize=8.5, textColor=MUTED, leading=12),
    'summary': mk('sum',   fontName='Helvetica', fontSize=9, textColor=BODY, leading=14),
    'pg_h':    mk('pgh',   fontName='Helvetica-Bold', fontSize=11, textColor=INK, leading=15, spaceBefore=2*mm, spaceAfter=1*mm),
    'pg_d':    mk('pgd',   fontName='Helvetica', fontSize=8, textColor=MUTED, leading=12),
    'sec_l':   mk('sl',    fontName='Helvetica-Bold', fontSize=7, textColor=MUTED, letterSpacing=0.6, spaceBefore=3*mm),
    'kv_k':    mk('kvk',   fontName='Helvetica-Bold', fontSize=8, textColor=INK, leading=11),
    'kv_v':    mk('kvv',   fontName='Helvetica', fontSize=8, textColor=BODY, leading=11),
    'find_c':  mk('fc',    fontName='Helvetica-Bold', fontSize=7, textColor=INK, leading=10),
    'find_t':  mk('ft_',   fontName='Helvetica-Bold', fontSize=8.5, textColor=INK, leading=12),
    'find_i':  mk('fi',    fontName='Helvetica', fontSize=8, textColor=BODY, leading=12),
    'pos_i':   mk('pi',    fontName='Helvetica', fontSize=8, textColor=BODY, leading=11),
    'lim_i':   mk('li',    fontName='Helvetica', fontSize=7.5, textColor=MUTED, leading=11),
    'disc':    mk('disc',  fontName='Helvetica', fontSize=7.5, textColor=MUTED, leading=11),
}

def safe(v, fb='—'):
    return str(v) if v else fb

def rb():
    return Table([['']], colWidths=[AW], rowHeights=[3],
        style=TableStyle([('BACKGROUND',(0,0),(-1,-1),SLATE),
                          ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))

def logo_row(right):
    return Table(
        [[Paragraph('<b>PropertyOwl</b> <font color="#E8001D">AI</font>', S['logo']),
          Paragraph(right, S['meta'])]],
        colWidths=[AW*0.5, AW*0.5],
        style=TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),
                          ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
                          ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))

def rule():
    return HRFlowable(width='100%', thickness=0.4, color=RULE, spaceAfter=2*mm)

def sec_label(t):
    return Paragraph(t.upper(), S['sec_l'])

def notice_box(text, bg='#FFFBF0', border='#E9C46A'):
    p = Paragraph('<b>Note</b>  ' + text,
        mk('n', fontName='Helvetica', fontSize=8, textColor=C_AMB, leading=12))
    return Table([[p]], colWidths=[AW],
        style=TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),colors.HexColor(bg)),
            ('LINEBELOW',(0,0),(-1,-1),0.4,colors.HexColor(border)),
            ('LINETOP',(0,0),(-1,-1),0.4,colors.HexColor(border)),
            ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
            ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ]))

def risk_badge_color(v):
    v = (v or '').lower()
    if v in ('high',):     return C_RED
    if v in ('medium',):   return C_AMB
    if v in ('none','low'):return C_GRN
    return MUTED

def stat_row(stats):
    cells = []
    for n, lbl, color in stats:
        inner = Table(
            [[Paragraph(f'<b>{n}</b>', mk('sn', fontName='Helvetica-Bold', fontSize=18,
                         textColor=color, alignment=TA_CENTER))],
             [Paragraph(lbl.upper(), mk('sl2', fontName='Helvetica-Bold', fontSize=6.5,
                         textColor=MUTED, alignment=TA_CENTER, letterSpacing=0.4))]],
            colWidths=[AW/4 - 2])
        cells.append(inner)
    t = Table([cells], colWidths=[AW/4]*4)
    t.setStyle(TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,RULE),('INNERGRID',(0,0),(-1,-1),0.5,RULE),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
    ]))
    return t

def footer_fn(addr, total_pages):
    def fn(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(RULE); canvas.setLineWidth(0.4)
        canvas.line(ML, 11*mm, W-MR, 11*mm)
        canvas.setFont('Helvetica', 6.5); canvas.setFillColor(MUTED)
        canvas.drawCentredString(W/2, 8*mm,
            f'PropertyOwl AI  ·  Online Property Scan  ·  {addr}  ·  Page {doc.page} of {total_pages}')
        canvas.restoreState()
    return fn

# ── Finding card ─────────────────────────────────────────────────────────────
def finding_row(f, full_width):
    sev = (f.get('severity') or 'info').lower()
    sev_map = {
        'high':   (C_RED, 'HIGH PRIORITY', colors.HexColor('#FEF2F2')),
        'medium': (C_AMB, 'WORTH REVIEWING', colors.HexColor('#FFFBEB')),
        'low':    (C_BLU, 'GOOD TO KNOW', colors.HexColor('#EFF6FF')),
        'info':   (MUTED, 'INFO', SURFACE),
    }
    sc, label, bg = sev_map.get(sev, (MUTED, sev.upper(), SURFACE))
    cat = f.get('category') or ''
    finding = f.get('finding') or ''
    impl = f.get('implication') or ''

    badge = Paragraph(f'<b>{label}</b>  ·  {cat}',
        mk('fb', fontName='Helvetica-Bold', fontSize=7, textColor=sc, leading=10))
    title_p = Paragraph(finding, S['find_t'])
    rows = [[badge], [title_p]]
    if impl:
        rows.append([Paragraph(impl, S['find_i'])])

    inner = Table(rows, colWidths=[full_width - 16])
    inner.setStyle(TableStyle([
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
        ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
    ]))

    outer = Table([[inner]], colWidths=[full_width])
    outer.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),
        ('LINEBELOW',(0,0),(-1,-1),0.3,RULE),
        ('LINEBEFORE',(0,0),(0,-1),3,sc),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
    ]))
    return outer

# ── Page 1: Cover / Summary ──────────────────────────────────────────────────
def page1(story, scan, addr, today):
    story += [rb(), Spacer(1,4*mm),
              logo_row(f'Online Property Scan  ·  {today}<br/>For buyer reference only — not legal advice'),
              Spacer(1,5*mm)]

    # Address
    story.append(Paragraph(safe(scan.get('address')) + ', ' + safe(scan.get('suburb')) +
        ' ' + safe(scan.get('state','VIC')) + ' ' + safe(scan.get('postcode','')), S['addr_h']))
    meta_parts = []
    if scan.get('council'): meta_parts.append(f"Council: {scan['council']}")
    if scan.get('scan_date'):
        try:
            d = datetime.fromisoformat(scan['scan_date'].replace('Z',''))
            meta_parts.append(f"Scanned: {d.strftime('%-d %b %Y')}")
        except: pass
    if meta_parts:
        story.append(Paragraph('  ·  '.join(meta_parts), S['addr_s']))
    story.append(Spacer(1,5*mm))

    # Stats
    findings = scan.get('findings') or []
    high_n   = len([f for f in findings if f.get('severity')=='high'])
    med_n    = len([f for f in findings if f.get('severity')=='medium'])
    low_n    = len([f for f in findings if f.get('severity') in ('low','info')])
    pos_n    = len(scan.get('positive_findings') or [])

    story.append(stat_row([
        (str(high_n), 'High priority',  C_RED),
        (str(med_n),  'Worth reviewing', C_AMB),
        (str(low_n),  'Good to know',   MUTED),
        (str(pos_n),  'Nothing noted',  C_GRN),
    ]))
    story.append(Spacer(1,4*mm))

    story.append(notice_box(
        'This scan is based on publicly available data retrieved by AI web search. '
        'It is not legal, planning or financial advice. Always engage a licensed Victorian '
        'conveyancer and obtain official planning certificates before making property decisions.'))
    story.append(Spacer(1,3*mm))

    # Summary
    if scan.get('summary'):
        story.append(sec_label('Property summary'))
        story.append(rule())
        story.append(Paragraph(scan['summary'], S['summary']))
        story.append(Spacer(1,4*mm))

    # Risk snapshot — two column
    planning = scan.get('planning') or {}
    env = scan.get('environment') or {}
    hw = AW / 2 - 5

    left_rows = [
        ('Planning zone', planning.get('zone_code') or planning.get('zone_name') or '—'),
        ('Zone name', planning.get('zone_name') or '—'),
        ('Overlays', str(len(planning.get('overlays') or [])) + ' detected' if (planning.get('overlays') or []) else 'None detected'),
        ('GAIC', 'Applicable' if planning.get('gaic_applicable') else 'Not applicable'),
    ]
    right_rows = [
        ('Flood risk',    safe(env.get('flood_risk','—')).title()),
        ('Bushfire risk', safe(env.get('bushfire_risk','—')).title()),
        ('Contamination', safe(env.get('contamination_risk','—')).title()),
        ('Sig. trees',    'Yes' if env.get('significant_trees') else 'No'),
    ]

    def kv_block(rows, width):
        data = [[Paragraph(k, S['kv_k']), Paragraph(str(v), S['kv_v'])] for k,v in rows if v]
        if not data: return Spacer(1,2*mm)
        t = Table(data, colWidths=[width*0.45, width*0.55])
        t.setStyle(TableStyle([
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ('LINEBELOW',(0,0),(-1,-2),0.3,RULE),
        ]))
        return t

    two = Table([
        [Table([[sec_label('Planning')], [rule()], [kv_block(left_rows,hw)]], colWidths=[hw]),
         Table([[sec_label('Risk indicators')], [rule()], [kv_block(right_rows,hw)]], colWidths=[hw])]
    ], colWidths=[hw+5, hw+5])
    two.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ('RIGHTPADDING',(0,0),(0,0),10),
    ]))
    story.append(two)

# ── Page 2: Findings ─────────────────────────────────────────────────────────
def page2(story, scan, addr):
    story.append(PageBreak())
    story += [rb(), Spacer(1,4*mm), logo_row(addr), Spacer(1,2*mm),
              Paragraph('Findings & Intelligence', S['pg_h']),
              Paragraph('All findings from public data research. Review each item before bidding.', S['pg_d']),
              Spacer(1,3*mm)]

    findings = scan.get('findings') or []
    if not findings:
        story.append(Paragraph('No findings recorded in this scan.', S['summary']))
    else:
        for grp_label, grp_sev in [
            ('High priority — action required', ['high']),
            ('Worth reviewing', ['medium']),
            ('Good to know', ['low','info']),
        ]:
            grp = [f for f in findings if f.get('severity') in grp_sev]
            if not grp: continue
            story.append(sec_label(f'{grp_label} ({len(grp)})'))
            story.append(rule())
            for f in grp:
                story.append(finding_row(f, AW))
                story.append(Spacer(1,2*mm))
            story.append(Spacer(1,3*mm))

    # Nothing noted / positive
    pos = scan.get('positive_findings') or []
    if pos:
        story.append(sec_label(f'Nothing of concern noted ({len(pos)})'))
        story.append(rule())
        data = [[
            Paragraph('✓', mk('ck', fontName='Helvetica-Bold', fontSize=9, textColor=C_GRN)),
            Paragraph(f if isinstance(f,str) else (f.get('finding') or f.get('benefit') or str(f)), S['pos_i'])
        ] for f in pos]
        pt = Table(data, colWidths=[12, AW-12])
        pt.setStyle(TableStyle([
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('LINEBELOW',(0,0),(-1,-2),0.3,RULE),
        ]))
        story.append(pt)

# ── Page 3: Property history + school zones + nearby services ────────────────
def page3(story, scan, addr):
    story.append(PageBreak())
    story += [rb(), Spacer(1,4*mm), logo_row(addr), Spacer(1,2*mm),
              Paragraph('Property Intelligence', S['pg_h']),
              Paragraph('History, education zones, nearby services and suburb profile.', S['pg_d']),
              Spacer(1,3*mm)]

    hw = AW / 2 - 5

    # ── Property history ──
    history = scan.get('property_history') or []
    story.append(sec_label(f'Property history ({len(history)} events)'))
    story.append(rule())
    if not history:
        story.append(Paragraph('No history data found in public records.', S['kv_v']))
    else:
        data = []
        for h in history:
            yr  = Paragraph(f'<b>{safe(h.get("year","?"))}</b>', mk('hy', fontName='Helvetica-Bold', fontSize=8, textColor=INK))
            evt = Paragraph(safe(h.get('event','')).title(), mk('he', fontName='Helvetica-Bold', fontSize=8, textColor=INK))
            pr  = Paragraph(safe(h.get('price','')), mk('hp', fontName='Helvetica', fontSize=8, textColor=C_RED))
            det = Paragraph(safe(h.get('detail','')), S['kv_v'])
            data.append([yr, evt, pr, det])
        ht = Table(data, colWidths=[AW*0.1, AW*0.15, AW*0.18, AW*0.57])
        ht.setStyle(TableStyle([
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),4),
            ('LINEBELOW',(0,0),(-1,-2),0.3,RULE),
        ]))
        story.append(ht)
    story.append(Spacer(1,4*mm))

    # ── Two column: education + suburb ──
    edu = scan.get('education') or {}
    sp  = scan.get('suburb_profile') or {}

    edu_rows = []
    if edu.get('primary_school'):
        edu_rows.append(('Primary (zoned)', edu['primary_school'] + (f"  {edu['primary_distance']}" if edu.get('primary_distance') else '')))
        if edu.get('primary_rating'): edu_rows.append(('Rating', edu['primary_rating']))
    if edu.get('secondary_school'):
        edu_rows.append(('Secondary', edu['secondary_school'] + (f"  {edu['secondary_distance']}" if edu.get('secondary_distance') else '')))
        if edu.get('secondary_nearest_zoned'): edu_rows.append(('Zoned school', edu['secondary_nearest_zoned']))
    if edu.get('notes'): edu_rows.append(('Notes', edu['notes'][:120]))

    sp_rows = [
        ('Median house', sp.get('median_house_price')),
        ('Median unit',  sp.get('median_unit_price')),
        ('12m growth',   sp.get('price_growth_12m')),
        ('Rental yield', sp.get('rental_yield')),
        ('Data date',    sp.get('data_date')),
    ]
    sp_rows = [(k,v) for k,v in sp_rows if v]

    def kv_block2(rows, width):
        data = [[Paragraph(k, S['kv_k']), Paragraph(str(v), S['kv_v'])] for k,v in rows]
        if not data: return Paragraph('—', S['kv_v'])
        t = Table(data, colWidths=[width*0.42, width*0.58])
        t.setStyle(TableStyle([
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ('LINEBELOW',(0,0),(-1,-2),0.3,RULE),
        ]))
        return t

    two = Table([
        [Table([[sec_label('School zones')], [rule()],
                [kv_block2(edu_rows, hw) if edu_rows else Paragraph('No school zone data found.', S['kv_v'])]],
               colWidths=[hw]),
         Table([[sec_label('Suburb profile')], [rule()],
                [kv_block2(sp_rows, hw) if sp_rows else Paragraph('No suburb data found.', S['kv_v'])]],
               colWidths=[hw])]
    ], colWidths=[hw+5, hw+5])
    two.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ('RIGHTPADDING',(0,0),(0,0),10),
    ]))
    story.append(two)
    story.append(Spacer(1,4*mm))

    # ── Nearby services ──
    ns = scan.get('nearby_services') or {}
    if ns:
        story.append(sec_label('Nearby services'))
        story.append(rule())

        all_services = []
        icons = {'transport': '🚊', 'shopping': '🛒', 'health': '🏥', 'parks': '🌳', 'education_nearby': '🎓'}
        labels = {'transport': 'Transport', 'shopping': 'Shopping', 'health': 'Health', 'parks': 'Parks', 'education_nearby': 'Universities'}

        for key in ['transport','shopping','health','parks','education_nearby']:
            items = ns.get(key) or []
            for item in items:
                all_services.append((labels[key], item.get('name',''), item.get('distance','')))

        if all_services:
            data = []
            for cat, name, dist in all_services:
                data.append([
                    Paragraph(cat, S['kv_k']),
                    Paragraph(name, S['kv_v']),
                    Paragraph(dist, mk('dist', fontName='Helvetica-Bold', fontSize=7.5, textColor=MUTED, alignment=TA_RIGHT)),
                ])
            st = Table(data, colWidths=[AW*0.2, AW*0.62, AW*0.18])
            st.setStyle(TableStyle([
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
                ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
                ('LINEBELOW',(0,0),(-1,-2),0.3,RULE),
            ]))
            story.append(st)

# ── Page 4: Planning overlays + data sources + disclaimer ────────────────────
def page4(story, scan, addr, today):
    story.append(PageBreak())
    story += [rb(), Spacer(1,4*mm), logo_row(addr), Spacer(1,2*mm),
              Paragraph('Planning Detail & Data Sources', S['pg_h']),
              Paragraph('Planning overlays, data sources consulted and important limitations.', S['pg_d']),
              Spacer(1,3*mm)]

    planning = scan.get('planning') or {}
    overlays = planning.get('overlays') or []

    # Planning detail
    story.append(sec_label('Planning zone detail'))
    story.append(rule())
    plan_rows = [
        ('Zone code', planning.get('zone_code')),
        ('Zone name', planning.get('zone_name')),
        ('Description', planning.get('zone_description')),
        ('Implications', planning.get('zone_implications')),
        ('GAIC', 'Applicable' if planning.get('gaic_applicable') else 'Not applicable'),
        ('Urban growth boundary', 'Yes' if planning.get('urban_growth_boundary') else 'No'),
    ]
    for k, v in plan_rows:
        if v:
            row = Table([[Paragraph(k, S['kv_k']), Paragraph(str(v)[:200], S['kv_v'])]], colWidths=[AW*0.3, AW*0.7])
            row.setStyle(TableStyle([
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
                ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
                ('LINEBELOW',(0,0),(-1,-1),0.3,RULE),
            ]))
            story.append(row)
    story.append(Spacer(1,4*mm))

    # Overlays
    if overlays:
        story.append(sec_label(f'Planning overlays ({len(overlays)} detected)'))
        story.append(rule())
        for o in overlays:
            code = o.get('code') or o.get('name') or '—'
            name = o.get('name') or ''
            desc = o.get('description') or ''
            impl = o.get('implication') or ''
            block = Table([
                [Paragraph(f'<b>{code}</b>  {name}', mk('oc', fontName='Helvetica-Bold', fontSize=8.5, textColor=INK, leading=12))],
                [Paragraph((desc + ('  ' + impl if impl else '')).strip(), S['find_i'])],
            ], colWidths=[AW])
            block.setStyle(TableStyle([
                ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
                ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
                ('LINEBELOW',(0,0),(-1,-1),0.3,RULE),
                ('LINEBEFORE',(0,0),(0,-1),3,C_AMB),
                ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFFBEB')),
            ]))
            story.append(block)
            story.append(Spacer(1,2*mm))
        story.append(Spacer(1,3*mm))
    else:
        story.append(Paragraph('No overlays detected.', S['kv_v']))
        story.append(Spacer(1,4*mm))

    # Limitations
    limitations = scan.get('limitations') or []
    if limitations:
        story.append(sec_label('Data limitations'))
        story.append(rule())
        for lim in limitations:
            story.append(Paragraph('•  ' + (lim if isinstance(lim,str) else str(lim)), S['lim_i']))
        story.append(Spacer(1,4*mm))

    # Data sources
    sources = scan.get('data_sources') or []
    if sources:
        story.append(sec_label('Data sources consulted'))
        story.append(rule())
        for src in sources:
            story.append(Paragraph('•  ' + (src if isinstance(src,str) else str(src)), S['lim_i']))
        story.append(Spacer(1,4*mm))

    # Disclaimer
    story.append(sec_label('Disclaimer'))
    story.append(rule())
    disc = scan.get('disclaimer') or (
        'This Online Property Scan is based on publicly available data retrieved by AI web search. '
        'It is for informational purposes only and does not constitute legal, planning, or financial advice. '
        'Data may be incomplete, outdated, or inaccurate. Always engage a licensed Victorian conveyancer '
        'and obtain official planning certificates before making property decisions.')
    story.append(Paragraph(disc, S['disc']))
    story.append(Spacer(1,3*mm))
    story.append(Paragraph(
        f'Generated by PropertyOwl AI  ·  propertyowlai.com  ·  {today}',
        mk('ft', fontName='Helvetica', fontSize=7.5, textColor=MUTED, alignment=TA_CENTER)
    ))

# ── Main ──────────────────────────────────────────────────────────────────────
def build(output_path, data_path):
    with open(data_path) as f:
        payload = json.load(f)

    scan = payload.get('scan') or {}
    prop = payload.get('property') or {}

    addr_parts = [scan.get('address') or prop.get('address') or '']
    sub = scan.get('suburb') or prop.get('suburb') or ''
    state = scan.get('state') or 'VIC'
    pc = scan.get('postcode') or prop.get('postcode') or ''
    if sub: addr_parts.append(sub + ' ' + state + (' ' + pc if pc else ''))
    addr_short = ', '.join(filter(None, addr_parts))

    try:
        from datetime import date as date_cls
        today = date_cls.today().strftime('%-d %B %Y')
    except:
        today = 'Today'

    story = []
    page1(story, scan, addr_short, today)
    page2(story, scan, addr_short)
    page3(story, scan, addr_short)
    page4(story, scan, addr_short, today)

    total_pages = 4

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=ML, rightMargin=MR,
        topMargin=MT, bottomMargin=MB + 8*mm,
        title='PropertyOwl AI — Online Property Scan Report',
        author='PropertyOwl AI',
    )
    doc.build(story, onFirstPage=footer_fn(addr_short, total_pages),
                     onLaterPages=footer_fn(addr_short, total_pages))

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
`
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { propertyId } = await req.json()
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

  // Fetch property
  const { data: property, error: pe } = await supabase
    .from('properties').select('*').eq('id', propertyId).eq('user_id', user.id).single()
  if (pe || !property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  // Fetch scan report
  const { data: scanReport } = await supabase
    .from('reports')
    .select('raw_analysis')
    .eq('property_id', propertyId)
    .eq('document_type', 'online_scan')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!scanReport?.raw_analysis)
    return NextResponse.json({ error: 'No scan found. Run an Online Scan first.' }, { status: 400 })

  const payload = {
    property: { address: property.address, suburb: property.suburb, postcode: property.postcode },
    scan: scanReport.raw_analysis,
  }

  const uid        = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const scriptPath = join(tmpdir(), `owl_scan_pdf_${uid}.py`)
  const jsonPath   = join(tmpdir(), `owl_scan_data_${uid}.json`)
  const outPath    = join(tmpdir(), `owl_scan_out_${uid}.pdf`)
  const pyScript   = pyPath(scriptPath)
  const pyJson     = pyPath(jsonPath)
  const pyOut      = pyPath(outPath)

  writeFileSync(scriptPath, getScanPdfScript(), 'utf8')
  writeFileSync(jsonPath, JSON.stringify(payload), 'utf8')

  try {
    execSync(`${PYTHON_CMD} "${pyScript}" "${pyOut}" "${pyJson}"`, {
      timeout:   60_000,
      maxBuffer: 20 * 1024 * 1024,
    })

    if (!existsSync(outPath))
      return NextResponse.json({ error: 'PDF file was not created' }, { status: 500 })

    const pdfBuffer = readFileSync(outPath)

    if (pdfBuffer.length < 100 || pdfBuffer.slice(0, 4).toString() !== '%PDF')
      return NextResponse.json({ error: 'Generated file is not a valid PDF' }, { status: 500 })

    const safeAddr = property.address.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)
    const filename = `PropertyOwl_ScanReport_${safeAddr}.pdf`

    try {
      await supabase.from('activity_log').insert({
        user_id: user.id, event_type: 'scan_pdf_generated',
        event_detail: { property_id: propertyId, address: property.address },
      })
    } catch {}

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      pdfBuffer.length.toString(),
        'Cache-Control':       'no-store',
      },
    })
  } catch (e: any) {
    const stderr  = String(e?.stderr  || '')
    const stdout  = String(e?.stdout  || '')
    const message = String(e?.message || '')
    console.error('[ScanPDF] Error:', message, stderr)
    return NextResponse.json({
      error:  'PDF generation failed',
      detail: (stderr || stdout || message).substring(0, 1000),
    }, { status: 500 })
  } finally {
    try { unlinkSync(scriptPath) } catch {}
    try { unlinkSync(jsonPath)   } catch {}
    try { if (existsSync(outPath)) unlinkSync(outPath) } catch {}
  }
}
