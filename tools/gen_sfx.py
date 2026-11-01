import numpy as np, wave, subprocess, os
SR=44100
def env(n,a=0.005,r=None):
    t=np.arange(n)/SR; e=np.minimum(1,t/a)
    return e*np.exp(-t/(r or (n/SR/4)))
def tone(f,d,r=None,harm=(1,),a=0.005):
    n=int(SR*d);t=np.arange(n)/SR
    s=sum(np.sin(2*np.pi*f*h*t)/(i+1)**1.5 for i,h in enumerate(harm));return s*env(n,a,r)
def cat(*xs): return np.concatenate(xs)
def mix(*xs):
    n=max(len(x) for x in xs); o=np.zeros(n)
    for x in xs:o[:len(x)]+=x
    return o
def off(x,sec): return cat(np.zeros(int(SR*sec)),x)
def save(name,x,peak_db=-12):
    x=x/np.max(np.abs(x))*10**(peak_db/20)
    fade=int(SR*0.01);x[-fade:]*=np.linspace(1,0,fade)
    w=f'/tmp/{name}.wav'
    with wave.open(w,'w') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((x*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',w,'-c:a','aac','-b:a','96k',f'assets/sfx/{name}.m4a'],check=True)
rng=np.random.default_rng(1)
# place: soft wooden "da"
n=int(SR*.12);noise=rng.standard_normal(n)*env(n,0.001,0.012)
save('sfx_place',mix(tone(320,.12,0.03,(1,2.7)),noise*0.3))
save('sfx_preview',tone(880,.08,0.025,(1,2),a=0.003),-16)
save('sfx_capture_bird',cat(tone(1200,.06,0.02),tone(1500,.06,0.02),off(tone(1800,.1,0.04),0.02)) + 0)
save('sfx_correct',mix(tone(1047,.5,0.15,(1,2,3)),off(tone(1568,.45,0.15,(1,2)),0.08)))
save('sfx_try_again',cat(tone(523,.18,0.08,(1,2)),tone(440,.25,0.1,(1,2))),-15)
save('sfx_complete',mix(*[off(tone(f,.6,0.2,(1,2,3)),i*0.12) for i,f in enumerate([523,659,784,1047])]))
sw=np.linspace(0,1,int(SR*.35));sweep=np.sin(2*np.pi*np.cumsum(600+1400*sw)/SR)*env(len(sw),0.02,0.12)
save('sfx_sticker',mix(sweep*0.6,off(tone(1319,.4,0.12,(1,2)),0.25),off(tone(1760,.4,0.12,(1,2)),0.33)))
save('sfx_connect',mix(tone(659,.45,0.15,(1,2)),tone(784,.45,0.15,(1,2)),tone(988,.45,0.15,(1,2))),-14)
save('sfx_tap_invalid',tone(260,.15,0.05,(1,2)),-18)
