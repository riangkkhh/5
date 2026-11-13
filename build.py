#!/usr/bin/env python3
"""Optional dev build: tsc -> dist/js/*.js, then concat into dist/game.js (dist/ is committed, so no build is needed to deploy)."""
import subprocess, re, os, sys
root=os.path.dirname(os.path.abspath(__file__))
tsc=os.environ.get('TSC','tsc')
subprocess.check_call([tsc,'-p',root])
cfg=open(os.path.join(root,'tsconfig.json')).read()
files=re.findall(r'"src/([^"]+)\.ts"',cfg)
out=[]
for f in files:
    if f=='types.d': continue
    out.append(open(os.path.join(root,'dist/js',f+'.js'),encoding='utf-8').read())
    out[-1]=re.sub(r'//# sourceMappingURL=.*','',out[-1])
open(os.path.join(root,'dist/game.js'),'w',encoding='utf-8').write('"use strict";\n'+'\n'.join(out))
print('dist/game.js',sum(map(len,out)))
