import sys, re, glob, os, statistics
out = sys.argv[1]
for t in sys.argv[2:]:
    rows = []
    for f in sorted(glob.glob(f'{out}/{t}-*.log'), key=lambda p: int(re.search(r'-(\d+)\.log$', p).group(1))):
        s = open(f).read()
        st = 'PASS' if re.search(rf'^PASS\s+{re.escape(t)}\b', s, re.M) else 'FAIL'
        n = sum(int(x) for x in re.findall(r'"desyncs?":(\d+)', s))
        n += sum(int(a) + int(b) for a, b in re.findall(r'"desyncs":\[(\d+),(\d+)\]', s))
        n += sum(int(x) for x in re.findall(r'desyncs (\d+)', s))
        why = ''
        if st == 'FAIL':
            m = re.search(rf'^FAIL\s+{re.escape(t)}.*?\n(.*?)(?:\n\S|\Z)', s, re.S | re.M)
            why = (m.group(1).strip().split('\n')[0][:140] if m else '')
        rows.append((st, n, why))
    if not rows: continue
    ds = [r[1] for r in rows]
    print(f'{t}: {sum(r[0]=="PASS" for r in rows)}/{len(rows)} passed; desyncs repaired per run {ds}; median {statistics.median(ds)}, max {max(ds)}')
    for i, r in enumerate(rows):
        if r[0] == 'FAIL': print(f'   run {i+1} FAIL: {r[2]}')
