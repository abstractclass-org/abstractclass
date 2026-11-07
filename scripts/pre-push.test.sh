#!/bin/sh
# The tests of the pre-push hook (.githooks/pre-push). Run them at the repository's root:
#   sh scripts/pre-push.test.sh
# Each test runs the hook as Git runs it for a push to origin, with a fake gh first on PATH. The fake gh writes its
# arguments to a file, and then prints $FAKE_GH_OUT (the lines that the hook's --jq filter would print) or fails with
# $FAKE_GH_FAIL.

hook=.githooks/pre-push
shell=$(command -v sh)
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0
unset ALLOW_DEV_PUSH FAKE_GH_OUT FAKE_GH_FAIL

mkdir "$dir/bin"
cat > "$dir/bin/gh" <<'EOF'
#!/bin/sh
printf '%s
' "$*" >> "$FAKE_GH_LOG"
if [ -n "$FAKE_GH_FAIL" ]; then
	echo "gh: $FAKE_GH_FAIL" >&2
	exit 1
fi
[ -z "$FAKE_GH_OUT" ] || printf '%s\n' "$FAKE_GH_OUT"
EOF
chmod +x "$dir/bin/gh"

url=git@github.com:abstractclass-org/abstractclass.git
zero=0000000000000000000000000000000000000000
sha=1111111111111111111111111111111111111111
nl='
'
dev="refs/heads/dev $sha refs/heads/dev $zero"
tag="refs/tags/v1 $sha refs/tags/v1 $zero"
run1="123 abcdef0 2026-11-07T10:00:00Z"
run2="124 fedcba9 2026-11-07T10:05:00Z"

# push <ref lines> [VAR=value ...]: runs the hook with the remote's name and URL as its arguments and the ref lines on
# stdin. It leaves the hook's exit status in $status, its messages in $dir/err, and gh's calls in $dir/log.
push() {
	refs=$1
	shift
	: > "$dir/log"
	printf '%s\n' "$refs" | env PATH="$dir/bin:$PATH" FAKE_GH_LOG="$dir/log" "$@" "$shell" "$hook" origin "$url" \
		2> "$dir/err"
	status=$?
}

# check <name> <test> [<argument> ...]: PASS when the test holds. A FAIL gives why, then the hook's messages.
check() {
	name=$1
	shift
	if "$@"; then
		echo "PASS  $name"
	else
		echo "FAIL  $name: $why (exit $status)"
		sed 's/^/      /' "$dir/err"
		failed=1
	fi
}

# The tests: each returns 0 when it holds, or sets $why and returns 1.
exits() { [ "$status" -eq "$1" ] || { why="expected exit $1"; return 1; }; }
has() { grep -qF -- "$2" "$1" || { why="no \"$2\" in $1"; return 1; }; }
empty() { [ ! -s "$1" ] || { why="$1 is not empty"; return 1; }; }
lines() { n=$(grep -c . "$1"); [ "$n" -eq "$2" ] || { why="$1 has $n lines, expected $2"; return 1; }; }

push "$dev" FAKE_GH_OUT="$run1"
check "a push to dev with a run in progress is refused" exits 1
check "  it names the run's id" has "$dir/err" 123
check "  it names the run's commit" has "$dir/err" abcdef0
check "  it names when the run started" has "$dir/err" 2026-11-07T10:00:00Z
check "  it gives the line that watches the run" has "$dir/err" "scripts/ci-watch abstractclass abcdef0"
check "  it says why: the cancel" has "$dir/err" cancels
check "  it gives the override line" has "$dir/err" "ALLOW_DEV_PUSH=1 git push origin dev"
check "  it asks gh for the runs of Tests on dev" has "$dir/log" "--workflow Tests --branch dev"
check "  it asks about the repository of the push's URL" has "$dir/log" "--repo $url"

push "$dev" FAKE_GH_OUT="$run1$nl$run2"
check "a push to dev with two runs is refused" exits 1
check "  it names the first run" has "$dir/err" "scripts/ci-watch abstractclass abcdef0"
check "  it names the second run" has "$dir/err" "scripts/ci-watch abstractclass fedcba9"

push "$dev"
check "a push to dev with only completed runs passes" exits 0
check "  it asks gh once" lines "$dir/log" 1
check "  it prints nothing" empty "$dir/err"

push "refs/heads/abscls-fa50 $sha refs/heads/dev $zero" FAKE_GH_OUT="$run1"
check "a push of a branch to dev's ref is refused" exits 1

push "refs/heads/abscls-fa50 $sha refs/heads/abscls-fa50 $zero" FAKE_GH_OUT="$run1"
check "a push of another branch passes" exits 0
check "  it calls no gh" empty "$dir/log"

push "refs/heads/dev $sha refs/heads/main $zero" FAKE_GH_OUT="$run1"
check "the release, a push of dev to main, passes" exits 0
check "  it calls no gh" empty "$dir/log"

push "$tag" FAKE_GH_OUT="$run1"
check "a push of a tag passes" exits 0

push "refs/heads/abscls-fa50 $sha refs/heads/dev-old $zero" FAKE_GH_OUT="$run1"
check "a push to a branch whose name starts with dev passes" exits 0

push "$dev$nl$tag" FAKE_GH_OUT="$run1"
check "a push of dev and a tag together is refused" exits 1

push "$tag$nl$dev" FAKE_GH_OUT="$run1"
check "a push of a tag and dev together is refused" exits 1

push "$dev" FAKE_GH_OUT="$run1" ALLOW_DEV_PUSH=1
check "the override passes a push to dev with a run in progress" exits 0
check "  it says in one line" lines "$dir/err" 1
check "  that the check was skipped" has "$dir/err" skipped
check "  it calls no gh" empty "$dir/log"

push "$dev" FAKE_GH_OUT="$run1" ALLOW_DEV_PUSH=0
check "ALLOW_DEV_PUSH=0 does not skip the check" exits 1

push "$tag" ALLOW_DEV_PUSH=1
check "the override says nothing about a push of another ref" empty "$dir/err"

push "$dev" FAKE_GH_FAIL="HTTP 401: Bad credentials"
check "a push to dev passes when gh fails" exits 0
check "  it prints gh's error" has "$dir/err" "HTTP 401: Bad credentials"
check "  it warns that the check did not run" has "$dir/err" "did not run"

push "$dev" PATH="$dir/empty"
check "a push to dev passes when gh is missing" exits 0
check "  it warns that the check did not run" has "$dir/err" "did not run"

exit $failed
