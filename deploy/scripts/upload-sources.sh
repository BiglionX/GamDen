#!/bin/bash
TARGET=/root/GamDen_20260623052501/marketing-site

# Files to sync (use single quotes to handle special chars in path)
for f in "app/(pages)/page.tsx" "app/(pages)/product/page.tsx" "app/(pages)/download/page.tsx"; do
  echo "=== Uploading: $f ==="
  cat > "$TARGET/$f"
  echo "First line: $(head -1 $TARGET/$f)"
done
echo "=== DONE ==="