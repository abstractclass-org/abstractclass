#!/bin/sh
# The tests of the commit-msg hook (.githooks/commit-msg). Run them at the repository's root:
#   sh scripts/commit-msg.test.sh
# Each test writes a message to a file, runs the hook on it, and compares the hook's exit status. The tests of the
# form run in a throwaway repository with no planning folder around it, so the check of private words is off there.
# The tests of private words lay out a throwaway planning folder: a copy of the planning folder's
# scripts/private-check, a clone in it, and a worktree of the clone. Their list of words is made up (PRIVATE_WORDS).
# A checkout with no planning folder around it (the workflow's) or a shell with no python skips them.

hook=$(pwd)/.githooks/commit-msg
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0
git init -q --template= "$dir/plain"
where=$dir/plain

# expect <0 or 1> <name> <message>: runs the hook in $where.
expect() {
	printf '%s' "$3" > "$dir/msg"
	(cd "$where" && sh "$hook" "$dir/msg") 2> "$dir/err"
	status=$?
	if [ "$status" -eq "$1" ]; then
		echo "PASS  $2"
	else
		echo "FAIL  $2: exit $status, expected $1"
		sed 's/^/      /' "$dir/err"
		failed=1
	fi
}

# has <name> <text>: PASS when the last test's output holds the text.
has() {
	if grep -qF -- "$2" "$dir/err"; then
		echo "PASS  $1"
	else
		echo "FAIL  $1: no \"$2\" in the output"
		sed 's/^/      /' "$dir/err"
		failed=1
	fi
}

# hides <name> <word>: PASS when the last test's output does not hold the word, in any case.
hides() {
	if grep -qiF -- "$2" "$dir/err"; then
		echo "FAIL  $1: the output holds the word"
		failed=1
	else
		echo "PASS  $1"
	fi
}

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
has "  it says why" "commit-msg: the line after the subject is not blank"
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
	cp "$source" "$org/scripts/private-check"
	printf 'hostbox\n' > "$dir/words"
	export PRIVATE_WORDS="$dir/words"
	git init -q --template= "$org/clone"
	git -C "$org/clone" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base --no-verify
	git -C "$org/clone" worktree add -q -b wt "$org/clone/worktrees/wt"

	where=$org/clone
	expect 1 "a message with a listed word, in a main checkout" "The subject$nl${nl}ssh to HostBox$nl"
	has "  it names the line" "private-check: the commit message, line 3 holds a private word: ssh to <private>"
	hides "  it hides the word" hostbox
	has "  it says what to do" "commit-msg: no commit. Take the private word out of the message"
	expect 1 "a subject with a listed word" "Ssh to hostbox$nl"
	expect 0 "a listed word inside a longer name" "The subject$nl${nl}the hostboxes$nl"
	expect 0 "a listed word in a comment" "The subject$nl${nl}A body$nl# Git's comment: hostbox$nl"
	expect 0 "a listed word below the scissors line" \
		"Subject$nl# ------------------------ >8 ------------------------$nl+ hostbox$nl"

	where=$org/clone/worktrees/wt
	expect 1 "a message with a listed word, in a worktree" "The subject$nl${nl}ssh to hostbox$nl"
	has "  it names the line" "line 3 holds a private word: ssh to <private>"

	PRIVATE_WORDS=$dir/no-such-list
	expect 0 "a machine with no list passes" "The subject$nl${nl}ssh to hostbox$nl"
	PRIVATE_WORDS=$dir/words

	rm "$org/scripts/private-check"
	where=$org/clone
	expect 0 "a clone with no planning folder around it passes" "The subject$nl${nl}ssh to hostbox$nl"
	where=$org/clone/worktrees/wt
	expect 0 "  and so does its worktree" "The subject$nl${nl}ssh to hostbox$nl"
fi

exit $failed
