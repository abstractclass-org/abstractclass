#!/bin/sh
# The tests of the pre-push hook (.githooks/pre-push). Run them at the repository's root:
#   sh scripts/pre-push.test.sh
# Each test runs the hook with a fake gh first on PATH. The fake gh writes its arguments to a file, and then prints
# $FAKE_GH_OUT (the lines that the hook's --jq filter would print) or fails with $FAKE_GH_FAIL. The hook gets the
# push's ref lines on stdin, as Git gives them.

hook=$(pwd)/.githooks/pre-push
shell=$(command -v sh)
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0

mkdir "$dir/bin"
cat > "$dir/bin/gh" <<'EOF'
#!/bin/sh
echo "$*" >> "$FAKE_GH_LOG"
if [ -n "$FAKE_GH_FAIL" ]; then
	echo "gh: $FAKE_GH_FAIL" >&2
	exit 1
fi
[ -z "$FAKE_GH_OUT" ] || printf '%s\n' "$FAKE_GH_OUT"
EOF
chmod +x "$dir/bin/gh"

zero=0000000000000000000000000000000000000000
sha=1111111111111111111111111111111111111111
nl='
'

# run <ref line> [VAR=value ...]: runs the hook; leaves its exit status in $status, its messages in $dir/err, and
# gh's calls in $dir/log. The variables of the fake gh and ALLOW_DEV_PUSH start unset.
run() {
	line=$1
	shift
	: > "$dir/log"
	printf '%s\n' "$line" | env -u ALLOW_DEV_PUSH -u FAKE_GH_OUT -u FAKE_GH_FAIL \
		PATH="$dir/bin:$PATH" FAKE_GH_LOG="$dir/log" "$@" "$shell" "$hook" 2> "$dir/err"
	status=$?
}

# check <name> <condition>: PASS when the condition holds; the hook's messages follow a FAIL.
check() {
	if [ "$2" = ok ]; then
		echo "PASS  $1"
	else
		echo "FAIL  $1: $2 (exit $status)"
		sed 's/^/      /' "$dir/err"
		failed=1
	fi
}

# has <file> <text>: ok when the file holds the text.
has() { grep -qF -- "$2" "$1" && echo ok || echo "no \"$2\" in $1"; }
# exits <status>: ok when the hook's exit status is this one.
exits() { [ "$status" -eq "$1" ] && echo ok || echo "expected exit $1"; }

dev="refs/heads/dev $sha refs/heads/dev $zero"
refs_dev="refs/heads/abscls-fa50 $sha refs/heads/dev $zero"

run "$dev" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push to dev with a run in progress is refused" "$(exits 1)"
check "  it names the run's id" "$(has "$dir/err" 123)"
check "  it names the run's commit" "$(has "$dir/err" abcdef0)"
check "  it names when the run started" "$(has "$dir/err" 2026-11-07T10:00:00Z)"
check "  it gives the line that watches the run" "$(has "$dir/err" "scripts/ci-watch abstractclass abcdef0")"
check "  it says why: the cancel" "$(has "$dir/err" cancels)"
check "  it gives the override line" "$(has "$dir/err" "ALLOW_DEV_PUSH=1 git push origin dev")"
check "  it asks gh for the runs of Tests on dev" \
	"$(has "$dir/log" "run list --workflow Tests --branch dev")"

run "$dev" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z${nl}124 fedcba9 2026-11-07T10:05:00Z"
check "a push to dev with two runs is refused" "$(exits 1)"
check "  it names the first run" "$(has "$dir/err" "scripts/ci-watch abstractclass abcdef0")"
check "  it names the second run" "$(has "$dir/err" "scripts/ci-watch abstractclass fedcba9")"

run "$dev"
check "a push to dev with only completed runs passes" "$(exits 0)"
check "  it asks gh once" "$( [ "$(grep -c . "$dir/log")" -eq 1 ] && echo ok || echo "gh was called $(grep -c . "$dir/log") times" )"
check "  it prints nothing" "$( [ ! -s "$dir/err" ] && echo ok || echo "the hook printed" )"

run "$refs_dev" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push of a branch to dev's ref is refused" "$(exits 1)"

run "refs/heads/abscls-fa50 $sha refs/heads/abscls-fa50 $zero" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push of another ref passes" "$(exits 0)"
check "  it calls no gh" "$( [ ! -s "$dir/log" ] && echo ok || echo "gh was called" )"

run "refs/heads/main $sha refs/heads/main $zero" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push to main passes" "$(exits 0)"
check "  it calls no gh" "$( [ ! -s "$dir/log" ] && echo ok || echo "gh was called" )"

run "refs/tags/v1 $sha refs/tags/v1 $zero" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push of a tag passes" "$(exits 0)"

run "refs/heads/abscls-fa50 $sha refs/heads/dev-old $zero" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push to a branch whose name starts with dev passes" "$(exits 0)"

run "$dev${nl}refs/tags/v1 $sha refs/tags/v1 $zero" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push of dev and a tag together is refused" "$(exits 1)"

run "refs/tags/v1 $sha refs/tags/v1 $zero${nl}$dev" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z"
check "a push of a tag and dev together is refused" "$(exits 1)"

run "$dev" FAKE_GH_OUT="123 abcdef0 2026-11-07T10:00:00Z" ALLOW_DEV_PUSH=1
check "the override passes a push to dev with a run in progress" "$(exits 0)"
check "  it says in one line that the check was skipped" \
	"$( [ "$(grep -c . "$dir/err")" -eq 1 ] && has "$dir/err" skipped )"
check "  it calls no gh" "$( [ ! -s "$dir/log" ] && echo ok || echo "gh was called" )"

run "refs/heads/main $sha refs/heads/main $zero" ALLOW_DEV_PUSH=1
check "the override says nothing about a push of another ref" "$( [ -s "$dir/err" ] && echo "the hook printed" || echo ok )"

run "$dev" FAKE_GH_FAIL="HTTP 401: Bad credentials"
check "a push to dev passes when gh fails" "$(exits 0)"
check "  it prints gh's error" "$(has "$dir/err" "HTTP 401: Bad credentials")"
check "  it warns that the check did not run" "$(has "$dir/err" "did not run")"

run "$dev" PATH="$dir/empty"
check "a push to dev passes when gh is missing" "$(exits 0)"
check "  it warns that the check did not run" "$(has "$dir/err" "did not run")"

exit $failed
