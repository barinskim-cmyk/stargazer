#!/bin/bash
# Stargazer — auto sync to GitHub
# Usage: ./sync.sh
# Usage with message: ./sync.sh "fix sky screen"

cd "$(dirname "$0")"

MSG="${1:-update $(date '+%d %b %Y %H:%M')}"

echo "📦 Staging changes..."
git add .

if git diff --cached --quiet; then
  echo "✦ Nothing to commit — already up to date."
  exit 0
fi

echo "✍️  Committing: $MSG"
git commit -m "$MSG"

echo "🚀 Pushing to GitHub..."
git push

echo "✅ Done! GitHub Pages will update in ~1 min."
echo "   Privacy Policy: https://barinskim-cmyk.github.io/stargazer/privacy-policy.html"
