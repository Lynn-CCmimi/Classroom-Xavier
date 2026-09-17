# -*- coding: utf-8 -*-
import io
from gen import STUS, GROUPS, HEAD, TAIL, svg
# 8 组各一个低饱和柔色（oklch 同明度同彩度，只变色相）
HUES=[('mint','#e3f4ee','#1f7a5c'),('sky','#e4eefb','#2b62b8'),('lilac','#ece8fa','#5b48a8'),('peach','#fdebe0','#b8562a'),
      ('lemon','#f8f2d6','#8a6b12'),('rose','#fbe6ec','#b02f5a'),('sage','#e8f1de','#4e7a24'),('sand','#f1ece0','#7a5a2a')]
T=dict(bg='#f7f7f4',ink='#1c1b19',mute='#8a8781',line='#e8e6e0',acc='#0f9d84',accsoft='#dcf5ee',warn='#c2410c',bad='#c81e1e',blue='#2f6fed',link='#0f9d84',linkh='#0b7a66')
def header(title_acc):
    return '''<div style="display:flex;align-items:center;gap:12px;padding:12px 24px;background:#fff;border-bottom:1px solid %(line)s">
    <div style="display:flex;gap:4px;background:%(bg)s;padding:4px;border-radius:12px"><div style="padding:7px 18px;border-radius:9px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);font-weight:600;font-size:14px">9E</div><div style="padding:7px 18px;color:%(mute)s;font-weight:500;font-size:14px">10H</div><div style="padding:7px 18px;color:%(mute)s;font-weight:500;font-size:14px">10A</div></div>
    <div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:12px;font-size:14px;background:%(bg)s">%(cal)s<b>D5</b><span style="color:%(mute)s">· 9月21日 周一</span></div>
    <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:12px;background:%(accsoft)s;color:%(acc)s;font-size:13px;font-weight:600">%(wifi)s线上 · Zoom</div>
    <div style="flex-grow:1"></div>
    <div style="display:flex;gap:2px;background:%(bg)s;padding:3px;border-radius:10px;font-size:12px;font-weight:600"><div style="padding:6px 12px;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)">座位</div><div style="padding:6px 12px;color:%(mute)s">名单</div></div>
    <div style="padding:7px 12px;border-radius:99px;background:#fde4e4;color:%(bad)s;font-size:12px;font-weight:600">有 F · 12</div>
    <div style="padding:7px 12px;border-radius:99px;background:#e4edfd;color:%(blue)s;font-size:12px;font-weight:600">Q2 0 次 · 39</div>
    <div style="width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:%(bg)s">%(menu)s</div>
  </div>'''%dict(T,cal=svg('cal',T['ink']),wifi=svg('wifi',T['acc']),menu=svg('menu',T['ink']))

# ---------- D · 彩色分组 ----------
def dirD():
    def card(s,hue,head=False):
        name,soft,deep=hue
        dot=''
        if s['risk']==2: dot='<span style="position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['bad']
        elif s['risk']==1: dot='<span style="position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['warn']
        bar='<span style="position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:%s"></span>'%T['blue'] if s['called']==0 else ''
        gc='grid-column:1 / span 2;' if head else ''
        return ('<div style="%sposition:relative;background:#fff;border-radius:12px;padding:10px 6px 9px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:72px;overflow:hidden;box-shadow:0 1px 2px rgba(28,27,25,.05)">'
                '%s<span style="font-size:14px;font-weight:600;color:%s">%s</span><span style="font-size:20px;font-weight:700;color:%s;letter-spacing:-.02em">%d</span>%s</div>')%(gc,dot,T['ink'],s['name'],T['ink'],s['score'],bar)
    groups=''
    for gi,g in enumerate(GROUPS):
        ss=STUS[gi*5:gi*5+5]; hue=HUES[gi]
        groups+=('<div style="display:flex;flex-direction:column;gap:7px;padding:8px;border-radius:16px;background:%s">'
                 '<div style="display:flex;align-items:center;gap:8px;padding:0 4px"><span style="width:22px;height:22px;border-radius:7px;background:#fff;color:%s;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center">%s</span><span style="font-size:11px;font-weight:600;color:%s">组长 %s</span></div>'
                 '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:6px">%s%s</div></div>')%(hue[1],hue[2],g.replace('组',''),hue[2],ss[0]['name'],card(ss[0],hue,True),''.join(card(x,hue) for x in ss[1:]))
    h=HEAD%T
    h+='<div style="width:1180px;height:820px;background:%s;display:flex;flex-direction:column;box-sizing:border-box">%s<div style="flex-grow:1;padding:18px 24px 0;display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:16px 14px;align-content:start">%s</div><div style="margin:10px 24px 14px;text-align:center;font-size:11px;color:%s;letter-spacing:.14em;padding:6px;background:#efeee9;border-radius:8px">WHITEBOARD · 黑板</div></div>\n'%(T['bg'],header(T['acc']),groups,T['mute'])
    return h+TAIL

# ---------- E · 通透线条 ----------
def dirE():
    def card(s,hue,head=False):
        name,soft,deep=hue
        dot=''
        if s['risk']==2: dot='<span style="position:absolute;top:8px;right:8px;width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['bad']
        elif s['risk']==1: dot='<span style="position:absolute;top:8px;right:8px;width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['warn']
        bar='<span style="position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:%s"></span>'%T['blue'] if s['called']==0 else ''
        gc='grid-column:1 / span 2;' if head else ''
        return ('<div style="%sposition:relative;background:#fff;border:1px solid %s;border-top:3px solid %s;border-radius:12px;padding:10px 6px 9px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:72px;overflow:hidden">'
                '%s<span style="font-size:14px;font-weight:500;color:%s">%s</span><span style="font-size:20px;font-weight:600;color:%s;letter-spacing:-.02em">%d</span>%s</div>')%(gc,T['line'],deep,dot,T['ink'],s['name'],T['ink'],s['score'],bar)
    groups=''
    for gi,g in enumerate(GROUPS):
        ss=STUS[gi*5:gi*5+5]; hue=HUES[gi]
        groups+=('<div style="display:flex;flex-direction:column;gap:8px">'
                 '<div style="display:flex;align-items:center;gap:8px"><span style="padding:3px 10px;border-radius:99px;background:%s;color:%s;font-size:11px;font-weight:700;letter-spacing:.04em">%s</span><span style="font-size:11px;color:%s">组长 %s</span></div>'
                 '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">%s%s</div></div>')%(hue[1],hue[2],g,T['mute'],ss[0]['name'],card(ss[0],hue,True),''.join(card(x,hue) for x in ss[1:]))
    h=HEAD%T
    h+='<div style="width:1180px;height:820px;background:#ffffff;display:flex;flex-direction:column;box-sizing:border-box">%s<div style="flex-grow:1;padding:22px 28px 0;display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:22px 18px;align-content:start">%s</div><div style="margin:12px 28px 16px;text-align:center;font-size:11px;color:%s;letter-spacing:.14em;padding:6px;border-top:1px dashed %s">WHITEBOARD · 黑板</div></div>\n'%(header(T['acc']),groups,T['mute'],T['line'])
    return h+TAIL
io.open('DirectionD.dc.html','w',encoding='utf-8').write(dirD())
io.open('DirectionE.dc.html','w',encoding='utf-8').write(dirE())
print('fresh ok')
