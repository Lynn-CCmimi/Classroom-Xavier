# -*- coding: utf-8 -*-
import io, random
from gen import STUS, GROUPS, ENG, HEAD, TAIL, svg
random.seed(11)
def dirMain(view='seat'):
    T=dict(bg='#f5f4f0',card='#ffffff',ink='#1c1b19',mute='#8a8781',line='#e6e4de',acc='#0f766e',accsoft='#d9f0ec',warn='#b45309',warnsoft='#fdecd2',bad='#b91c1c',badsoft='#fde2e2',blue='#2f6fed',bluesoft='#e4edfd',link='#0f766e',linkh='#0b5a54')
    def card(s,head=False):
        dot=''
        if s['risk']==2: dot='<span style="position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:99px;background:%(bad)s"></span>'%T
        elif s['risk']==1: dot='<span style="position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:99px;background:%(warn)s"></span>'%T
        if s['att']=='L': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:%(warnsoft)s;color:%(warn)s;font-weight:600">迟到 12:44</span>'%T
        elif s['att']=='X': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:%(badsoft)s;color:%(bad)s;font-weight:600">缺席</span>'%T
        elif s['att']=='C': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:#ece9f7;color:#5b4b9e;font-weight:600">摄像头</span>'
        elif s['att']=='N': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:#ece9f7;color:#5b4b9e;font-weight:600">无回应</span>'
        else: chip='<span style="font-size:10px;color:%(mute)s">%(n)02d</span>'%dict(T,n=s['num'])
        op='opacity:.45;' if s['att']=='X' else ''
        gc='grid-column:1 / span 2;' if head else ''
        bar='<span style="position:absolute;left:10px;right:10px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:%s"></span>'%T['blue'] if s['called']==0 else ''
        return ('<div style="%s%sposition:relative;background:%s;border:1px solid %s;border-radius:10px;padding:10px 8px 9px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:72px;overflow:hidden">'
                '%s<div style="font-size:14px;font-weight:600;color:%s">%s</div><div style="font-size:20px;font-weight:700;color:%s;letter-spacing:-.02em">%d</div>%s%s</div>')%(gc,op,T['card'],T['line'],dot,T['ink'],s['name'],T['ink'],s['score'],chip,bar)
    sel='background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.08);color:%s'%T['ink']
    uns='color:%s'%T['mute']
    H=dict(T,rot=svg('rot',T['ink']),cal=svg('cal',T['ink']),wifi=svg('wifi',T['acc']),menu=svg('menu',T['ink']),seatsel=sel if view=='seat' else uns,listsel=sel if view=='list' else uns)
    header=('<div style="display:flex;align-items:center;gap:14px;padding:14px 24px;background:#ffffff;border-bottom:1px solid %(line)s">'
      '<div style="display:flex;gap:4px;background:%(bg)s;padding:4px;border-radius:10px">'
      '<div style="padding:7px 18px;border-radius:7px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.08);font-weight:600;font-size:14px;color:%(ink)s">9E</div>'
      '<div style="padding:7px 18px;border-radius:7px;font-weight:500;font-size:14px;color:%(mute)s">10H</div>'
      '<div style="padding:7px 18px;border-radius:7px;font-weight:500;font-size:14px;color:%(mute)s">10A</div></div>'
      '<div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border:1px solid %(line)s;border-radius:10px;font-size:14px;color:%(ink)s">%(cal)s<span style="font-weight:600">D7</span><span style="color:%(mute)s">· 9月17日 周三</span></div>'
      '<div style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;background:%(accsoft)s;color:%(acc)s;font-size:13px;font-weight:600">%(wifi)s线上课</div>'
      '<div style="display:flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid %(line)s;border-radius:10px;font-size:13px;font-weight:600;color:%(ink)s">%(rot)s轮转</div>'
      '<div style="flex-grow:1"></div>'
      '<div style="display:flex;gap:2px;background:%(bg)s;padding:3px;border-radius:9px;font-size:12px;font-weight:600"><div style="padding:6px 12px;border-radius:7px;%(seatsel)s">座位</div><div style="padding:6px 12px;border-radius:7px;%(listsel)s">名单</div></div>'
      '<div style="display:flex;gap:6px"><div style="padding:7px 12px;border-radius:99px;background:%(badsoft)s;color:%(bad)s;font-size:12px;font-weight:600">有 F · 6</div>'
      '<div style="padding:7px 12px;border-radius:99px;background:%(bluesoft)s;color:%(blue)s;font-size:12px;font-weight:600">本季 0 次 · 11</div></div>'
      '<div style="width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s">%(menu)s</div></div>')%H
    legend=('<div style="padding:8px 24px 12px;display:flex;justify-content:center;gap:24px;font-size:11px;color:%(mute)s">'
      '<span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:99px;background:%(bad)s"></span>上季度有 F</span>'
      '<span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:99px;background:%(warn)s"></span>上季度有 D</span>'
      '<span style="display:flex;align-items:center;gap:6px"><span style="width:18px;height:3px;border-radius:2px;background:%(blue)s"></span>本季度还没被点过</span>'
      '<span>单击 → 面板 · 长按 → 点过了</span><span>轮转按钮只在 9E 显示</span></div>')%T
    if view=='seat':
        groups=''
        for gi,g in enumerate(GROUPS):
            ss=STUS[gi*5:gi*5+5]
            groups+=('<div style="display:flex;flex-direction:column;gap:6px"><div style="font-size:11px;font-weight:600;color:%s;letter-spacing:.06em;padding-left:2px">%s</div>'
                     '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:6px">%s%s</div></div>')%(T['mute'],g,card(ss[0],True),''.join(card(s) for s in ss[1:]))
        body='<div style="flex-grow:1;padding:18px 24px;display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:18px 16px;align-content:start">%s</div>'%groups
    else:
        rows=''
        order=sorted(STUS,key=lambda s:s['num'])
        for s in order[:24]:
            risk='<span style="color:%s">—</span>'%T['line']
            if s['risk']==2: risk='<span style="padding:2px 8px;border-radius:6px;background:%(badsoft)s;color:%(bad)s;font-weight:700;font-size:11px">F</span>'%T
            elif s['risk']==1: risk='<span style="padding:2px 8px;border-radius:6px;background:%(warnsoft)s;color:%(warn)s;font-weight:700;font-size:11px">D</span>'%T
            att='<span style="color:%s">出勤</span>'%T['mute']
            if s['att']=='L': att='<span style="color:%(warn)s;font-weight:600">迟到 12:44</span>'%T
            elif s['att']=='X': att='<span style="color:%(bad)s;font-weight:600">缺席</span>'%T
            elif s['att']=='C': att='<span style="color:#5b4b9e;font-weight:600">摄像头</span>'
            elif s['att']=='N': att='<span style="color:#5b4b9e;font-weight:600">无回应 13:15</span>'
            called='<span style="padding:2px 10px;border-radius:6px;background:%(bluesoft)s;color:%(blue)s;font-weight:700;font-size:12px">0</span>'%T if s['called']==0 else '<span style="color:%s;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">%d</span>'%(T['ink'],s['called'])
            rows+=('<div style="display:grid;grid-template-columns:36px 1fr 150px 70px 60px 80px 130px;align-items:center;gap:12px;padding:9px 14px;border-bottom:1px solid %s;font-size:13px;background:#fff">'
                   '<span style="color:%s;font-variant-numeric:tabular-nums">%02d</span><span style="font-weight:600;color:%s">%s</span><span style="color:%s;font-size:11px">%s</span>'
                   '<span style="font-weight:700;font-variant-numeric:tabular-nums;color:%s">%d</span><span>%s</span><span>%s</span><span>%s</span></div>')%(T['line'],T['mute'],s['num'],T['ink'],s['name'],T['mute'],random.choice(ENG),T['ink'],s['score'],risk,called,att)
        body=('<div style="flex-grow:1;padding:14px 24px 0;display:flex;flex-direction:column;min-height:0"><div style="border:1px solid %s;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-height:0">'
              '<div style="display:grid;grid-template-columns:36px 1fr 150px 70px 60px 80px 130px;gap:12px;padding:8px 14px;font-size:11px;color:%s;font-weight:600;letter-spacing:.04em;border-bottom:1px solid %s;background:%s"><span>#</span><span>姓名</span><span>英文名</span><span>本季分</span><span>上季</span><span>点名次数</span><span>今日</span></div>'
              '<div style="overflow:hidden">%s</div></div></div>')%(T['line'],T['mute'],T['line'],T['bg'],rows)
    h=HEAD%T
    h+='<div style="width:1180px;height:820px;background:%s;display:flex;flex-direction:column;box-sizing:border-box">%s%s%s</div>\n'%(T['bg'],header,body,legend)
    return h+TAIL
io.open('Main.dc.html','w',encoding='utf-8').write(dirMain('seat'))
io.open('MainList.dc.html','w',encoding='utf-8').write(dirMain('list'))
print('main ok')
