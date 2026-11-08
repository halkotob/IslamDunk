#!/bin/bash
# q9.sh <repo dir> <out dir> <runs> <tests...>: each test alone, N times, nothing else running
REPO=$1; OUT=$2; N=$3; shift 3
mkdir -p $OUT
cd $REPO
for t in "$@"; do for i in $(seq 1 $N); do
  timeout 900 node tests/run.mjs --only $t --workers 1 > $OUT/$t-$i.log 2>&1
  echo "$t $i $(grep -E "^(PASS|FAIL) " $OUT/$t-$i.log | awk '{print $1}')" >> $OUT/progress.txt
done; done
echo done >> $OUT/progress.txt
