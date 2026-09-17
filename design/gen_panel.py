# -*- coding: utf-8 -*-
import io
from gen import STUS, HEAD, TAIL, svg
T=dict(bg='#f5f4f0',card='#ffffff',ink='#1c1b19',mute='#8a8781',line='#e6e4de',acc='#0f766e',accsoft='#d9f0ec',warn='#b45309',warnsoft='#fdecd2',bad='#b91c1c',badsoft='#fde2e2',blue='#2f6fed',bluesoft='#e4edfd',green='#15803d',greensoft='#dcf5e3',link='#0f766e',linkh='#0b5a54')
def chip(txt,bg,fg,big=False,extra=''):
    return '<div style="padding:%s;border-radius:10px;background:%s;color:%s;font-weight:600;font-size:%s;display:flex;align-items:center;justify-content:center;gap:6px;%s">%s</div>'%('12px 14px' if big else '9px 12px',bg,fg,'15px' if big else '13px',extra,txt)
def sec(t): return '<div style="font-size:11px;font-weight:600;color:%s;letter-spacing:.06em;margin-top:6px">%s</div>'%(T['mute'],t)
def close(): return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>'%T['mute']
def tick(): return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"></path></svg>'

# ---------- Panel (bottom sheet over dimmed main) ----------
def panel():
    exams=[('Q1写作','A'),('Q1听写1','F'),('Q1听写2','B'),('Q1听力阅读','D')]
    exam_html=''.join('<div style="display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:10px;background:%s;min-width:92px"><span style="font-size:11px;color:%s">%s</span><span style="font-size:20px;font-weight:700;color:%s">%s</span></div>'%(
        T['badsoft'] if g=='F' else (T['warnsoft'] if g=='D' else T['bg']), T['mute'], n, T['bad'] if g=='F' else (T['warn'] if g=='D' else T['ink']), g) for n,g in exams)
    recs=[('今天','+1','回答正确',T['green']),('今天','点名','',T['blue']),('9/15','−3','笔记不完整',T['bad']),('9/15','+1','举手回答',T['green']),('9/12','+1','作业准时正确',T['green'])]
    rec_html=''.join('<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid %s;font-size:13px"><span style="color:%s;width:40px">%s</span><span style="font-weight:700;color:%s;width:36px">%s</span><span style="color:%s">%s</span></div>'%(T['line'],T['mute'],d,c,v,T['ink'],r) for d,v,r,c in recs)
    sheet='''<div style="position:absolute;left:0;right:0;bottom:0;background:#ffffff;border-radius:20px 20px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.18);padding:16px 24px 24px;display:flex;flex-direction:column;gap:12px;height:600px;box-sizing:border-box">
  <div style="display:flex;align-items:center;gap:14px">
    <div style="display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:22px;font-weight:700;color:%(ink)s">李梓轩</span><span style="font-size:13px;color:%(mute)s">02 · LI, ZIXUAN</span></div>
      <div style="display:flex;gap:10px;font-size:12px;color:%(mute)s"><span>本季度点名 <b style="color:%(ink)s">3</b> 次</span><span>·</span><span>上次 9/15</span></div></div>
    <div style="flex-grow:1"></div>
    <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:34px;font-weight:800;color:%(ink)s;letter-spacing:-.02em">98</span><span style="padding:3px 9px;border-radius:8px;background:%(greensoft)s;color:%(green)s;font-weight:700;font-size:12px">A</span></div>
    <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s;margin-left:8px">%(close)s</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px">%(row1)s</div>
  <div style="display:grid;grid-template-columns:minmax(0, 1.25fr) minmax(0, 1fr);gap:24px;flex-grow:1;min-height:0">
    <div style="display:flex;flex-direction:column;gap:8px">
      %(sec_plus)s<div style="display:flex;flex-wrap:wrap;gap:8px">%(plus)s</div>
      %(sec_minus)s<div style="display:flex;flex-wrap:wrap;gap:8px">%(minus)s</div>
      %(sec_att)s<div style="display:flex;flex-wrap:wrap;gap:8px">%(att)s</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;min-height:0">
      %(sec_exam)s<div style="display:flex;gap:8px;flex-wrap:wrap">%(exams)s</div>
      %(sec_rec)s<div style="overflow:hidden">%(recs)s</div>
    </div>
  </div>
</div>'''%dict(T,close=close(),
    row1=chip(tick()+'点过了',T['bluesoft'],T['blue'],True)+chip('+1 回答正确',T['greensoft'],T['green'],True),
    sec_plus=sec('加分'),plus=''.join(chip(x,T['greensoft'],T['green']) for x in ['+1 举手回答','+1 作业准时正确','+2 帮助同学','+3 表现突出','自定义 +']),
    sec_minus=sec('减分'),minus=''.join(chip(x,T['badsoft'],T['bad']) for x in ['−1 频繁说话','−3 笔记不完整','−5 作业不达标','−5 玩 iPad','−10 未交作业','自定义 −']),
    sec_att=sec('今日考勤 · 可多选'),att=chip('缺席',T['bg'],T['ink'])+chip('迟到 <span style="font-weight:400;color:%s">12:44</span>'%T['mute'],T['warnsoft'],T['warn'],False,'outline:2px solid %s;outline-offset:-2px'%T['warn'])+chip('摄像头没开','#ece9f7','#5b4b9e',False,'outline:2px solid #5b4b9e;outline-offset:-2px')+chip('无回应 <span style="font-weight:400;color:%s">—:—</span>'%T['mute'],T['bg'],T['ink']),
    sec_exam=sec('上季度成绩'),exams=exam_html,sec_rec=sec('本季度记录'),recs=rec_html)
    h=HEAD%T
    h+='<div style="width:1180px;height:820px;background:%s;position:relative;overflow:hidden"><div style="position:absolute;inset:0;background:rgba(28,27,25,.35)"></div>%s</div>\n'%(T['bg'],sheet)
    return h+TAIL

# ---------- Phone list ----------
def phone():
    rows=''
    for s in sorted(STUS,key=lambda s:s['num'])[:12]:
        dot=''
        if s['risk']==2: dot='<span style="width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['bad']
        elif s['risk']==1: dot='<span style="width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['warn']
        att=''
        if s['att']=='L': att='<span style="font-size:11px;padding:2px 7px;border-radius:99px;background:%s;color:%s;font-weight:600">迟到 12:44</span>'%(T['warnsoft'],T['warn'])
        elif s['att']=='X': att='<span style="font-size:11px;padding:2px 7px;border-radius:99px;background:%s;color:%s;font-weight:600">缺席</span>'%(T['badsoft'],T['bad'])
        elif s['att'] in ('C','N'): att='<span style="font-size:11px;padding:2px 7px;border-radius:99px;background:#ece9f7;color:#5b4b9e;font-weight:600">%s</span>'%('摄像头' if s['att']=='C' else '无回应')
        cnt='<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:%s;color:%s;font-weight:700">0</span>'%(T['bluesoft'],T['blue']) if s['called']==0 else '<span style="font-size:12px;color:%s">%d 次</span>'%(T['mute'],s['called'])
        rows+=('<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid %s;background:#fff;min-height:56px;box-sizing:border-box">'
               '<span style="width:24px;font-size:13px;color:%s;font-variant-numeric:tabular-nums">%02d</span>'
               '<div style="flex-grow:1;display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:16px;font-weight:600;color:%s">%s</span>%s</div><div style="display:flex;gap:8px;align-items:center">%s%s</div></div>'
               '<span style="font-size:20px;font-weight:700;color:%s;font-variant-numeric:tabular-nums">%d</span></div>')%(T['line'],T['mute'],s['num'],T['ink'],s['name'],dot,cnt,att,T['ink'],s['score'])
    h=HEAD%T
    h+='''<div style="width:390px;height:844px;background:%(bg)s;display:flex;flex-direction:column;box-sizing:border-box">
  <div style="padding:56px 16px 10px;background:#fff;border-bottom:1px solid %(line)s;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px;font-weight:800;color:%(ink)s">9E</span><span style="font-size:13px;color:%(mute)s">D7 · 9月17日</span><div style="flex-grow:1"></div><span style="padding:5px 10px;border-radius:99px;background:%(accsoft)s;color:%(acc)s;font-size:12px;font-weight:600">线上课</span><div style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s">%(menu)s</div></div>
    <div style="display:flex;gap:6px;overflow:hidden"><span style="padding:6px 11px;border-radius:99px;background:%(badsoft)s;color:%(bad)s;font-size:12px;font-weight:600;white-space:nowrap">有 F · 6</span><span style="padding:6px 11px;border-radius:99px;background:%(bluesoft)s;color:%(blue)s;font-size:12px;font-weight:600;white-space:nowrap">0 次 · 11</span><span style="padding:6px 11px;border-radius:99px;border:1px solid %(line)s;color:%(ink)s;font-size:12px;font-weight:600;white-space:nowrap">考勤报告</span></div>
  </div>
  <div style="flex-grow:1;overflow:hidden">%(rows)s</div>
  <div style="padding:10px 16px 28px;background:#fff;border-top:1px solid %(line)s;display:flex;gap:6px"><div style="flex-grow:1;padding:11px;border-radius:10px;background:%(ink)s;color:#fff;text-align:center;font-weight:600;font-size:14px">9E</div><div style="flex-grow:1;padding:11px;border-radius:10px;background:%(bg)s;color:%(mute)s;text-align:center;font-weight:600;font-size:14px">10H</div><div style="flex-grow:1;padding:11px;border-radius:10px;background:%(bg)s;color:%(mute)s;text-align:center;font-weight:600;font-size:14px">10A</div></div>
</div>
'''%dict(T,menu=svg('menu',T['ink']),rows=rows)
    return h+TAIL

def phoneSeat():
    from gen import GROUPS
    def card(st,head=False):
        dot=''
        if st['risk']==2: dot='<span style="position:absolute;top:6px;right:6px;width:6px;height:6px;border-radius:99px;background:%s"></span>'%T['bad']
        elif st['risk']==1: dot='<span style="position:absolute;top:6px;right:6px;width:6px;height:6px;border-radius:99px;background:%s"></span>'%T['warn']
        bar='<span style="position:absolute;left:8px;right:8px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:%s"></span>'%T['blue'] if st['called']==0 else ''
        op='opacity:.45;' if st['att']=='X' else ''
        gc='grid-column:1 / span 2;' if head else ''
        return ('<div style="%s%sposition:relative;background:#fff;border:1px solid %s;border-radius:9px;padding:8px 6px 8px;display:flex;flex-direction:column;align-items:center;gap:1px;min-height:58px;overflow:hidden">'
                '%s<span style="font-size:13px;font-weight:600;color:%s">%s</span><span style="font-size:17px;font-weight:700;color:%s">%d</span>%s</div>')%(gc,op,T['line'],dot,T['ink'],st['name'],T['ink'],st['score'],bar)
    groups=''
    for gi,g in enumerate(GROUPS):
        ss=STUS[gi*5:gi*5+5]
        groups+=('<div style="display:flex;flex-direction:column;gap:5px"><div style="font-size:11px;font-weight:600;color:%s;letter-spacing:.06em">%s</div>'
                 '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:5px">%s%s</div></div>')%(T['mute'],g,card(ss[0],True),''.join(card(x) for x in ss[1:]))
    h=HEAD%T
    h+='''<div style="width:390px;height:844px;background:%(bg)s;display:flex;flex-direction:column;box-sizing:border-box">
  <div style="padding:56px 16px 10px;background:#fff;border-bottom:1px solid %(line)s;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px;font-weight:800;color:%(ink)s">9E</span><span style="font-size:13px;color:%(mute)s">D7 · 9月17日</span><div style="flex-grow:1"></div><div style="display:flex;gap:2px;background:%(bg)s;padding:3px;border-radius:9px;font-size:12px;font-weight:600"><div style="padding:5px 10px;border-radius:7px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);color:%(ink)s">座位</div><div style="padding:5px 10px;border-radius:7px;color:%(mute)s">名单</div></div><div style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s">%(menu)s</div></div>
    <div style="display:flex;gap:6px;overflow:hidden"><span style="padding:6px 11px;border-radius:99px;background:%(badsoft)s;color:%(bad)s;font-size:12px;font-weight:600;white-space:nowrap">有 F · 6</span><span style="padding:6px 11px;border-radius:99px;background:%(bluesoft)s;color:%(blue)s;font-size:12px;font-weight:600;white-space:nowrap">0 次 · 11</span><span style="padding:6px 11px;border-radius:99px;border:1px solid %(line)s;color:%(ink)s;font-size:12px;font-weight:600;white-space:nowrap">轮转</span></div>
  </div>
  <div style="flex-grow:1;overflow:hidden;padding:14px 16px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px 12px;align-content:start">%(groups)s</div>
  <div style="padding:10px 16px 28px;background:#fff;border-top:1px solid %(line)s;display:flex;gap:6px"><div style="flex-grow:1;padding:11px;border-radius:10px;background:%(ink)s;color:#fff;text-align:center;font-weight:600;font-size:14px">9E</div><div style="flex-grow:1;padding:11px;border-radius:10px;background:%(bg)s;color:%(mute)s;text-align:center;font-weight:600;font-size:14px">10H</div><div style="flex-grow:1;padding:11px;border-radius:10px;background:%(bg)s;color:%(mute)s;text-align:center;font-weight:600;font-size:14px">10A</div></div>
</div>
'''%dict(T,menu=svg('menu',T['ink']),groups=groups)
    return h+TAIL
io.open('PhoneSeat.dc.html','w',encoding='utf-8').write(phoneSeat())
io.open('Panel.dc.html','w',encoding='utf-8').write(panel())
io.open('Phone.dc.html','w',encoding='utf-8').write(phone())
print('panel+phone ok')
