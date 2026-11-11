#!/bin/sh
# The tests of the pre-commit hook (.githooks/pre-commit). Run them at the repository's root:
#   sh scripts/pre-commit.test.sh
# Each test stages files in a throwaway repository and runs the hook there, as Git runs it. The throwaway repository
# holds a copy of scripts/doc-widths.mjs and one commit: old.md, and old.sh, a script at mode 100644 (as a script from
# Windows lands). Most tests stage a file in the index only (git update-index --cacheinfo), so a path that a file
# system cannot hold, such as 0:foo, is staged too. The last test reads this repository's own index: each script of it
# has its exec bit, or the hook refuses its next edit.

root=$(pwd)
hook=$root/.githooks/pre-commit
shell=$(command -v sh)
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0
nl='
'
long=$(printf 'word %.0s' $(seq 30))  # 150 characters with spaces: a line that can wrap
script="#!/bin/sh${nl}echo hi$nl"

base=$dir/base
repo=$dir/repo
git init -q --template= "$base"  # no sample hooks, nor a global templateDir's
git -C "$base" config user.email t@t
git -C "$base" config user.name t
git -C "$base" config core.protectNTFS false  # Git for Windows refuses a path such as 0:foo in the index without it
mkdir "$base/scripts"
cp scripts/doc-widths.mjs "$base/scripts/"
printf 'short\n%s\n' "$long" > "$base/old.md"
printf '#!/bin/sh\necho old\n' > "$base/old.sh"
git -C "$base" add old.md old.sh scripts/doc-widths.mjs
git -C "$base" update-index --chmod=-x old.sh  # 100644 on Linux as on Windows
git -C "$base" commit -q -m base --no-verify

# fresh: a copy of the base repository, for one test.
fresh() {
	rm -rf "$repo"
	cp -R "$base" "$repo"
}

# g <git arguments>: git in the throwaway repository.
g() { git -C "$repo" "$@"; }

# stage <mode> <path> <content>: the path in the index at that mode, with that content, and no file on disk.
stage() {
	blob=$(printf '%s' "$3" | g hash-object -w --stdin)
	g update-index --add --cacheinfo "$1,$blob,$2"
}

# hook: runs the hook at the throwaway repository's root. It leaves its exit status in $status and its messages in
# $dir/out.
hook() {
	(cd "$repo" && "$shell" "$hook") > "$dir/out" 2>&1
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
		sed 's/^/      /' "$dir/out"
		failed=1
	fi
}

# The tests: each returns 0 when it holds, or sets $why and returns 1.
exits() { [ "$status" -eq "$1" ] || { why="expected exit $1"; return 1; }; }
has() { grep -qF -- "$1" "$dir/out" || { why="no \"$1\" in the output"; return 1; }; }
lacks() { ! grep -qF -- "$1" "$dir/out" || { why="\"$1\" in the output"; return 1; }; }
quiet() { [ ! -s "$dir/out" ] || { why="the output is not empty"; return 1; }; }

fresh
printf '%s' "$script" > "$repo/new.sh"  # on disk too: the fix reads it there
g add -- new.sh
g update-index --chmod=-x -- new.sh  # as Git for Windows stages a new file
hook
check "a new script at mode 100644 is refused" exits 1
check "  it names the fix" has "new.sh starts with #! and its mode is 100644: git update-index --chmod=+x -- 'new.sh'"
check "  it says what to do" has "pre-commit: give each script its exec bit (the command above), and commit again"
g update-index --chmod=+x -- new.sh
hook
check "  after the fix, it passes" exits 0
check "  after the fix, it prints nothing" quiet

fresh
stage 100755 new.sh "$script"
hook
check "a new script at mode 100755 passes" exits 0
check "  it prints nothing" quiet

fresh
stage 100644 new.py "# not #!${nl}print(1)$nl"
stage 100644 blank.sh "$nl#!/bin/sh$nl"
hook
check "a file with no #! at its first byte, at mode 100644, passes" exits 0

fresh
stage 100644 old.sh "#!/bin/sh${nl}echo edited$nl"
hook
check "an edit of a script at mode 100644 is refused" exits 1
check "  it names the script" has "old.sh starts with #!"

fresh
g update-index --chmod=+x -- old.sh
g commit -q -m x --no-verify
g update-index --chmod=-x -- old.sh
hook
check "a script that loses its exec bit (a mode change only) is refused" exits 1
check "  it names the script" has "old.sh starts with #!"

fresh
g rm -q --cached old.sh
hook
check "a deleted script passes" exits 0

fresh
stage 100644 "a b.sh" "$script"
hook
check "a path with a space is checked" exits 1
check "  its fix quotes the path" has "git update-index --chmod=+x -- 'a b.sh'"

fresh
stage 120000 link "#!/bin/sh"
hook
check "a link passes, though its target starts with #!" exits 0

fresh
stage 120000 link old.md
g commit -q -m link --no-verify
g rm -q --cached link
stage 100644 link "$script"
hook
check "a script that replaces a link (a type change) is refused" exits 1
check "  it names the script" has "link starts with #!"

fresh
g mv old.sh renamed.sh
hook
check "a renamed script at mode 100644 is checked as a new file" exits 1
check "  it names the new path" has "renamed.sh starts with #!"
check "  it does not name the old path" lacks "'old.sh'"

fresh
g update-index --chmod=+x -- old.sh
g commit -q -m x --no-verify
g mv old.sh renamed.sh
hook
check "a renamed script at mode 100755 passes" exits 0

fresh
stage 100644 "a${nl}b.txt" "text$nl"
stage 100644 z.sh "$script"
hook
check "a path with a newline breaks the check of no other path" exits 1
check "  it names the other path" has "z.sh starts with #!"

fresh
stage 100644 -x.sh "$script"
hook
check "a path that looks like an option is checked" exits 1
check "  its fix reads it as a path" has "git update-index --chmod=+x -- '-x.sh'"

fresh
stage 100644 foo "plain$nl"
if stage 100644 0:foo "$script" 2> /dev/null; then
	hook
	check "a path that looks like a stage is checked" exits 1
	check "  0:foo is read as a path, not as stage 0 of foo" has "0:foo starts with #!"
else
	echo "SKIP  a path that looks like a stage: this Git refuses 0:foo (Git for Windows refuses every path with a colon)"
fi

# The width check runs in node, after the exec bit check. A shell with no node skips it, as the hook does.
if command -v node > /dev/null 2>&1; then
	fresh
	stage 100644 new.md "# Title$nl$nl$long$nl"
	hook
	check "a long line in a staged Markdown file is refused" exits 1
	check "  it names the line" has "new.md:3: 150 characters (at most 120)"

	fresh
	stage 100644 new.sh "$script"
	stage 100644 new.md "# Title$nl$nl$long$nl"
	hook
	check "a script and a long line are both reported" exits 1
	check "  it names the script" has "new.sh starts with #!"
	check "  it names the long line" has "new.md:3: 150 characters"
else
	echo "SKIP  the width check: no node"
fi

# This repository's index: each file that starts with #! has mode 100755. git grep reads the staged content of every
# text file, and a match on line 1 is a #! first.
{
	git grep --cached -I -n -e '^#!' -- . | sed -n 's/^\(.*\):1:#!.*/\1/p' | while IFS= read -r f; do
		mode=$(git ls-files -s -- "$f" | cut -d ' ' -f 1)
		[ "$mode" = 100755 ] || echo "$f has mode $mode: git update-index --chmod=+x -- '$f'"
	done
} > "$dir/out" 2>&1  # an error of git is in the output too, and fails the test
status=0
check "each script of this repository has its exec bit" quiet

exit $failed
