"""Prepare seamless mono loops from the credited source WAV files.
Run with numpy; expects decoded 44.1kHz mono source WAVs in the given directory.
Source/segment choices and licenses: public/audio/CREDITS.md.
"""
import sys, wave
from pathlib import Path
import numpy as np
source=Path(sys.argv[1]);destination=Path(__file__).resolve().parents[1]/'public/audio'
for name,original,start,end in [('ford-idle','ford',2.5,5.4),('v8-pull','v8-rev',2.45,3.85),('v8-overrun','v8-rover',11.5,13.5)]:
    with wave.open(str(source/(original+'.wav'))) as f:
        rate=f.getframerate();x=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
    x=x[int(start*rate):int(end*rate)].copy();x-=x.mean()
    # A short constant-sum crossfade avoids clicks and periodic silence.
    n=int(.07*rate);blend=np.linspace(0,1,n);x[:n]=x[-n:]*(1-blend)+x[:n]*blend;x=x[:-n]
    x*=min(.24/max(np.sqrt(np.mean(x*x)),1e-8),.92/max(abs(x)))
    with wave.open(str(destination/(name+'.wav')),'wb') as f:
        f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes((x*32767).astype('<i2').tobytes())
    print(name,round(len(x)/rate,2),'seconds')
