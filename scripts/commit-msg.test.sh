#!/bin/sh
# The tests of the commit-msg hook (.githooks/commit-msg). Run them at the repository's root:
#   sh scripts/commit-msg.test.sh
# Each test writes a message to a file, runs the hook on it, and compares the hook's exit status. The tests of the
# form run in a throwaway repository with no planning folder around it, so the check of private words is off there.
# The tests of private words lay out a throwaway planning folder: a copy of the planning folder's
# scripts/private-check, a clone in it, and a worktree of the clone. Their list of words is made up: PRIVATE_WORDS
# names it, except for the commit in the worktree, which goes through Git and reads the throwaway planning folder's
# own list. A checkout with no planning folder around it (the workflow's) or a shell with no python skips them.

hook=$(pwd)/.githooks/commit-msg
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0
git init -q --template= "$dir/plain"
where=$dir/plain

# expect <0 or 1> <name> <message>: runs the hook in $where on the message, and checks its exit status.
expect() {
	printf '%s' "$3" > "$dir/msg"
	(cd "$where" && sh "$hook" "$dir/msg") 2> "$dir/err"
	status=$?
	check "$2" exits "$1"
}

# check <name> <test> [<argument> ...]: PASS when the test holds. A FAIL gives why, then the hook's messages.
check() {
	name=$1
	shift
	if "$@"; then
		echo "PASS  $name"
	else
		echo "FAIL  $name: $why"
		sed 's/^/      /' "$dir/err"
		failed=1
	fi
}

# The tests, as in scripts/pre-commit.test.sh: each returns 0 when it holds, or sets $why and returns 1.
exits() { [ "$status" -eq "$1" ] || { why="exit $status, expected $1"; return 1; }; }
has() { grep -qF -- "$1" "$dir/err" || { why="no \"$1\" in the output"; return 1; }; }
lacks() { ! grep -qF -- "$1" "$dir/err" || { why="\"$1\" in the output"; return 1; }; }
hides() { ! grep -qiF -- "$1" "$dir/err" || { why="the output holds the word"; return 1; }; }

s72=$(printf '%072d' 0 | tr 0 a)
s73=$(printf '%073d' 0 | tr 0 a)
# 72 characters, each "−" (U+2212) 3 bytes in UTF-8: 216 bytes.
minus72=$(printf '%072d' 0 | sed 's/0/−/g')
nl='
'

expect 0 "a short subject" "The hook refuses long lines (abscls-v26k)$nl"
expect 0 "a subject of 72 characters" "$s72$nl"
expect 1 "a subject of 73 characters" "$s73$nl"
expect 0 "a subject of 72 characters of 3 bytes each" "$minus72$nl"
expect 1 "a subject of 73 characters of 3 bytes each" "$minus72−$nl"
expect 0 "a subject with no line end" "$s72"
expect 1 "a subject of 73 characters with CRLF" "$s73$(printf '\r')$nl"
expect 0 "a subject of 72 characters with CRLF" "$s72$(printf '\r')$nl"
expect 0 "a body of 72-character lines" "Subject$nl$nl$s72$nl- $(printf '%070d' 0 | tr 0 b)$nl"
expect 1 "a body line of 73 characters with spaces" "Subject$nl${nl}a $s73$nl"
expect 0 "a body line of one long word" "Subject$nl$nl$s73$s73$nl"
expect 0 "a list item of one long URL" "Subject$nl$nl- https://example.com/$s73$nl"
expect 1 "a list item with text and a long URL" "Subject$nl$nl- See https://example.com/$s73$nl"
expect 0 "long comment lines" "Subject$nl# $s73 $s73$nl"
expect 0 "a long comment line before the subject" "# $s73 $s73${nl}Subject$nl"
expect 0 "blank lines before the subject" "$nl${nl}Subject$nl"
expect 0 "the diff below the scissors line" \
	"Subject$nl# ------------------------ >8 ------------------------$nl+ $s73 $s73$nl"
expect 0 "a fixup subject" "fixup! $s73$nl"
expect 1 "a subject that only names fixup" "Fixup $s73$nl"
expect 0 "the subject and body of git revert" \
	"Revert \"$s72\"$nl${nl}This reverts commit 0123456789abcdef0123456789abcdef01234567.$nl"
expect 0 "the subject of a revert of a revert" "Reapply \"$s72\"$nl"
expect 0 "the subject of git pull's merge" \
	"Merge branch 'dev' of https://github.com/abstractclass-org/abstractclass into dev$nl"
expect 0 "the subject of a merge of a remote-tracking branch" "Merge remote-tracking branch 'origin/$s72'$nl"
expect 1 "a subject that only starts with Merge" "Merge the two caches $s73$nl"
expect 1 "a long subject and a long body line" "$s73$nl${nl}a $s73$nl"
expect 1 "a body glued to the subject" "The subject (abscls-x)$nl- a body line glued on$nl"
check "  it says why" has "commit-msg: the line after the subject is not blank"
expect 0 "a comment, then a blank line, after the subject" "Subject$nl# a comment$nl${nl}The body$nl"
expect 1 "a body glued to the subject past a comment" "Subject$nl# a comment${nl}The body$nl"

# The check of private words. The source of private-check: the planning folder around this repository's main
# checkout, as the hook finds it (at the planning folder's root, its own scripts/).
main=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) && main=$(dirname "$main")
source=
for c in "$main/scripts/private-check" "$main/../scripts/private-check"; do
	[ -f "$c" ] && { source=$c; break; }
done
if [ -z "$source" ]; then
	echo "SKIP  the private words: no planning folder around this checkout"
elif ! command -v python > /dev/null 2>&1 && ! command -v python3 > /dev/null 2>&1; then
	echo "SKIP  the private words: no python"
else
	org=$dir/org
	mkdir -p "$org/scripts"
	git init -q --template= "$org"  # a repository, as the planning folder is
	cp "$source" "$org/scripts/private-check"
	printf 'hostbox\n' > "$dir/words"
	export PRIVATE_WORDS="$dir/words"
	git init -q --template= "$org/clone"
	git -C "$org/clone" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base --no-verify
	git -C "$org/clone" worktree add -q -b wt "$org/clone/worktrees/wt"
	leak="The subject$nl${nl}ssh to hostbox$nl"

	where=$org/clone
	expect 1 "a message with a listed word, in a main checkout" "The subject$nl${nl}ssh to HostBox$nl"
	check "  it names the line" has "private-check: the commit message, line 3 holds a private word: ssh to <private>"
	check "  it hides the word" hides hostbox
	check "  it says what to do" has "commit-msg: no commit. Take the private word out of the message"
	expect 1 "a subject with a listed word" "Ssh to hostbox$nl"
	expect 0 "a listed word inside a longer name" "The subject$nl${nl}the hostboxes$nl"
	expect 0 "a listed word in a comment" "The subject$nl${nl}A body$nl# Git's comment: hostbox$nl"
	expect 0 "a listed word below the scissors line" \
		"Subject$nl# ------------------------ >8 ------------------------$nl+ hostbox$nl"

	# A commit in a worktree goes through Git, as a worker's does: Git exports GIT_DIR to the hook there. The list
	# is the throwaway planning folder's own .machine/private-words, with no PRIVATE_WORDS, as on a real machine.
	mkdir -p "$org/.machine" "$dir/hooks"
	cp "$dir/words" "$org/.machine/private-words"
	cp "$hook" "$dir/hooks/commit-msg"
	chmod +x "$dir/hooks/commit-msg"
	printf '%s' "$leak" > "$dir/msg"
	(unset PRIVATE_WORDS; git -C "$org/clone/worktrees/wt" -c core.hooksPath="$dir/hooks" -c user.email=t@t \
		-c user.name=t commit -q --allow-empty -F "$dir/msg") > "$dir/err" 2>&1
	status=$?
	check "a commit in a worktree with a listed word is refused" exits 1
	check "  it names the line" has "line 3 holds a private word: ssh to <private>"
	check "  it finds the list" lacks "the check is off"

	PRIVATE_WORDS=$dir/no-such-list
	expect 0 "a machine with no list passes" "$leak"
	check "  it says that the check is off" has "the check is off"
	PRIVATE_WORDS=$dir/words

	rm "$org/scripts/private-check"
	expect 0 "a clone with no planning folder around it passes" "$leak"
	where=$org/clone/worktrees/wt
	expect 0 "  and so does its worktree" "$leak"
fi

exit $failed
