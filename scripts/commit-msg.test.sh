#!/bin/sh
# The tests of the commit-msg hook (.githooks/commit-msg). Run them at the repository's root:
#   sh scripts/commit-msg.test.sh
# Each test writes a message to a file, runs the hook on it, and compares the hook's exit status.

hook=.githooks/commit-msg
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0

# expect <0 or 1> <name> <message>
expect() {
	printf '%s' "$3" > "$dir/msg"
	sh "$hook" "$dir/msg" 2> "$dir/err"
	status=$?
	if [ "$status" -eq "$1" ]; then
		echo "PASS  $2"
	else
		echo "FAIL  $2: exit $status, expected $1"
		sed 's/^/      /' "$dir/err"
		failed=1
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

exit $failed
