# -*- coding: utf-8 -*-
"""
学校日历（Google Doc 导出的文本）→ site/calendar.json
  {"2026-09-17": {"day": 0, "mode": null, "note": "PEP RALLY..."}, ...}
day: 1-7 上课日 / 0 停课(D0) / null 没有 Day 标记（假期、周末、Term Break）
mode: onsite | chips（同步线上，开 Zoom）| pal（异步，不开 Zoom）| null 未标
九、十年级是 JHS，遇到 "JHS - DAY 3; SHS - DAY 4" 取 JHS。

用法: python3 parse_calendar.py [raw.md] [out.json]
"""
import re, io, json, sys, datetime

RAW = sys.argv[1] if len(sys.argv) > 1 else 'school_calendar_raw.md'
OUT = sys.argv[2] if len(sys.argv) > 2 else '../site/calendar.json'
MONTHS = {m: i + 1 for i, m in enumerate(['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'])}

text = io.open(RAW, encoding='utf-8').read()
lines = text.split('\n')
cal = {}
ym = None
for ln in lines:
    s = ln.strip()
    m = re.match(r'^\|?\s*([A-Z]+)\s+(20\d\d)\s*\|?', s)
    if m and m.group(1) in MONTHS:
        ym = (int(m.group(2)), MONTHS[m.group(1)]); continue
    if not s.startswith('|') or not ym: continue
    cells = [c.strip() for c in s.strip('|').split('|')]
    if any(c == 'SUNDAY' for c in cells) or all(c in ('', ':-:') for c in cells): continue
    for cell in cells:
        m = re.match(r'^(\d{1,2})\\?\)?\s*(.*)$', cell, re.S)
        if not m: continue
        d = int(m.group(1)); rest = m.group(2)
        try: date = datetime.date(ym[0], ym[1], d)
        except ValueError: continue
        up = rest.upper()
        day = None
        mm = re.search(r'JHS\s*-\s*(?:PAL\s+|CHIPS\s+)?DAY\s*(\d)', up)
        if mm: day = int(mm.group(1))
        else:
            mm = re.search(r'\bDAY\s*(\d)', up)
            if mm and not re.search(r'(SEM TEST|IMMERSION DAY|PRACTICE DAY|EXAM DAY|DAY\s*\d\s*\(8|PEACE CAMP|NATIONS DAY|ACTIVITY D\d)', up[:mm.end() + 3]):
                day = int(mm.group(1))
        if re.search(r'DAY\s*\d\s*-\s*NO CLASSES', up): day = 0
        mode = None
        head = up[:60]
        if re.search(r'JHS\s*-\s*PAL', up) or re.search(r'PAL FOR JHS', up) or re.search(r'\bPAL\b', head): mode = 'pal'
        elif re.search(r'\bCHIPS\b', head): mode = 'chips'
        elif re.search(r'\bONSITE\b', head): mode = 'onsite'
        note = re.sub(r'^\(?(JHS|SHS)[^)]*\)?', '', rest)
        note = re.sub(r'^(ONSITE|PAL|CHIPS)?\s*DAY\s*\d\s*(\(\w+\))?\s*(- NO CLASSES)?\s*\??\??', '', note).strip()
        note = re.split(r'(?<=[a-z\)])(?=[A-Z])', note)[0][:60]
        cal[date.isoformat()] = {'day': day, 'mode': mode, 'note': note}

json.dump({'updated': datetime.date.today().isoformat(), 'source': 'XAVIER HIGH SCHOOL CALENDAR SY 2026-2027', 'days': dict(sorted(cal.items()))},
          io.open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
n = len(cal); nd = sum(1 for v in cal.values() if v['day'] is not None)
print(f'{n} dates, {nd} with Day; modes:', {k: sum(1 for v in cal.values() if v['mode'] == k) for k in ('onsite', 'chips', 'pal')})
for k in ['2026-08-24', '2026-08-25', '2026-08-27', '2026-08-28', '2026-09-07', '2026-09-08', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-25', '2026-10-07', '2026-11-25', '2027-01-20', '2027-02-09']:
    print(k, cal.get(k))
