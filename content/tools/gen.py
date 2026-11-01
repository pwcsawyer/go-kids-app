#!/usr/bin/env python3
"""生成 content/day01.json ~ day28.json。答案全部由本脚本的规则函数计算，避免手写答案出错。
运行：python3 content/tools/gen.py   （固定随机种子，可重复生成）"""
import json, random, os
OUT = os.path.join(os.path.dirname(__file__), '..')
R = random.Random(20261101)

# ---------- 简易规则（与 app/src/engine 语义一致：X=黑 O=白 .=空，(x,y) 左上为 0,0） ----------
def mk(n): return [['.']*n for _ in range(n)]
def S(b): return [''.join(r) for r in b]
def P(rows): return [list(r) for r in rows]
def cp(b): return [r[:] for r in b]
def nb(b,x,y):
    n=len(b); return [(a,c) for a,c in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)) if 0<=a<n and 0<=c<n]
def diag(b,x,y):
    n=len(b); return [(a,c) for a,c in ((x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)) if 0<=a<n and 0<=c<n]
def g(b,x,y): return b[y][x]
def group(b,x,y):
    c=g(b,x,y); st=[(x,y)]; seen={(x,y)}
    while st:
        p=st.pop()
        for q in nb(b,*p):
            if q not in seen and g(b,*q)==c: seen.add(q); st.append(q)
    return seen
def libs(b,x,y):
    return {q for p in group(b,x,y) for q in nb(b,*p) if g(b,*q)=='.'}
def opp(c): return 'O' if c=='X' else 'X'
def play(b,x,y,c):
    """返回 (新棋盘, 提子列表)；不合法返回 (None, None)"""
    if g(b,x,y)!='.': return None,None
    b=cp(b); b[y][x]=c; cap=[]
    for q in nb(b,x,y):
        if g(b,*q)==opp(c) and not libs(b,*q):
            for p in group(b,*q): b[p[1]][p[0]]='.'; cap.append(p)
    if not libs(b,x,y): return None,None
    return b,cap
def empties(b): n=len(b); return [(x,y) for y in range(n) for x in range(n) if b[y][x]=='.']
def is_true_eye(b,x,y,c):
    if g(b,x,y)!='.': return False
    if any(g(b,*q)!=c for q in nb(b,x,y)): return False
    d=diag(b,x,y); own=sum(1 for q in d if g(b,*q)==c)
    return own>=3 if len(d)==4 else own==len(d)
def eyes(b,c): return [p for p in empties(b) if is_true_eye(b,*p,c)]
def is_eye_shape(b,x,y,c):  # 只看四邻（"小房间"，可能是假眼）
    return g(b,x,y)=='.' and all(g(b,*q)==c for q in nb(b,x,y))
def area(b):
    n=len(b); terr={'X':0,'O':0}; seen=set()
    for p in empties(b):
        if p in seen: continue
        reg={p}; st=[p]; border=set()
        while st:
            q=st.pop()
            for r in nb(b,*q):
                v=g(b,*r)
                if v=='.' and r not in reg: reg.add(r); st.append(r)
                elif v!='.': border.add(v)
        seen|=reg
        if len(border)==1: terr[border.pop()]+=len(reg)
    stones={c:sum(r.count(c) for r in b) for c in 'XO'}
    return {'blackStones':stones['X'],'whiteStones':stones['O'],'blackTerritory':terr['X'],'whiteTerritory':terr['O'],
            'black':stones['X']+terr['X'],'white':stones['O']+terr['O']}
def pt(p): return {'x':p[0],'y':p[1]}
def pts(ps): return [pt(p) for p in sorted(ps,key=lambda p:(p[1],p[0]))]
def transforms(rows):
    b=P(rows); n=len(b); out=[]
    for k in range(8):
        t=mk(n)
        for y in range(n):
            for x in range(n):
                a,c=x,y
                if k&1: a=n-1-a
                if k&2: c=n-1-c
                if k&4: a,c=c,a
                t[c][a]=b[y][x]
        if S(t) not in [S(o) for o in out]: out.append(t)
    return out

# ---------- 关卡工厂 ----------
def lv(day,i,kind,board,prompt,answer,**kw):
    d={'id':f'day{day:02d}-p{i:02d}','kind':kind,'boardSize':len(board),'board':S(board),'toPlay':kw.pop('toPlay','black'),
       'prompt':{'voice':f'v_day{day:02d}_p{i:02d}','text':prompt},'answer':answer,
       'hints':kw.pop('hints',[]),'maxAttempts':3,'onFail':'auto_demo'}
    d.update(kw); return d

def rand_pt(n,margin=0): return (R.randint(margin,n-1-margin),R.randint(margin,n-1-margin))

def lv_place(day,i,n):
    p=rand_pt(n); return lv(day,i,'place_on_point',mk(n),'把小熊棋子放到发光的路口上',{'points':[pt(p)]},highlight=[pt(p)],hints=['棋子住在路口，不住在格子里哦'])
REGION={'corner':'角','edge':'边','center':'中间'}
def region_pts(n,r):
    ps=[]
    for y in range(n):
        for x in range(n):
            e=(x in(0,n-1))+(y in(0,n-1))
            if (r=='corner' and e==2) or (r=='edge' and e==1) or (r=='center' and e==0): ps.append((x,y))
    return ps
def lv_region(day,i,n,r):
    return lv(day,i,'place_region',mk(n),f'把小动物送到棋盘的{REGION[r]}上',{'points':pts(region_pts(n,r))},hints=[{'corner':'角落是两条边碰头的地方','edge':'边就是棋盘最外面一圈','center':'中间离边远远的'}[r]])

def lv_count_single(day,i,n,kind_pos):
    b=mk(n); p={'corner':(0,0),'edge':(R.randint(1,n-2),0),'center':(R.randint(1,n-2),R.randint(1,n-2))}[kind_pos]
    p=R.choice([t for t in [p,(n-1-p[0],p[1]),(p[0],n-1-p[1]),(p[1],p[0])]])
    b[p[1]][p[0]]='X'; L=libs(b,*p)
    return lv(day,i,'count_liberties',b,'小熊有几个呼吸的小洞？点数字',{'count':len(L),'points':pts(L)},target=pt(p),showLiberties=True,choices=list(range(1,6)),hints=['用手指点一点棋子旁边直直的路口'])

def rand_group(n,size):
    while True:
        x,y=rand_pt(n); s=[(x,y)]
        while len(s)<size:
            q=R.choice(nb(mk(n),*R.choice(s)))
            if q not in s: s.append(q)
        return s
def lv_count_group(day,i,n,size,with_white):
    while True:
        b=mk(n); s=rand_group(n,size)
        for p in s: b[p[1]][p[0]]='X'
        if with_white:
            L=list(libs(b,*s[0])); R.shuffle(L)
            for q in L[:R.randint(1,max(1,len(L)-2))]: b[q[1]][q[0]]='O'
        L=libs(b,*s[0])
        if 1<=len(L)<=8: break
    return lv(day,i,'count_liberties',b,'这一家小熊一共有几个呼吸的小洞？',{'count':len(L),'points':pts(L)},target=pt(s[0]),showLiberties=True,choices=list(range(1,9)),hints=['手拉手的小熊一起呼吸，一起数'])

def build_atari(n,size,color='O',margin=0):
    """生成一块 color 色棋块只剩 1 气，周围由对方棋子包围；对方棋子每块至少 2 气"""
    for _ in range(5000):
        b=mk(n); s=rand_group(n,size)
        for p in s: b[p[1]][p[0]]=color
        L=list(libs(b,*s[0]));
        if len(L)<2: continue
        R.shuffle(L); last=L[0]
        for q in L[1:]: b[q[1]][q[0]]=opp(color)
        if libs(b,*s[0])!={last}: continue
        if all(len(libs(b,*q))>=2 for q in L[1:]): return b,s,last
    raise RuntimeError('build_atari failed')
def capture_moves(b,c):
    out=[]
    for p in empties(b):
        nbo,cap=play(b,*p,c)
        if nbo and cap: out.append(p)
    return out
def lv_find_atari(day,i,n):
    b,s,last=build_atari(n,R.randint(1,2))
    # 再加一块不在打吃的白子作干扰
    for _ in range(200):
        p=rand_pt(n)
        if g(b,*p)=='.' and all(g(b,*q)=='.' for q in nb(b,*p)):
            b[p[1]][p[0]]='O'; break
    ans=[q for q in [(x,y) for y in range(n) for x in range(n)] if g(b,*q)=='O' and len(libs(b,*q))==1]
    return lv(day,i,'tap_stones',b,'哪只坏狐狸只剩一个小洞，在喊救命？点它',{'points':pts(ans)},hints=['数一数每只狐狸的小洞'],showLiberties=True)
def lv_capture(day,i,n,size,game='save_cat'):
    b,s,last=build_atari(n,size)
    ans=capture_moves(b,'X')
    return lv(day,i,'play_to_goal',b,'堵住狐狸最后一个小洞，救出小猫！',{'goal':'capture','points':pts(ans),'minCaptured':size},game=game,hints=['狐狸只剩一个洞，就在这附近'])
def lv_escape(day,i,n):
    for _ in range(5000):
        b,s,last=build_atari(n,1,color='X')
        ans=[]
        for p in empties(b):
            nb2,cap=play(b,*p,'X')
            if nb2 and len(libs(nb2,*s[0]))>=2 and g(nb2,*s[0])=='X':
                # 逃出后对方不能马上一步提掉
                if not any((play(nb2,*q,'O')[0] is not None and g(play(nb2,*q,'O')[0],*s[0])=='.') for q in empties(nb2)): ans.append(p)
        if ans: break
    return lv(day,i,'play_to_goal',b,'小熊被围住只剩一个洞了，帮它逃跑！',{'goal':'escape','points':pts(ans),'target':pt(s[0])},hints=['往空空的地方跑，多找几个小洞'])
def lv_conn_judge(day,i,n):
    b=mk(n); x,y=rand_pt(n,1); d=R.choice([(1,0),(0,1),(1,1),(1,-1),(-1,1),(0,-1)])
    b[y][x]='X'; b[y+d[1]][x+d[0]]='X'; ok=abs(d[0])+abs(d[1])==1
    return lv(day,i,'judge',b,'这两只小熊手拉手了吗？对点绿勾，不对点红叉',{'value':ok},hints=['直直挨着才能拉到手，斜着够不着'])
def lv_connect(day,i,n):
    for _ in range(1000):
        b=mk(n); x,y=rand_pt(n,1); d=R.choice([(2,0),(0,2)])
        if not(0<=x+d[0]<n and 0<=y+d[1]<n): continue
        b[y][x]='X'; b[y+d[1]][x+d[0]]='X'
        mid=(x+d[0]//2,y+d[1]//2)
        for q in nb(b,*mid):
            if g(b,*q)=='.' and R.random()<0.5: b[q[1]][q[0]]='O'
        ans=[p for p in empties(b) if play(b,*p,'X')[0] and (x+d[0],y+d[1]) in group(play(b,*p,'X')[0],x,y)]
        if ans: return lv(day,i,'play_to_goal',b,'走散的两只小熊，下一步让它们手拉手！',{'goal':'connect','points':pts(ans),'stones':[pt((x,y)),pt((x+d[0],y+d[1]))]},game='find_friends',hints=['中间那个路口放一只小熊'])
def random_board(n,dens):
    b=mk(n)
    for y in range(n):
        for x in range(n):
            r=R.random()
            if r<dens: b[y][x]='X'
            elif r<2*dens: b[y][x]='O'
    # 去掉无气棋块
    for p in [(x,y) for y in range(n) for x in range(n)]:
        if g(b,*p)!='.' and not libs(b,*p):
            for q in group(b,*p): b[q[1]][q[0]]='.'
    return b
def lv_legal(day,i,n,want):
    """want: 'suicide' 禁入点 / 'normal' 能下(有气) / 'capture' 四周被围但能提子"""
    for _ in range(20000):
        b=random_board(n,0.3)
        cand=[p for p in empties(b) if all(g(b,*q)!='.' for q in nb(b,*p)) or want=='normal']
        R.shuffle(cand)
        for p in cand:
            nb2,cap=play(b,*p,'X')
            kind='suicide' if nb2 is None else ('capture' if cap else 'normal')
            if kind!=want: continue
            if want=='normal' and len([q for q in nb(b,*p) if g(b,*q)=='.'])==len(nb(b,*p)): continue
            hint={'suicide':'放进去一口气都没有，憋住了','normal':'放进去还有小洞可以呼吸','capture':'放进去能吃掉狐狸，吃掉就有洞啦'}[want]
            return lv(day,i,'judge',b,'小熊可以住进闪光的路口吗？',{'value':nb2 is not None,'reason':want},target=pt(p),highlight=[pt(p)],hints=[hint])
    raise RuntimeError(want)
KO=['.XO..','XO.O.','.XO..','.....','.....']
def lv_ko(day,i,variant):
    b=transforms(KO)[variant]
    caps=capture_moves(b,'X'); p=caps[0]
    nb2,cap=play(b,*p,'X'); back=cap[0]
    nb3,cap3=play(nb2,*back,'O')
    assert nb3 and cap3  # 不考虑劫时白可以提回 → 正是"劫"
    return lv(day,i,'judge',nb2,'小熊刚吃掉一只狐狸。白兔可以马上在这里吃回来吗？',{'value':False,'reason':'ko'},target=pt(back),highlight=[pt(back)],toPlay='white',justCaptured=pt(back),hints=['刚被吃，不能马上吃回来，要先去别处走一步'],demoFirst={'move':pt(p),'color':'black'})

EYE_TEMPLATES=[  # 黑块围出若干"房间"，下方有白子
 ['.X.X.','XXXXX','OOOOO','.....','.....'],
 ['.X...','XX...','..XXX','XXX.X','X.XX.'],
 ['X.X..','XXX..','.XX..','X.X..','XXXOO'],
 ['.XX.X','XX.XX','OXXXO','OOOO.','.....'],
]
FALSE_EYE=['.X.X.','X.XO.','XXXO.','OOOO.','.....']
def lv_find_eye(day,i,rows):
    b=R.choice(transforms(rows)); ans=[p for p in empties(b) if is_eye_shape(b,*p,'X')]
    return lv(day,i,'tap_points',b,'小熊盖的房子里有小房间！点出所有小房间',{'points':pts(ans)},hints=['四周都是小熊墙的空路口就是房间'],game='build_house')
def eye_judge_pool():
    pool=[]
    for rows in EYE_TEMPLATES+[FALSE_EYE]:
        for b in transforms(rows):
            for p in empties(b):
                if is_eye_shape(b,*p,'X'): pool.append((b,p,is_true_eye(b,*p,'X')))
    return pool
MAKE2=[
 ['.X...','XXXXX','OOOOO','.....','.....'],
 ['.X..X','XXXXX','OOOOO','.....','.....'],
 ['X..X.','XXXXX','OOOOO','.....','.....'],
 ['.X.X.','XX..X','OXXXX','OOOOO','.....'],
 ['.X...','XX...','X.XXX','XXOOO','OOO..'],
]
def lv_make2(day,i,rows,var):
    ts=transforms(rows); b=ts[var%len(ts)]
    before=len(eyes(b,'X')); ans=[]
    for p in empties(b):
        nb2,_=play(b,*p,'X')
        if nb2 and len(eyes(nb2,'X'))>=2 and before<2: ans.append(p)
    assert ans,(rows,var)
    return lv(day,i,'play_to_goal',b,'小熊的房子只有一个房间，再放一块砖盖出第二个房间！',{'goal':'two_eyes','points':pts(ans)},game='build_house',hints=['找一个能隔出新房间的地方'])
KILL=[
 ['.O...','OOOOO','XXXXX','.....','.....'],
 ['O..O.','OOOOO','XXXXX','.....','.....'],
 ['.O..O','OOOOO','XXXXX','.....','.....'],
]
def lv_kill(day,i,rows,var):
    ts=transforms(rows); b=ts[var%len(ts)]
    ans=[]
    for p in empties(b):
        w,_=play(b,*p,'O')
        if w and len(eyes(w,'O'))>=2: ans.append(p)
    assert ans
    return lv(day,i,'play_to_goal',b,'狐狸想盖第二个房间！抢先占住那个地方',{'goal':'prevent_two_eyes','points':pts(ans)},hints=['狐狸要放砖的地方，小熊先放'])
def wall_board(n):
    b=mk(n); c=R.randint(1,n-3)
    for y in range(n):
        if y>0: c=max(1,min(n-3,c+R.choice([-1,0,0,1])))
        b[y][c]='X'; b[y][c+1]='O'
    return b
def lv_territory(day,i,n):
    b=wall_board(n); s=area(b)
    return lv(day,i,'count_number',b,'小熊的花园有几块空地？点一块涂一块，再选数字',{'count':s['blackTerritory'],'score':s},paintTerritory='black',choices=list(range(0,n*n+1)),hints=['只被小熊围住的空地才是小熊的花园'])
def lv_score(day,i,n):
    b=wall_board(n); s=area(b)
    while s['black']==s['white']: b=wall_board(n); s=area(b)
    return lv(day,i,'score_compare',b,'数一数：小熊的棋子和花园加起来，和白兔比，谁多？',{'winner':'black' if s['black']>s['white'] else 'white','score':s},countMode='stones_plus_territory',hints=['先数棋子，再数花园，加起来'])
def lv_best_open(day,i,n):
    corner=(2,2) if n>=7 else (1,1); edge=(n//2,0); center=(n//2,n//2)
    opts=[corner,edge,center]; R.shuffle(opts)
    return lv(day,i,'choose_option',mk(n),'第一步放哪里最省力？金角银边草肚皮',{'points':[pt(corner)]},options=[pt(p) for p in opts],hints=['角落有两面墙帮忙，最省力'])

# ---------- 课程 ----------
END_RULES={'passEnabled':False,'autoEndWhenOnlyOwnTrueEyes':True,'endPopupVoice':'v_game_end_count','parentEndButton':True,
           'moveLimit':{'5':40,'7':80,'9':120},'deadStones':'ai_mark_parent_confirm','scoring':'chinese_area','komi':0}
def game_seg(n,ai='beginner',hints=0,mode='vs_ai',win='score'):
    return {'type':'game','mode':mode,'boardSize':n,'ai':ai if mode=='vs_ai' else None,'hintBulbs':hints,'win':win,
            'endRules':END_RULES if win=='score' else None,'durationSec':300 if n>5 else 240}

LESSONS=[]
def lesson(day,title,kps,size,script,levels,game=None,parent_moment=None,pass_rule=None,badge=None,extra=None):
    week=(day-1)//7+1
    segs=[{'type':'parent_intro','durationSec':45,'parentCardId':f'day{day:02d}'},
          {'type':'micro_lesson','durationSec':150,'animation':f'anim_day{day:02d}',
           'script':[{'voice':f'v_day{day:02d}_l{k+1}','text':t} for k,t in enumerate(script)]}]
    if levels: segs.append({'type':'practice','levels':levels})
    if parent_moment: segs.append({'type':'parent_moment','voice':f'v_day{day:02d}_pm','text':parent_moment})
    if game: segs.append(game)
    segs.append({'type':'reward','sticker':f'sticker_day{day:02d}','badge':badge})
    d={'schemaVersion':1,'id':f'day{day:02d}','day':day,'week':week,'title':title,'knowledgePoints':kps,'boardSize':size,
       'timing':{'targetSec':540,'hardStopSec':600,'endVoice':'v_bear_sleep'},
       'pass':pass_rule or {'minCorrect':max(1,round(len(levels)*0.75)),'of':len(levels)} ,
       'segments':segs}
    # 吃子棋：D14–16 先吃 1 子赢，D17–23 先吃 3 子赢；D24–28 数子定胜负 → captureTarget=null
    if 15<=day<=23 and not game:
        cg=game_seg(5 if day<=20 else 7,win='first_capture',mode='vs_ai' if day%2 else 'parent_same_device')
        segs.insert(len(segs)-1,cg)
    if day>=14:
        d['captureTarget']=(1 if day<=16 else 3) if day<=23 else None
        for sg in segs:
            if sg.get('win')=='first_capture':
                sg['captureTarget']=d['captureTarget']; sg['durationSec']=180; sg['noLegalMoveLoses']=True
                for sgg in segs:
                    if sgg['type']=='micro_lesson': sgg['durationSec']=120
    # 时长估算：练习每关 25 秒，家长时刻 15 秒，奖励 20 秒；整节必须 ≤ 600 秒
    est=0
    for sg in segs:
        if sg['type']=='practice': sg['durationSec']=25*len(sg['levels'])
        if sg['type']=='parent_moment': sg['durationSec']=15
        if sg['type']=='reward': sg['durationSec']=20
        if sg['type']=='game' and sg.get('win')=='score': sg['durationSec']=min(sg['durationSec'],600-45-150-15-20-25*len(levels))
        est+=sg['durationSec']
    assert est<=600,(day,est)
    d['timing']['estimatedSec']=est
    if extra: d.update(extra)
    LESSONS.append(d)

def many(f,k,*a): return [f(*a) for _ in range(k)]
D=lambda day: day
# D1
lesson(1,'认识棋盘：路口',[1],5,['这是围棋棋盘，像一张小路网','棋子住在路口，就是两条线交叉的地方','放进格子里，棋子会弹回来哦'],
       [lv_place(1,i+1,5) for i in range(8)],parent_moment='请爸爸妈妈指一个路口，让宝宝放一颗棋子',pass_rule={'minCorrect':6,'of':8})
# D2
lesson(2,'黑白轮流',[2],5,['小熊拿黑棋，白兔拿白棋','一次只放一颗，然后轮到对方','轮到谁，谁的棋罐会跳一跳'],
       [lv(2,1,'take_turns',mk(5),'和爸爸妈妈轮流放棋子，一人一颗',{'moves':10,'alternate':True},parentPlays='white',hints=['看看哪个棋罐在跳'])],
       parent_moment='家长执白，和宝宝轮流放满 10 颗，宝宝每次说“该你啦”',pass_rule={'minCorrect':1,'of':1})
# D3
lesson(3,'边、角和中间',[1],7,['棋盘最外面一圈叫边','两条边碰头的地方叫角','离边远远的是中间'],
       [lv_region(3,i+1,7,r) for i,r in enumerate(['corner','edge','center','corner','center','edge'])],parent_moment='让宝宝指给你看：哪里是角？')
# D4
lesson(4,'气：呼吸的小洞',[3],5,['棋子旁边直直挨着的空路口，是它呼吸的小洞，叫“气”','中间的棋子有 4 个小洞','边上有 3 个，角上只有 2 个'],
       [lv_count_single(4,i+1,5,k) for i,k in enumerate(['center','edge','corner','center','corner','edge','center','corner'])],
       parent_moment='家长捂住鼻子假装憋气：“小洞被堵住会怎样？”')
# D5
lesson(5,'一家人一起呼吸',[3,4],5,['手拉手的小熊是一家人','一家人的小洞要一起数','白兔挡住的路口就不是小洞了'],
       [lv_count_group(5,i+1,5,2 if i<4 else 3,i%2==1) for i in range(8)],parent_moment='请宝宝用手指点一遍所有小洞，家长跟着数')
# D6
lesson(6,'复习闯关：数气',[3,4],5,['今天是闯关日！','数对一关，点亮一颗星星'],
       [lv_count_single(6,i+1,5,R.choice(['center','edge','corner'])) for i in range(4)]+[lv_count_group(6,i+5,5,R.randint(2,3),True) for i in range(6)],
       parent_moment='让宝宝当小老师，给爸爸妈妈讲什么是气',pass_rule={'minCorrect':7,'of':10})
# D7
lesson(7,'周测：认子小熊',[1,2,3,4],5,['小测验来啦，答对 6 题就能拿到“认子小熊”徽章'],
       [lv_place(7,1,5),lv_region(7,2,5,'corner'),lv_count_single(7,3,5,'edge'),lv_count_single(7,4,5,'corner'),
        lv_count_group(7,5,5,2,False),lv_count_group(7,6,5,2,True),lv_count_group(7,7,5,3,True),lv_region(7,8,5,'center')],
       parent_moment='和宝宝一起翻贴纸册，数这周得了几张',pass_rule={'minCorrect':6,'of':8},badge='badge_week1')
# D8
lesson(8,'打吃：喊救命',[5],5,['棋子只剩一个小洞时，会闪红光喊救命','这叫“打吃”'],
       [lv_find_atari(8,i+1,5) for i in range(8)],parent_moment='问宝宝：“哪只狐狸只剩一个洞了？”')
# D9
lesson(9,'救猫咪 1–8 关：提子',[6],5,['坏狐狸把小猫关进笼子','把狐狸最后一个小洞堵住，狐狸就被请回家（提掉）','提掉的棋子要拿出棋盘'],
       [lv_capture(9,i+1,5,1) for i in range(8)],parent_moment='卡住时问：“笼子还有几个洞？”',pass_rule={'minCorrect':6,'of':8})
# D10
lesson(10,'救猫咪 9–16 关：吃一家',[6],5,['狐狸一家手拉手，要把一家的洞都堵住','边上角上的狐狸洞更少，更好抓'],
       [lv_capture(10,i+1,5,1 if i<2 else (2 if i<6 else 3)) for i in range(8)],parent_moment='提醒宝宝：先数洞，再下子',pass_rule={'minCorrect':6,'of':8})
# D11
lesson(11,'逃跑：帮小熊回家',[10],5,['小熊被打吃了别着急','往空地方跑，多找几个小洞，就安全了'],
       [lv_escape(11,i+1,5) for i in range(6)],parent_moment='问：“怎么让小熊多一个洞呼吸？”')
# D12
lesson(12,'找朋友 1：直直手拉手',[4],5,['直直挨着的小熊手拉手，是一家','斜着挨着，手够不着，不是一家'],
       [lv_conn_judge(12,i+1,5) for i in range(8)],parent_moment='家长和宝宝伸手：直着能拉到，斜着够不着',pass_rule={'minCorrect':7,'of':8})
# D13
lesson(13,'找朋友 2：连起来',[4],5,['走散的小熊要连起来','连起来的一家更难被吃掉'],
       [lv_connect(13,i+1,5) for i in range(6)],parent_moment='亲子游戏：宝宝连小熊，家长放白兔挡路',pass_rule={'minCorrect':4,'of':6})
# D14
lesson(14,'周测 + 吃子棋',[5,6,10,4],5,['先做小测验，再和白兔玩吃子棋：谁先吃掉一颗谁赢'],
       [lv_find_atari(14,1,5),lv_capture(14,2,5,1),lv_capture(14,3,5,2),lv_escape(14,4,5),lv_conn_judge(14,5,5),lv_connect(14,6,5),lv_capture(14,7,5,1),lv_conn_judge(14,8,5)],
       game=game_seg(5,win='first_capture'),parent_moment='家长观战，宝宝吃到子就击掌',pass_rule={'minCorrect':6,'of':8},badge='badge_week2')
# D15
lesson(15,'禁入点：憋住的路口',[7],5,['一个小洞都没有的路口，小熊不能住进去','这叫“禁入点”'],
       [lv_legal(15,i+1,5,'suicide' if i%2==0 else 'normal') for i in range(8)],parent_moment='问宝宝：“住进去会不会憋住？”')
# D16
lesson(16,'禁入点的例外：能吃就能下',[7],5,['如果住进去能吃掉狐狸，狐狸被拿走就有洞了','所以能吃子的路口可以下'],
       [lv_legal(16,i+1,5,['capture','suicide','capture','normal','capture','suicide','capture','suicide'][i]) for i in range(8)],parent_moment='让宝宝说一说：为什么这里可以下？',pass_rule={'minCorrect':6,'of':8})
# D17
lesson(17,'认识“劫”（只认识）',[8],5,['刚刚被吃掉一颗，不能马上吃回来','要先去别的地方走一步，才能再吃'],
       [lv_ko(17,i+1,v) for i,v in enumerate([0,3,5])],parent_moment='只需要宝宝知道“不能马上吃回来”，不考',pass_rule={'minCorrect':0,'of':3})
# D18
lesson(18,'盖房子 1：小房间',[13],5,['小熊用棋子当砖，围出空空的小房间','房间就是“眼”，狐狸进不来'],
       [lv_find_eye(18,i+1,EYE_TEMPLATES[i%4]) for i in range(6)],parent_moment='问：“房间里狐狸进得来吗？”')
pool=eye_judge_pool(); R.shuffle(pool)
tr=[x for x in pool if x[2]]; fa=[x for x in pool if not x[2]]
sel=[tr[0],fa[0],tr[1],fa[1],tr[2],fa[2],fa[3],tr[3]]
# D19
lesson(19,'盖房子 2：真房间和漏风房间',[14],5,['房间墙角缺了一块，会漏风，是假房间（假眼）','墙角补好，才是真房间（真眼）'],
       [lv(19,i+1,'judge',b,'这个房间是真房间吗？真的点绿勾，漏风点红叉',{'value':t},target=pt(p),highlight=[pt(p)],hints=['看看房间斜对角的墙角'],game='build_house') for i,(b,p,t) in enumerate(sel)],
       parent_moment='和宝宝用手指描一圈房间的墙，找缺口',pass_rule={'minCorrect':6,'of':8})
# D20
lesson(20,'盖房子 3：两个房间永远安全',[15],5,['只有一个房间，狐狸能把它堵住吃掉','有两个真房间，狐狸永远吃不掉，这叫“活棋”'],
       [lv_make2(20,i+1,MAKE2[i%5],i) for i in range(8)],parent_moment='问：“一个房间够不够安全？”',pass_rule={'minCorrect':5,'of':8})
# D21
lesson(21,'死活入门 + 周测',[15,16],5,['自己要做两个房间','狐狸想做第二个房间时，小熊抢先占住'],
       [lv_make2(21,1,MAKE2[0],1),lv_kill(21,2,KILL[0],0),lv_make2(21,3,MAKE2[3],2),lv_kill(21,4,KILL[1],1),lv_make2(21,5,MAKE2[2],3),lv_kill(21,6,KILL[2],2),
        lv_make2(21,7,MAKE2[4],4),lv_kill(21,8,KILL[0],5)],
       parent_moment='家长出题：指一块棋问宝宝“能活吗？”',pass_rule={'minCorrect':6,'of':8},badge='badge_week3')
# D22
lesson(22,'小花园：地盘',[17],5,['小熊围起来的空地，是小熊的花园','只被小熊围住才算，白兔也碰到就不算'],
       [lv_territory(22,i+1,5) for i in range(6)],parent_moment='问：“我们的花园有几块地？”')
# D23
lesson(23,'数子：谁赢了',[18],5,['没地方可下了，就数一数','小熊的棋子 + 小熊的花园，和白兔比，多的赢'],
       [lv_score(23,i+1,5) for i in range(4)]+[lv_score(23,i+5,7) for i in range(2)],parent_moment='和宝宝一起点数，数完说出谁赢')
# D24
lesson(24,'5 路对局',[18],5,['今天和白兔下一整盘！','下完啦，就一起数一数'],[lv_score(24,1,5)],game=game_seg(5),parent_moment='只在宝宝求助时给提示')
# D25
lesson(25,'7 路对局：先占角',[19],7,['金角银边草肚皮：先住角落最省力'],
       [lv_best_open(25,i+1,7) for i in range(3)],game=game_seg(7),parent_moment='问：“第一步放哪里最省力？”',pass_rule={'minCorrect':2,'of':3})
# D26
lesson(26,'9 路初体验',[19,18],9,['棋盘变大啦！先占角，再连起来','有 3 盏提示灯，不会的时候可以点'],[lv_best_open(26,1,9)],game=game_seg(9,hints=3),parent_moment='和宝宝讨论一步棋：“为什么下这里？”',extra={'device':{'minBoardCellPt':44,'preferredDevice':'ipad'}})
# D27
lesson(27,'亲子对局',[18],9,['今天和爸爸妈妈下一盘 9 路棋','下完由宝宝来数子'],[],game=game_seg(9,mode='parent_same_device'),parent_moment='家长可以故意留一颗能吃的子，让宝宝发现',pass_rule={'minCorrect':0,'of':0},extra={'device':{'minBoardCellPt':44,'preferredDevice':'ipad'}})
# D28
lesson(28,'毕业考',[1,2,3,4,5,6,7,13,15,18],9,['毕业考！自己下完一盘 9 路棋，再自己数一数','下完就能拿到毕业证书'],[],
       game=dict(game_seg(9,hints=0),exam=True,passCriteria={'completeGame':True,'scoreErrorMax':2,'noParentHelp':True}),
       parent_moment='家长只看不说，结束后颁发证书',pass_rule={'minCorrect':0,'of':0},badge='badge_graduate',extra={'device':{'minBoardCellPt':44,'preferredDevice':'ipad'},'certificate':'cert_graduate'})

total=0
for L in LESSONS:
    for s in L['segments']:
        if s['type']=='practice':
            for l in s['levels']:
                a=l['answer']
                assert ('points' not in a) or a['points'], l['id']
                total+=1
    json.dump(L,open(os.path.join(OUT,f"{L['id']}.json"),'w'),ensure_ascii=False,indent=2)
print('lessons',len(LESSONS),'levels',total)
