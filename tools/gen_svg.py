import os
W=lambda p,s:open(p,'w').write(s)
CELL=100;M=60
for n in (5,7,9):
    size=2*M+(n-1)*CELL
    L=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">',
    '<defs><linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3D9A4"/><stop offset="1" stop-color="#E8C487"/></linearGradient></defs>',
    f'<rect x="0" y="0" width="{size}" height="{size}" rx="36" fill="url(#wood)"/>']
    for i in range(6):
        y=size*(i+0.5)/6
        L.append(f'<path d="M0 {y:.0f} C {size*.3:.0f} {y-14:.0f}, {size*.7:.0f} {y+14:.0f}, {size} {y:.0f}" stroke="#D9B072" stroke-opacity=".35" stroke-width="6" fill="none"/>')
    e=M+(n-1)*CELL
    for i in range(n):
        p=M+i*CELL
        L.append(f'<line x1="{M}" y1="{p}" x2="{e}" y2="{p}" stroke="#6B4A2B" stroke-width="{6 if i in(0,n-1) else 4}" stroke-linecap="round"/>')
        L.append(f'<line x1="{p}" y1="{M}" x2="{p}" y2="{e}" stroke="#6B4A2B" stroke-width="{6 if i in(0,n-1) else 4}" stroke-linecap="round"/>')
    stars={5:[(2,2)],7:[(3,3)],9:[(2,2),(2,6),(6,2),(6,6),(4,4)]}[n]
    for x,y in stars:
        cx,cy=M+x*CELL,M+y*CELL
        L.append(f'<g transform="translate({cx} {cy})" fill="#E58FA0">'+''.join(f'<circle cx="{ {0:0,1:12,2:0,3:-12}[k]}" cy="{ {0:-12,1:0,2:12,3:0}[k]}" r="9"/>' for k in range(4))+'<circle r="7" fill="#F7C948"/></g>')
    L.append('</svg>')
    W(f'assets/board/board_{n}x{n}.svg','\n'.join(L))
# stones: viewBox 100, diameter 92
def stone(color,face,alpha=1.0):
    fill,hi,line,eye={'black':('#2B2B33','#5A5A66','#111','#FFFFFF'),'white':('#FAFAF5','#FFFFFF','#BDB8AA','#2B2B33')}[color]
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><g opacity="{alpha}">',
    '<ellipse cx="50" cy="94" rx="34" ry="5" fill="#000" opacity=".15"/>',
    f'<circle cx="50" cy="50" r="46" fill="{fill}" stroke="{line}" stroke-width="2"/>',
    f'<ellipse cx="36" cy="30" rx="14" ry="9" fill="{hi}" opacity=".55"/>']
    if face:
        if face=='normal':
            s+= [f'<circle cx="37" cy="48" r="6" fill="{eye}"/>',f'<circle cx="63" cy="48" r="6" fill="{eye}"/>',f'<path d="M42 64 Q50 70 58 64" stroke="{eye}" stroke-width="3.5" fill="none" stroke-linecap="round"/>']
        elif face=='blink':
            s+= [f'<path d="M31 49 Q37 53 43 49" stroke="{eye}" stroke-width="4" fill="none" stroke-linecap="round"/>',f'<path d="M57 49 Q63 53 69 49" stroke="{eye}" stroke-width="4" fill="none" stroke-linecap="round"/>',f'<path d="M42 64 Q50 70 58 64" stroke="{eye}" stroke-width="3.5" fill="none" stroke-linecap="round"/>']
        elif face=='happy':
            s+= [f'<path d="M31 50 Q37 42 43 50" stroke="{eye}" stroke-width="4" fill="none" stroke-linecap="round"/>',f'<path d="M57 50 Q63 42 69 50" stroke="{eye}" stroke-width="4" fill="none" stroke-linecap="round"/>',f'<path d="M38 60 Q50 76 62 60 Z" fill="{eye}"/>','<circle cx="28" cy="60" r="5" fill="#FF9AA8" opacity=".7"/><circle cx="72" cy="60" r="5" fill="#FF9AA8" opacity=".7"/>']
        elif face=='nervous':
            s+= [f'<circle cx="37" cy="47" r="7.5" fill="{eye}"/>',f'<circle cx="63" cy="47" r="7.5" fill="{eye}"/>',f'<circle cx="37" cy="47" r="3" fill="{fill}"/>',f'<circle cx="63" cy="47" r="3" fill="{fill}"/>',f'<path d="M40 66 q5 -5 10 0 t10 0" stroke="{eye}" stroke-width="3" fill="none" stroke-linecap="round"/>','<path d="M76 26 q5 9 0 12 q-5 -3 0 -12z" fill="#7EC8F0"/>']
    s.append('</g></svg>');return '\n'.join(s)
for c in ('black','white'):
    for f in ('normal','blink','happy','nervous'):
        W(f'assets/stones/stone_{c}_{f}.svg',stone(c,f))
    W(f'assets/stones/stone_{c}_preview.svg',stone(c,'normal',0.45))
    W(f'assets/stones/stone_{c}_plain.svg',stone(c,None))
W('assets/fx/liberty_star.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="26" fill="#FFE27A" opacity=".35"/><path d="M30 8 L36 23 L52 24 L40 34 L44 50 L30 41 L16 50 L20 34 L8 24 L24 23 Z" fill="#F7C948" stroke="#E0A800" stroke-width="2.5" stroke-linejoin="round"/></svg>')
W('assets/fx/liberty_star_last.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="27" fill="#FF8A80" opacity=".35"/><path d="M30 8 L36 23 L52 24 L40 34 L44 50 L30 41 L16 50 L20 34 L8 24 L24 23 Z" fill="#FFB74D" stroke="#F57C00" stroke-width="2.5" stroke-linejoin="round"/></svg>')
def bird(wing):
    w={'up':'M44 52 Q30 20 62 30 Q58 44 52 54 Z','down':'M44 54 Q28 78 60 70 Q56 60 52 54 Z'}[wing]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><ellipse cx="50" cy="56" rx="26" ry="22" fill="#8FD3F4"/><circle cx="70" cy="40" r="15" fill="#8FD3F4"/><path d="M84 40 L95 44 L84 47 Z" fill="#FFB74D"/><circle cx="73" cy="37" r="3.5" fill="#2B2B33"/><circle cx="74" cy="36" r="1.2" fill="#fff"/><path d="M25 56 L10 48 L14 62 Z" fill="#6CBCE6"/><path d="{w}" fill="#6CBCE6"/><circle cx="66" cy="48" r="3.5" fill="#FF9AA8" opacity=".7"/></svg>'
W('assets/fx/capture_bird_wing_up.svg',bird('up'));W('assets/fx/capture_bird_wing_down.svg',bird('down'))
W('assets/fx/hint_ring.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="40" fill="none" stroke="#7BD88F" stroke-width="8" opacity=".9"/><circle cx="50" cy="50" r="28" fill="#7BD88F" opacity=".25"/></svg>')
W('assets/fx/hand_link.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40" preserveAspectRatio="none"><rect x="0" y="12" width="100" height="16" rx="8" fill="#FF9AA8"/><circle cx="50" cy="20" r="9" fill="#FFD1DA"/></svg>')
