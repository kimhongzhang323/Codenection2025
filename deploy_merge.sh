#!/bin/bash
set -e

# Save current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# If already on master, just push
if [ "$CURRENT_BRANCH" = "master" ]; then
  echo "Already on master, just pushing..."
  git push origin master
  exit 0
fi

echo "Merging branch '$CURRENT_BRANCH' into master..."

# Fetch latest refs
git fetch origin

# Switch to master and update
git checkout master
git pull origin master

# Merge current branch into master
git merge --no-ff "$CURRENT_BRANCH" -m "Merge branch '$CURRENT_BRANCH' into master"

# Push updated master
git push origin master

# Switch back to original branch
git checkout "$CURRENT_BRANCH"

echo "✅ Successfully merged '$CURRENT_BRANCH' into master and pushed."
