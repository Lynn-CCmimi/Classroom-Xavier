# -*- coding: utf-8 -*-
import io
from gen import STUS, GROUPS, HEAD, TAIL, svg
T=dict(bg='#f5f4f0',ink='#1c1b19',mute='#8a8781',line='#e6e4de',acc='#0f766e',accsoft='#d9f0ec',warn='#b45309',bad='#b91c1c',blue='#2f6fed',floor='#ece9e1',desk='#e3ddd0',deskdark='#d6cfbf',link='#0f766e',linkh='#0b5a54')
def seat(s,w=88,h=60,fs=13,head=False):
    dot=''
    if s['risk']==2: dot='<span style="position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['bad']
    elif s['risk']==1: dot='<span style="position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:99px;background:%s"></span>'%T['warn']
    bar='<span style="position:absolute;left:10px;right:10px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:%s"></span>'%T['blue'] if s['called']==0 else ''
    chair='<span style="position:absolute;left:50%%;bottom:-9px;transform:translateX(-50%%);width:%dpx;height:6px;border-radius:0 0 6px 6px;background:%s"></span>'%(int(w*.5),T['deskdark'])
    return ('<div style="position:relative;width:%dpx;height:%dpx;background:#fff;border-radius:10px;box-shadow:0 1px 2px rgba(28,27,25,.08),0 6px 14px -8px rgba(28,27,25,.25);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;overflow:visible">'
            '%s<span style="font-size:%dpx;font-weight:600;color:%s;line-height:1.1">%s</span><span style="font-family:Sora,system-ui;font-size:%dpx;font-weight:700;color:%s;letter-spacing:-.03em">%d</span>%s%s</div>')%(w,h,dot,fs,T['ink'],s['name'],fs+4,T['ink'],s['score'],bar,chair)
def table(g,ss,back=False):
    sc=.92 if back else 1
    # convex desk: head on top spanning, 2x2 below; desk surface drawn behind seats
    seats_head=seat(ss[0],w=int(184*sc),h=int(58*sc),fs=13,head=True)
    rows=''.join('<div style="display:flex;gap:%dpx">%s%s</div>'%(int(8*sc),seat(ss[i],w=int(88*sc),h=int(58*sc),fs=12),seat(ss[i+1],w=int(88*sc),h=int(58*sc),fs=12)) for i in (1,3))
    return ('<div style="display:flex;flex-direction:column;align-items:center;gap:6px;opacity:%s">'
            '<div style="font-size:11px;font-weight:700;color:%s;letter-spacing:.08em;display:flex;align-items:center;gap:6px"><span style="width:6px;height:6px;border-radius:99px;background:%s"></span>%s <span style="font-weight:500;color:%s">· 组长 %s</span></div>'
            '<div style="position:relative;padding:%dpx %dpx %dpx;border-radius:%dpx;background:linear-gradient(180deg,%s,%s);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 10px 24px -14px rgba(28,27,25,.35);display:flex;flex-direction:column;gap:%dpx;align-items:center">'
            '%s%s</div></div>')%('.94' if back else '1',T['mute'],T['warn'],g,T['mute'],ss[0]['name'],int(14*sc),int(14*sc),int(18*sc),int(22*sc),T['desk'],T['deskdark'],int(14*sc),seats_head,rows)
def spatial():
    back=''.join(table(GROUPS[i],STUS[i*5:i*5+5],back=True) for i in range(4))
    front=''.join(table(GROUPS[i],STUS[i*5:i*5+5]) for i in range(4,8))
    h=HEAD%T
    h+='''<div style="width:1180px;height:820px;background:%(bg)s;display:flex;flex-direction:column;box-sizing:border-box">
  <div style="display:flex;align-items:center;gap:14px;padding:12px 24px;background:rgba(255,255,255,.9);border-bottom:1px solid %(line)s">
    <div style="display:flex;gap:4px;background:%(bg)s;padding:4px;border-radius:10px"><div style="padding:7px 18px;border-radius:7px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);font-weight:600;font-size:14px">9E</div><div style="padding:7px 18px;color:%(mute)s;font-weight:500;font-size:14px">10H</div><div style="padding:7px 18px;color:%(mute)s;font-weight:500;font-size:14px">10A</div></div>
    <div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border:1px solid %(line)s;border-radius:10px;font-size:14px;background:#fff">%(cal)s<b>D5</b><span style="color:%(mute)s">· 9月21日 周一</span></div>
    <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;background:%(accsoft)s;color:%(acc)s;font-size:13px;font-weight:600">%(wifi)s线上 · Zoom</div>
    <div style="flex-grow:1"></div>
    <div style="display:flex;gap:2px;background:%(bg)s;padding:3px;border-radius:9px;font-size:12px;font-weight:600"><div style="padding:6px 12px;border-radius:7px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08)">座位</div><div style="padding:6px 12px;color:%(mute)s">名单</div></div>
    <div style="padding:7px 12px;border-radius:99px;background:#fde2e2;color:%(bad)s;font-size:12px;font-weight:600">有 F · 12</div>
    <div style="padding:7px 12px;border-radius:99px;background:#e4edfd;color:%(blue)s;font-size:12px;font-weight:600">Q2 0 次 · 39</div>
    <div style="width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s;background:#fff">%(menu)s</div>
  </div>
  <div style="flex-grow:1;position:relative;padding:18px 28px 0;background:radial-gradient(120%% 80%% at 50%% 100%%, #f1eee6 0%%, %(bg)s 70%%)">
    <div style="position:absolute;left:28px;top:18px;bottom:64px;width:26px;border-radius:8px;background:%(floor)s;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:10px 0;font-size:10px;color:%(mute)s;writing-mode:vertical-rl;letter-spacing:.2em"><span>后门</span><span>前门</span></div>
    <div style="margin-left:44px;display:flex;flex-direction:column;gap:22px;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 10px">%(back)s</div>
      <div style="height:1px;margin:0 60px;background:repeating-linear-gradient(90deg,#d8d3c8 0 6px,transparent 6px 14px)"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 10px">%(front)s</div>
    </div>
    <div style="position:absolute;left:72px;right:28px;bottom:14px;height:34px;border-radius:8px;background:linear-gradient(180deg,#3b3a36,#2a2926);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 6px 14px -6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:11px;letter-spacing:.2em;color:#cfcbc2">WHITEBOARD · 黑板</div>
  </div>
</div>
'''%dict(T,cal=svg('cal',T['ink']),wifi=svg('wifi',T['acc']),menu=svg('menu',T['ink']),back=back,front=front)
    return h+TAIL
io.open('Spatial.dc.html','w',encoding='utf-8').write(spatial())
print('spatial ok')
