#!/usr/bin/env python3
"""
Fix the glamping DOCX template to add missing placeholders,
remove blank pages, fix date bug, and remove hardcoded location refs.

Run: python3 scripts/fix-glamping-template.py
"""

import os
import sys
import zipfile
import shutil
import tempfile
import copy
from lxml import etree

DEFAULT_TEMPLATE = 'glamping'

def get_template_path(template_key):
    return os.path.join(os.path.dirname(__file__), '..', 'templates', template_key, 'template.docx')

W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
W = f'{{{W_NS}}}'


def get_paragraph_text(p):
    """Extract full text from a paragraph element."""
    texts = []
    for t in p.iter(f'{W}t'):
        if t.text:
            texts.append(t.text)
    return ''.join(texts)


def set_paragraph_text(p, new_text):
    """Replace all runs in a paragraph with a single run containing new_text.
    Preserves the first run's formatting (rPr) if available."""
    runs = p.findall(f'{W}r')
    if not runs:
        return

    first_rpr = runs[0].find(f'{W}rPr')
    first_rpr_copy = copy.deepcopy(first_rpr) if first_rpr is not None else None

    for r in runs:
        p.remove(r)

    new_run = etree.SubElement(p, f'{W}r')
    if first_rpr_copy is not None:
        new_run.insert(0, first_rpr_copy)
    new_t = etree.SubElement(new_run, f'{W}t')
    new_t.text = new_text
    new_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')


def remove_element(element):
    """Remove an element from its parent."""
    parent = element.getparent()
    if parent is not None:
        parent.remove(element)


def find_paragraph_by_exact_text(body, target_text):
    """Find first paragraph whose text exactly matches target_text."""
    for p in body.findall(f'{W}p'):
        if get_paragraph_text(p).strip() == target_text:
            return p
    return None


def find_paragraph_containing(body, substring):
    """Find first paragraph whose text contains substring."""
    for p in body.findall(f'{W}p'):
        if substring in get_paragraph_text(p):
            return p
    return None


def find_section_content_range(body, heading_text, next_section_indicators, start_after_text=None):
    """Find paragraphs between a heading and the next section.
    Returns (heading_para, [content_paras_to_replace]).

    start_after_text: optional anchor paragraph text that must appear before heading.
    This avoids matching similarly named entries in the Table of Contents.
    """
    all_paras = list(body.findall(f'{W}p'))
    heading_idx = None
    start_idx = 0

    if start_after_text:
        for i, p in enumerate(all_paras):
            text = get_paragraph_text(p).strip()
            if text == start_after_text:
                start_idx = i + 1
                break

    for i in range(start_idx, len(all_paras)):
        p = all_paras[i]
        text = get_paragraph_text(p).strip()
        if text == heading_text:
            heading_idx = i
            break

    if heading_idx is None:
        return None, []

    content_paras = []
    for i in range(heading_idx + 1, len(all_paras)):
        text = get_paragraph_text(all_paras[i]).strip()
        has_section_break = all_paras[i].find(f'{W}pPr/{W}sectPr') is not None
        has_page_break = False
        for br in all_paras[i].iter(f'{W}br'):
            if br.get(f'{W}type') == 'page':
                has_page_break = True

        if text in next_section_indicators or has_section_break:
            break
        content_paras.append(all_paras[i])

    return all_paras[heading_idx], content_paras


def insert_paragraph_after(body, ref_para, text, style_id='Normal'):
    """Insert a new paragraph with given text after ref_para."""
    new_p = etree.Element(f'{W}p')

    if style_id:
        ppr = etree.SubElement(new_p, f'{W}pPr')
        pstyle = etree.SubElement(ppr, f'{W}pStyle')
        pstyle.set(f'{W}val', style_id)

    new_run = etree.SubElement(new_p, f'{W}r')
    new_t = etree.SubElement(new_run, f'{W}t')
    new_t.text = text
    new_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')

    ref_idx = list(body).index(ref_para)
    body.insert(ref_idx + 1, new_p)
    return new_p


def remove_blank_sections(body):
    """Remove section breaks that produce blank pages.
    A blank page is a sectPr inside a pPr where adjacent paragraphs have no text/images."""
    removed = 0
    children = list(body)

    for i, child in enumerate(children):
        if child.tag != f'{W}p':
            continue

        sect_pr = child.find(f'{W}pPr/{W}sectPr')
        if sect_pr is None:
            continue

        text = get_paragraph_text(child).strip()
        has_drawing = child.find('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}drawing') is not None or \
                      child.find('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline') is not None
        has_image = len(child.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline')) > 0 or \
                    len(child.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}anchor')) > 0

        if not text and not has_drawing and not has_image:
            prev_has_content = False
            if i > 0:
                prev = children[i - 1]
                prev_text = get_paragraph_text(prev).strip() if prev.tag == f'{W}p' else ''
                prev_has_content = bool(prev_text) or prev.find('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline') is not None

            if not prev_has_content:
                ppr = child.find(f'{W}pPr')
                if ppr is not None:
                    ppr.remove(sect_pr)
                    if len(ppr) == 0:
                        child.getparent().remove(child)
                    removed += 1

    return removed


def fix_template(doc_xml_path):
    """Apply all fixes to the document.xml."""
    parser = etree.XMLParser(remove_blank_text=False)
    tree = etree.parse(doc_xml_path, parser)
    root = tree.getroot()
    body = root.find(f'{W}body')

    fixes_applied = []

    # 1. Fix date bug: "{report_date}, 2024" → "{report_date}"
    date_para = find_paragraph_containing(body, '{report_date}')
    if date_para is not None:
        old_text = get_paragraph_text(date_para)
        if ', 2024' in old_text or ', 202' in old_text:
            set_paragraph_text(date_para, '{report_date}')
            fixes_applied.append('Fixed date bug: removed hardcoded ", 2024"')

    # 2. Fix "Jasper, TN 37347" → "{city}, {state} {zip_code}" in LoT
    jasper_para = find_paragraph_containing(body, 'Jasper, TN')
    if jasper_para is not None:
        set_paragraph_text(jasper_para, '{city}, {state} {zip_code}')
        fixes_applied.append('Fixed hardcoded "Jasper, TN 37347" → placeholders')

    # 3. Fix "Mr. Peleg:" → "Dear {client_salutation}:"
    peleg_para = find_paragraph_containing(body, 'Mr. Peleg')
    if peleg_para is not None:
        set_paragraph_text(peleg_para, 'Dear {client_salutation}:')
        fixes_applied.append('Fixed hardcoded "Mr. Peleg:" → {client_salutation}')

    # 4. Fix "47 acres" in LoT body → "{acres} acres" 
    for p in body.findall(f'{W}p'):
        text = get_paragraph_text(p)
        if '47 acres' in text and '{city}' in text:
            new_text = text.replace('47 acres', '{acres} acres')
            set_paragraph_text(p, new_text)
            fixes_applied.append('Fixed hardcoded "47 acres" → "{acres} acres" in LoT')
            break

    # 5. Replace hardcoded Executive Summary content with {executive_summary}
    exec_heading, exec_content = find_section_content_range(
        body,
        'Executive Summary',
        ['SWOT Analysis', 'Project Overview', 'Site Analysis', 'Development Costs'],
        start_after_text='Scope of Work',
    )
    if exec_heading is not None and exec_content:
        for p in exec_content:
            remove_element(p)
        insert_paragraph_after(body, exec_heading, '{executive_summary}')
        fixes_applied.append(f'Replaced {len(exec_content)} hardcoded exec summary paragraphs with {{executive_summary}}')

    # 6. Replace hardcoded SWOT content with {swot_analysis}
    swot_heading, swot_content = find_section_content_range(
        body,
        'SWOT Analysis',
        ['Project Overview', 'Site Analysis', 'Development Costs', 'Industry Overview'],
        start_after_text='Executive Summary',
    )
    if swot_heading is not None and swot_content:
        for p in swot_content:
            remove_element(p)
        insert_paragraph_after(body, swot_heading, '{swot_analysis}')
        fixes_applied.append(f'Replaced {len(swot_content)} hardcoded SWOT paragraphs with {{swot_analysis}}')

    # 7. Remove template instruction text
    instructions_to_remove = [
        '(If no exact address, remove address and use parcel',
    ]
    for instruction in instructions_to_remove:
        p = find_paragraph_containing(body, instruction)
        if p is not None:
            remove_element(p)
            fixes_applied.append(f'Removed template instruction: "{instruction[:50]}..."')

    # 8. Remove blank section breaks
    removed = remove_blank_sections(body)
    if removed > 0:
        fixes_applied.append(f'Removed {removed} blank section breaks')

    # 9. Add {data_sources_appendix} at the end if not present
    existing_ds = find_paragraph_containing(body, '{data_sources_appendix}')
    if existing_ds is None:
        all_paras = body.findall(f'{W}p')
        if all_paras:
            last_content_para = None
            for p in reversed(all_paras):
                if get_paragraph_text(p).strip():
                    last_content_para = p
                    break
            if last_content_para is not None:
                insert_paragraph_after(body, last_content_para, '{data_sources_appendix}')
                fixes_applied.append('Added {data_sources_appendix} placeholder at end of document')

    tree.write(doc_xml_path, xml_declaration=True, encoding='UTF-8', standalone=True)
    return fixes_applied


def main():
    template_key = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TEMPLATE
    template_path = os.path.abspath(get_template_path(template_key))
    backup_path = template_path + '.bak'

    if not os.path.exists(template_path):
        print(f'Template not found: {template_path}')
        sys.exit(1)

    print(f'Fixing template ({template_key}): {template_path}')

    if not os.path.exists(backup_path):
        shutil.copy2(template_path, backup_path)
        print(f'Backup saved to: {backup_path}')
    else:
        print(f'Backup already exists: {backup_path}')

    work_dir = tempfile.mkdtemp(prefix='docx-fix-')
    try:
        with zipfile.ZipFile(template_path, 'r') as zf:
            zf.extractall(work_dir)

        doc_xml = os.path.join(work_dir, 'word', 'document.xml')
        if not os.path.exists(doc_xml):
            print('document.xml not found in template')
            sys.exit(1)

        fixes = fix_template(doc_xml)

        print(f'\nApplied {len(fixes)} fixes:')
        for f in fixes:
            print(f'  - {f}')

        with zipfile.ZipFile(template_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for dirpath, dirnames, filenames in os.walk(work_dir):
                for fn in filenames:
                    full_path = os.path.join(dirpath, fn)
                    arc_name = os.path.relpath(full_path, work_dir)
                    zf.write(full_path, arc_name)

        print(f'\nFixed template saved to: {template_path}')
        print('Run `npx tsx scripts/upload-report-templates.ts` to upload to Supabase.')

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


if __name__ == '__main__':
    main()
