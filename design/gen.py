# -*- coding: utf-8 -*-
import random, io
random.seed(7)
NAMES=['张浩然','李梓轩','王宇翔','陈嘉豪','刘子墨','杨思远','黄一鸣','赵天佑','周子涵','吴俊杰',
'徐浩宇','孙明轩','马子睿','朱俊熙','胡宇辰','郭子豪','林致远','何泽宇','高睿','罗俊豪',
'梁子轩','宋浩','唐嘉睿','许博文','邓子墨','冯晨阳','曹俊','彭宇','曾梓豪','萧宸',
'田一诺','董博','袁子航','潘思睿','蒋天翊','蔡明哲','余浩', '杜承','叶泽','程一帆']
ENG=['CHUA, J.','LIM, B.','TAN, K.','ONG, L.','SY, R.','GO, M.','CO, A.','YAP, D.']
def stu(i):
    n=NAMES[i]; sc=random.choice([94,98,100,101,102,103,104,106,108,112])
    att=random.choice(['','','','','','L','X','C','N'])
    risk=random.choice([0,0,0,0,1,2])  # 1=D 2=F
    called=random.choice([0,0,1,2,3,5])
    return dict(name=n,num=i+1,score=sc,att=att,risk=risk,called=called)
STUS=[stu(i) for i in range(40)]
GROUPS=['组A','组B','组C','组D','组E','组F','组G','组H']

HEAD='''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: %(link)s; } a:hover { color: %(linkh)s; }
  </style>
</helmet>
'''
TAIL='''</x-dc>
</body>
</html>
'''
def svg(name,color):
    if name=='menu': return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>'%color
    if name=='cal': return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>'%color
    if name=='wifi': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round"><path d="M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"></path></svg>'%color
    if name=='rot': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 3v6h-6"></path></svg>'%color
    if name=='filter': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"></path></svg>'%color

# ---------- Direction A : 清爽白板 ----------
def dirA():
    T=dict(bg='#f5f4f0',card='#ffffff',ink='#1c1b19',mute='#8a8781',line='#e6e4de',acc='#0f766e',accsoft='#d9f0ec',warn='#b45309',warnsoft='#fdecd2',bad='#b91c1c',badsoft='#fde2e2',link='#0f766e',linkh='#0b5a54')
    def card(s,head=False):
        dot=''
        if s['risk']==2: dot='<span style="position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:99px;background:%(bad)s"></span>'%T
        elif s['risk']==1: dot='<span style="position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:99px;background:%(warn)s"></span>'%T
        chip=''
        if s['att']=='L': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:%(warnsoft)s;color:%(warn)s;font-weight:600">迟到 12:44</span>'%T
        elif s['att']=='X': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:%(badsoft)s;color:%(bad)s;font-weight:600">缺席</span>'%T
        elif s['att']=='C': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:#ece9f7;color:#5b4b9e;font-weight:600">摄像头</span>'
        elif s['att']=='N': chip='<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:#ece9f7;color:#5b4b9e;font-weight:600">无回应</span>'
        else: chip='<span style="font-size:10px;color:%(mute)s">被点 %(c)d</span>'%dict(T,c=s['called'])
        op='opacity:.45;' if s['att']=='X' else ''
        gc='grid-column:1 / span 2;' if head else ''
        return ('<div style="%s%sposition:relative;background:%s;border:1px solid %s;border-radius:10px;padding:10px 8px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:72px">'
                '%s<div style="font-size:14px;font-weight:600;color:%s">%s</div><div style="font-size:20px;font-weight:700;color:%s;letter-spacing:-.02em">%d</div>%s</div>')%(gc,op,T['card'],T['line'],dot,T['ink'],s['name'],T['ink'],s['score'],chip)
    groups=''
    for gi,g in enumerate(GROUPS):
        ss=STUS[gi*5:gi*5+5]
        groups+=('<div style="display:flex;flex-direction:column;gap:6px"><div style="font-size:11px;font-weight:600;color:%s;letter-spacing:.06em;text-transform:uppercase;padding-left:2px">%s</div>'
                 '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:6px">%s%s</div></div>')%(T['mute'],g,card(ss[0],True),''.join(card(s) for s in ss[1:]))
    h=HEAD%T
    h+='''<div style="width:1180px;height:820px;background:%(bg)s;display:flex;flex-direction:column;box-sizing:border-box">
  <div style="display:flex;align-items:center;gap:16px;padding:14px 24px;background:#ffffff;border-bottom:1px solid %(line)s">
    <div style="display:flex;gap:4px;background:%(bg)s;padding:4px;border-radius:10px">
      <div style="padding:7px 18px;border-radius:7px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.08);font-weight:600;font-size:14px;color:%(ink)s">9E</div>
      <div style="padding:7px 18px;border-radius:7px;font-weight:500;font-size:14px;color:%(mute)s">10H</div>
      <div style="padding:7px 18px;border-radius:7px;font-weight:500;font-size:14px;color:%(mute)s">10A</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border:1px solid %(line)s;border-radius:10px;font-size:14px;color:%(ink)s">%(cal)s<span style="font-weight:600">D7</span><span style="color:%(mute)s">· 9月17日 周三</span></div>
    <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;background:%(accsoft)s;color:%(acc)s;font-size:13px;font-weight:600">%(wifi)s线上课</div>
    <div style="flex-grow:1"></div>
    <div style="display:flex;gap:6px">
      <div style="padding:7px 12px;border-radius:99px;background:%(badsoft)s;color:%(bad)s;font-size:12px;font-weight:600">有 F · 6</div>
      <div style="padding:7px 12px;border-radius:99px;border:1px solid %(line)s;color:%(mute)s;font-size:12px;font-weight:600">还没被点 · 14</div>
    </div>
    <div style="width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s">%(menu)s</div>
  </div>
  <div style="flex-grow:1;padding:18px 24px;display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:18px 16px;align-content:start">%(groups)s</div>
  <div style="padding:8px 24px 12px;display:flex;justify-content:center;gap:24px;font-size:11px;color:%(mute)s"><span>● 红点 = 上季度有 F</span><span>● 橙点 = 上季度有 D</span><span>被点 N = 本季度被叫到次数</span></div>
</div>
'''%dict(T,cal=svg('cal',T['ink']),wifi=svg('wifi',T['acc']),menu=svg('menu',T['ink']),groups=groups)
    return h+TAIL

# ---------- Direction B : 深色讲台 ----------
def dirB():
    T=dict(bg='#15181d',card='#1f242b',ink='#ecebe6',mute='#8d939c',line='#2c323b',acc='#f2b544',accsoft='#3a2f14',warn='#f2b544',bad='#f0605d',badsoft='#3a1c1c',link='#f2b544',linkh='#d99e2e')
    def card(s,head=False):
        bar='transparent'
        if s['risk']==2: bar=T['bad']
        elif s['risk']==1: bar=T['warn']
        chip=''
        if s['att']=='L': chip='<span style="font-size:10px;color:%(warn)s;font-weight:600">迟到 12:44</span>'%T
        elif s['att']=='X': chip='<span style="font-size:10px;color:%(bad)s;font-weight:600">缺席</span>'%T
        elif s['att'] in ('C','N'): chip='<span style="font-size:10px;color:#a79bdc;font-weight:600">%s</span>'%('摄像头' if s['att']=='C' else '无回应')
        else: chip='<span style="font-size:10px;color:%(mute)s">%(c)d 次</span>'%dict(T,c=s['called'])
        op='opacity:.35;' if s['att']=='X' else ''
        gc='grid-column:1 / span 2;' if head else ''
        return ('<div style="%s%sbackground:%s;border-radius:8px;padding:9px 10px 8px;display:flex;flex-direction:column;gap:2px;min-height:70px;box-shadow:inset 3px 0 0 %s">'
                '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:14px;font-weight:600;color:%s">%s</span><span style="font-size:11px;color:%s">%02d</span></div>'
                '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:22px;font-weight:700;color:%s;letter-spacing:-.02em">%d</span>%s</div></div>')%(gc,op,T['card'],bar,T['ink'],s['name'],T['mute'],s['num'],T['ink'],s['score'],chip)
    groups=''
    for gi,g in enumerate(GROUPS):
        ss=STUS[gi*5:gi*5+5]
        groups+=('<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;font-weight:700;color:%s">%s</span><span style="font-size:10px;color:%s">组长 %s</span></div>'
                 '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:6px">%s%s</div></div>')%(T['acc'],g,T['mute'],ss[0]['name'],card(ss[0],True),''.join(card(s) for s in ss[1:]))
    h=HEAD%T
    h+='''<div style="width:1180px;height:820px;background:%(bg)s;display:flex;flex-direction:column;box-sizing:border-box">
  <div style="display:flex;align-items:center;gap:20px;padding:14px 24px;border-bottom:1px solid %(line)s">
    <div style="display:flex;gap:18px;align-items:baseline">
      <span style="font-size:22px;font-weight:800;color:%(ink)s;letter-spacing:-.01em">9E</span>
      <span style="font-size:15px;font-weight:600;color:%(mute)s">10H</span>
      <span style="font-size:15px;font-weight:600;color:%(mute)s">10A</span>
    </div>
    <div style="width:1px;height:22px;background:%(line)s"></div>
    <div style="display:flex;align-items:center;gap:8px;font-size:14px;color:%(ink)s">%(cal)s<span style="font-weight:700;color:%(acc)s">D7</span><span style="color:%(mute)s">9月17日 周三</span></div>
    <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;background:%(accsoft)s;color:%(acc)s;font-size:12px;font-weight:700">%(wifi)s ONLINE</div>
    <div style="flex-grow:1"></div>
    <div style="display:flex;gap:8px;align-items:center;font-size:12px;color:%(mute)s">%(filter)s<span style="padding:5px 10px;border-radius:6px;background:%(badsoft)s;color:%(bad)s;font-weight:700">F ×6</span><span style="padding:5px 10px;border-radius:6px;border:1px solid %(line)s;color:%(ink)s;font-weight:600">未点 ×14</span></div>
    <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:%(card)s">%(menu)s</div>
  </div>
  <div style="flex-grow:1;padding:18px 24px;display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:18px 16px;align-content:start">%(groups)s</div>
  <div style="padding:8px 24px 12px;display:flex;justify-content:center;gap:24px;font-size:11px;color:%(mute)s"><span>左侧红条 = 上季度有 F</span><span>黄条 = 有 D</span><span>右下 N 次 = 本季度被点次数</span></div>
</div>
'''%dict(T,cal=svg('cal',T['mute']),wifi=svg('wifi',T['acc']),menu=svg('menu',T['ink']),filter=svg('filter',T['mute']),groups=groups)
    return h+TAIL

# ---------- Direction C : 名单优先 ----------
def dirC():
    T=dict(bg='#ffffff',card='#f7f7f5',ink='#161616',mute='#7a7a76',line='#e8e8e4',acc='#2f5bea',accsoft='#e6ecfd',warn='#c2410c',warnsoft='#feeadc',bad='#c8102e',badsoft='#fde4e8',link='#2f5bea',linkh='#1f44c0')
    rows=''
    order=sorted(STUS,key=lambda s:(-s['risk'],s['called']))
    for s in order[:22]:
        risk='<span style="color:%s">—</span>'%T['line']
        if s['risk']==2: risk='<span style="padding:2px 8px;border-radius:4px;background:%(badsoft)s;color:%(bad)s;font-weight:700;font-size:11px">F</span>'%T
        elif s['risk']==1: risk='<span style="padding:2px 8px;border-radius:4px;background:%(warnsoft)s;color:%(warn)s;font-weight:700;font-size:11px">D</span>'%T
        att='<span style="color:%s">出勤</span>'%T['mute']
        if s['att']=='L': att='<span style="color:%(warn)s;font-weight:600">迟到 12:44</span>'%T
        elif s['att']=='X': att='<span style="color:%(bad)s;font-weight:600">缺席</span>'%T
        elif s['att']=='C': att='<span style="color:#5b4b9e;font-weight:600">摄像头</span>'
        elif s['att']=='N': att='<span style="color:#5b4b9e;font-weight:600">无回应 13:15</span>'
        bar='<div style="height:6px;border-radius:3px;background:%s;width:%dpx"></div>'%(T['acc'] if s['called'] else T['line'], max(6,s['called']*14))
        rows+=('<div style="display:grid;grid-template-columns:36px 1fr 120px 70px 60px 90px 96px;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid %s;font-size:13px">'
               '<span style="color:%s;font-variant-numeric:tabular-nums">%02d</span><span style="font-weight:600;color:%s">%s</span><span style="color:%s;font-size:11px">%s</span>'
               '<span style="font-weight:700;font-variant-numeric:tabular-nums;color:%s">%d</span><span>%s</span>%s<span>%s</span></div>')%(T['line'],T['mute'],s['num'],T['ink'],s['name'],T['mute'],random.choice(ENG),T['ink'],s['score'],risk,bar,att)
    # mini seat map
    mini=''
    for gi,g in enumerate(GROUPS):
        ss=STUS[gi*5:gi*5+5]
        cells=''.join('<div style="height:26px;border-radius:4px;background:%s;display:flex;align-items:center;justify-content:center;font-size:10px;color:%s;%s">%s</div>'%(
            T['badsoft'] if s['risk']==2 else (T['warnsoft'] if s['risk']==1 else T['card']),
            T['ink'], 'grid-column:1 / span 2;' if i==0 else '', s['name'][:2]) for i,s in enumerate(ss))
        mini+='<div><div style="font-size:10px;color:%s;margin-bottom:3px">%s</div><div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:3px">%s</div></div>'%(T['mute'],g,cells)
    h=HEAD%T
    h+='''<div style="width:1180px;height:820px;background:%(bg)s;display:flex;flex-direction:column;box-sizing:border-box">
  <div style="display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid %(line)s">
    <div style="display:flex;gap:2px">
      <div style="padding:6px 14px;border-radius:6px;background:%(ink)s;color:#fff;font-weight:600;font-size:13px">9E</div>
      <div style="padding:6px 14px;border-radius:6px;color:%(mute)s;font-weight:500;font-size:13px">10H</div>
      <div style="padding:6px 14px;border-radius:6px;color:%(mute)s;font-weight:500;font-size:13px">10A</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:%(ink)s">%(cal)s<b>D7</b><span style="color:%(mute)s">9月17日</span></div>
    <div style="flex-grow:1"></div>
    <div style="display:flex;gap:6px;font-size:12px">
      <span style="padding:5px 10px;border-radius:6px;background:%(ink)s;color:#fff;font-weight:600">先看：需要关注</span>
      <span style="padding:5px 10px;border-radius:6px;border:1px solid %(line)s;color:%(ink)s">按学号</span>
      <span style="padding:5px 10px;border-radius:6px;border:1px solid %(line)s;color:%(ink)s">按被点次数</span>
    </div>
    <div style="width:34px;height:34px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:1px solid %(line)s">%(menu)s</div>
  </div>
  <div style="flex-grow:1;display:grid;grid-template-columns:minmax(0, 1.6fr) minmax(0, 1fr);min-height:0">
    <div style="display:flex;flex-direction:column;min-height:0;border-right:1px solid %(line)s">
      <div style="display:grid;grid-template-columns:36px 1fr 120px 70px 60px 90px 96px;gap:10px;padding:8px 12px;font-size:11px;color:%(mute)s;font-weight:600;letter-spacing:.04em;border-bottom:1px solid %(line)s;background:%(card)s"><span>#</span><span>姓名</span><span>英文名</span><span>本季分</span><span>上季</span><span>被点</span><span>今日</span></div>
      <div style="overflow:hidden">%(rows)s</div>
    </div>
    <div style="padding:16px 18px;display:flex;flex-direction:column;gap:14px">
      <div style="font-size:12px;font-weight:600;color:%(mute)s;letter-spacing:.04em">座位图 · 点名字打开</div>
      <div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:12px 10px">%(mini)s</div>
      <div style="margin-top:auto;padding:12px 14px;border-radius:8px;background:%(card)s;font-size:12px;color:%(ink)s;line-height:1.6"><b>今日</b> 缺席 3 · 迟到 5 · 摄像头 2 · 无回应 1<br><span style="color:%(mute)s">本季度还没被点过 14 人，最久的是 王宇翔（3 周）</span></div>
    </div>
  </div>
</div>
'''%dict(T,cal=svg('cal',T['ink']),menu=svg('menu',T['ink']),rows=rows,mini=mini)
    return h+TAIL

io.open('DirectionA.dc.html','w',encoding='utf-8').write(dirA())
io.open('DirectionB.dc.html','w',encoding='utf-8').write(dirB())
io.open('DirectionC.dc.html','w',encoding='utf-8').write(dirC())
print('ok')
