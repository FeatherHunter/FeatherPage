#!/usr/bin/env python3
"""
sync_docs.py — 扫描 docs/ 目录，自动更新 index.html 的文件列表
运行时机：git-back push 之前
"""
import os
import re
from datetime import datetime
from pathlib import Path

DOCS_DIR = Path(__file__).parent.resolve()
INDEX_FILE = DOCS_DIR / "index.html"
FILES_START = "<!-- FILES_MARKER_START -->"
FILES_END = "<!-- FILES_MARKER_END -->"


def get_files():
    """扫描 docs/*.html，排除 index.html 自身"""
    files = []
    for f in sorted(DOCS_DIR.glob("*.html")):
        if f.name == "index.html":
            continue
        mtime = datetime.fromtimestamp(f.stat().st_mtime)
        files.append({
            "name": f.stem,            # 无后缀名
            "filename": f.name,       # 完整文件名
            "date": mtime.strftime("%Y-%m-%d"),
            "time": mtime.strftime("%H:%M"),
        })
    return files


def build_file_items(files):
    """生成文件列表 HTML 片段"""
    if not files:
        return '<li class="empty">暂无文件</li>'

    items = []
    for f in files:
        items.append(
            f'<li class="file-item">'
            f'<a class="file-link" href="{f["filename"]}">'
            f'<span class="file-name">'
            f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
            f'{f["name"]}'
            f'</span>'
            f'<span class="file-date">{f["date"]}</span>'
            f'</a>'
            f'</li>'
        )
    return "\n".join(items)


def update_index():
    """更新 index.html 的文件列表区域"""
    content = INDEX_FILE.read_text(encoding="utf-8")

    files = get_files()
    file_html = build_file_items(files)

    # 替换文件列表
    pattern = re.compile(
        re.escape(FILES_START) + r".*?" + re.escape(FILES_END),
        re.DOTALL
    )
    replacement = f"{FILES_START}\n{file_html}\n      {FILES_END}"
    content = pattern.sub(replacement, content)

    # 更新最后时间
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    content = re.sub(
        r'<!-- LAST_UPDATED -->.*?<!-- LAST_UPDATED_END -->',
        f'<!-- LAST_UPDATED -->{now}<!-- LAST_UPDATED_END -->',
        content
    )

    INDEX_FILE.write_text(content, encoding="utf-8")
    print(f"[OK] sync_docs: {len(files)} files updated. Last updated: {now}")


if __name__ == "__main__":
    update_index()