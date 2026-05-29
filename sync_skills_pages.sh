#!/bin/bash
# 将 SKILLS 中每个子目录的同名 HTML 文件复制到 docs/SKILLS/ 下

SRC="D:/2Study/StudyNotes/SKILLS"
DST="D:/2Study/StudyNotes/docs/SKILLS"

mkdir -p "$DST"

count=0
for dir in "$SRC"/*/; do
    dirname=$(basename "$dir")
    html="$dir${dirname}.html"
    if [ -f "$html" ]; then
        cp "$html" "$DST/"
        echo "copied: $dirname.html"
        ((count++))
    fi
done

echo "done, $count files copied."
