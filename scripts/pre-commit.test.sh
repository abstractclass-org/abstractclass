#!/bin/sh
# The tests of the pre-commit hook (.githooks/pre-commit). Run them at the repository's root:
#   sh scripts/pre-commit.test.sh
# Each test stages files in a throwaway repository and runs the hook there, as Git runs it. The throwaway repository
# holds one commit: a copy of scripts/doc-widths.mjs, and old.sh, a script at mode 100644 (as a script from Windows
# lands). Most tests stage a file in the index only (git update-index --cacheinfo), so a path that a file system cannot
# hold, such as 0:foo, is staged too. Git for Windows refuses a path with a colon or a newline, so those two tests run
# only on other systems, such as the workflow's Linux. The tests of private words lay out a throwaway planning folder:
# a copy of the planning folder's scripts/private-check, the throwaway repository in it, and a worktree of that
# repository. Their list of words is made up: PRIVATE_WORDS names it, except for the commit in the worktree, which
# goes through Git and reads the throwaway planning folder's own list. A checkout with no planning folder around it
# (the workflow's) or a shell with no python skips them. The last test reads this repository's own index: each script
# of it has its exec bit, or the hook refuses its next edit.

hook=$(pwd)/.githooks/pre-commit
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT
failed=0
nl='
'
long=$(printf '%030d' 0 | sed 's/0/word /g')  # 150 characters with spaces: a line that can wrap
script="#!/bin/sh${nl}echo hi$nl"
case $(uname -s) in MINGW* | MSYS* | CYGWIN*) windows=1 ;; *) windows= ;; esac

base=$dir/base
repo=$dir/repo
git init -q --template= "$base"  # no sample hooks, nor a global templateDir's
git -C "$base" config user.email t@t
git -C "$base" config user.name t
mkdir "$base/scripts"
cp scripts/doc-widths.mjs "$base/scripts/"
printf '#!/bin/sh\necho old\n' > "$base/old.sh"  # printf sets no exec bit, so git add stages old.sh at 100644
git -C "$base" add old.sh scripts/doc-widths.mjs
git -C "$base" commit -q -m base --no-verify

# fresh: a copy of the base repository, for one test.
fresh() {
	rm -rf "$repo"
	cp -R "$base" "$repo"
}

# g <git arguments>: git in the throwaway repository.
g() { git -C "$repo" "$@"; }

# stage <mode> <path> <content>: the path in the index at that mode, with that content, and no file on disk. When Git
# refuses the path, the tests fail.
stage() {
	blob=$(printf '%s' "$3" | g hash-object -w --stdin)
	g update-index --add --cacheinfo "$1,$blob,$2" || { echo "FAIL  git cannot stage $2"; failed=1; }
}

# commit: runs the hook at the throwaway repository's root, as Git runs it before a commit. It leaves its exit status
# in $status and its messages in $dir/out.
commit() {
	(cd "$repo" && sh "$hook") > "$dir/out" 2>&1
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
hides() { ! grep -qiF -- "$1" "$dir/out" || { why="the output holds the word"; return 1; }; }

fresh
printf '%s' "$script" > "$repo/new.sh"  # on disk too: the fix reads it there
g add -- new.sh  # at 100644, as Git for Windows stages every new file
commit
check "a new script at mode 100644 is refused" exits 1
check "  it names the fix" has "new.sh starts with #! and its mode is 100644: git update-index --chmod=+x -- 'new.sh'"
check "  it says what to do" has "pre-commit: give each script its exec bit (the command above), and commit again"
g update-index --chmod=+x -- new.sh
commit
check "  after the fix, it passes" exits 0
check "  after the fix, it prints nothing" quiet

fresh
stage 100755 new.sh "$script"
commit
check "a new script at mode 100755 passes" exits 0
check "  it prints nothing" quiet

fresh
stage 100644 new.py "# not #!${nl}print(1)$nl"
stage 100644 blank.sh "$nl#!/bin/sh$nl"
commit
check "a file with no #! at its first byte, at mode 100644, passes" exits 0

fresh
stage 100644 old.sh "#!/bin/sh${nl}echo edited$nl"
commit
check "an edit of a script at mode 100644 is refused" exits 1
check "  it names the script" has "old.sh starts with #!"

fresh
g update-index --chmod=+x -- old.sh
g commit -q -m x --no-verify
g update-index --chmod=-x -- old.sh
commit
check "a script that loses its exec bit (a mode change only) is refused" exits 1
check "  it names the script" has "old.sh starts with #!"

fresh
g rm -q --cached old.sh
commit
check "a deleted script passes" exits 0

fresh
stage 100644 "a b.sh" "$script"
commit
check "a path with a space is checked" exits 1
check "  its fix quotes the path" has "git update-index --chmod=+x -- 'a b.sh'"

fresh
stage 120000 link "#!/bin/sh"
commit
check "a link passes, though its target starts with #!" exits 0

fresh
stage 120000 link old.sh
g commit -q -m link --no-verify
g rm -q --cached link
stage 100644 link "$script"
commit
check "a script that replaces a link (a type change) is refused" exits 1
check "  it names the script" has "link starts with #!"

fresh
g mv old.sh renamed.sh
commit
check "a renamed script at mode 100644 is checked as a new file" exits 1
check "  it names the new path" has "renamed.sh starts with #!"
check "  it does not name the old path" lacks "'old.sh'"

fresh
g update-index --chmod=+x -- old.sh
g commit -q -m x --no-verify
g mv old.sh renamed.sh
commit
check "a renamed script at mode 100755 passes" exits 0

if [ -n "$windows" ]; then
	echo "SKIP  a path with a newline: Git for Windows refuses it"
else
	fresh
	stage 100644 "a${nl}b.txt" "text$nl"
	stage 100644 z.sh "$script"
	commit
	check "a path with a newline breaks the check of no other path" exits 1
	check "  it names the other path" has "z.sh starts with #!"
fi

fresh
stage 100644 -x.sh "$script"
commit
check "a path that looks like an option is checked" exits 1
check "  its fix reads it as a path" has "git update-index --chmod=+x -- '-x.sh'"

if [ -n "$windows" ]; then
	echo "SKIP  a path that looks like a stage: Git for Windows refuses 0:foo"
else
	fresh
	stage 100644 foo "plain$nl"
	stage 100644 0:foo "$script"
	commit
	check "a path that looks like a stage is checked" exits 1
	check "  0:foo is read as a path, not as stage 0 of foo" has "0:foo starts with #!"
fi

# The width check runs in node, after the exec bit check. A shell with no node skips it, as the hook does.
if command -v node > /dev/null 2>&1; then
	fresh
	stage 100644 new.md "# Title$nl$nl$long$nl"
	commit
	check "a long line in a staged Markdown file is refused" exits 1
	check "  it names the line" has "new.md:3: 150 characters (at most 120)"

	fresh
	stage 100644 new.sh "$script"
	stage 100644 new.md "# Title$nl$nl$long$nl"
	commit
	check "a script and a long line are both reported" exits 1
	check "  it names the script" has "new.sh starts with #!"
	check "  it names the long line" has "new.md:3: 150 characters"
else
	echo "SKIP  the width check: no node"
fi

# The check of private words. The source of private-check: the planning folder around this repository's main
# checkout, as the hook finds it.
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
	mkdir -p "$dir/org/scripts"
	git init -q --template= "$dir/org"  # a repository, as the planning folder is
	cp "$source" "$dir/org/scripts/private-check"
	printf 'hostbox\n' > "$dir/words"
	export PRIVATE_WORDS="$dir/words"
	repo=$dir/org/repo

	fresh
	stage 100644 notes.txt "fine${nl}ssh to HostBox now$nl"
	commit
	check "an added line with a listed word is refused" exits 1
	check "  it names the line" has "private-check: notes.txt:2 holds a private word: ssh to <private> now"
	check "  it hides the word" hides hostbox

	fresh
	stage 100644 hostbox.md "fine$nl"
	commit
	check "a new path with a listed word is refused" exits 1
	check "  it names the path" has "private-check: <private>.md holds a private word: <private>.md"
	check "  it hides the word" hides hostbox

	# A pure rename and an empty new file add no line, and their diff has no +++ line: the path comes from
	# --name-only.
	fresh
	printf 'fine\n' > "$repo/notes.txt"
	g add -- notes.txt
	g commit -q -m notes --no-verify
	g mv -- notes.txt hostbox.txt
	commit
	check "a pure rename to a path with a listed word is refused" exits 1
	check "  it names the path" has "private-check: <private>.txt holds a private word: <private>.txt"
	check "  it hides the word" hides hostbox

	fresh
	stage 100644 hostbox.txt ""
	commit
	check "an empty new file with a listed word in its path is refused" exits 1
	check "  it names the path" has "private-check: <private>.txt holds a private word: <private>.txt"
	check "  it hides the word" hides hostbox

	# --name-only gives each path that the commit changes too: an old path stops each edit of its file, as an old line
	# does not.
	fresh
	stage 100644 hostbox.txt "fine$nl"
	g commit -q -m old --no-verify
	stage 100644 hostbox.txt "fine, edited$nl"
	commit
	check "an edit of a file whose path holds a listed word is refused" exits 1
	check "  it names the path" has "private-check: <private>.txt holds a private word: <private>.txt"

	fresh
	stage 100644 notes.txt "the hostboxes$nl"
	commit
	check "a listed word inside a longer name passes" exits 0

	fresh
	stage 100644 old.txt "an old hostbox line${nl}short$nl"
	g commit -q -m old --no-verify
	stage 100644 old.txt "an old hostbox line${nl}short, edited$nl"
	commit
	check "an old line with a listed word stops no edit of the file" exits 0
	check "  it prints nothing" quiet

	# A commit in a worktree goes through Git, as a worker's does: Git exports GIT_DIR to the hook there. The list is
	# the throwaway planning folder's own .machine/private-words, with no PRIVATE_WORDS, as on a real machine.
	fresh
	g worktree add -q -b wt "$dir/org/wt"
	printf 'ssh to hostbox\n' > "$dir/org/wt/notes.txt"
	git -C "$dir/org/wt" add -- notes.txt
	mkdir -p "$dir/org/.machine" "$dir/hooks"
	cp "$dir/words" "$dir/org/.machine/private-words"
	cp "$hook" "$dir/hooks/pre-commit"
	chmod +x "$dir/hooks/pre-commit"
	(unset PRIVATE_WORDS; git -C "$dir/org/wt" -c core.hooksPath="$dir/hooks" commit -q -m notes) > "$dir/out" 2>&1
	status=$?
	check "a commit in a worktree with a listed word is refused" exits 1
	check "  it names the line" has "private-check: notes.txt:1 holds a private word: ssh to <private>"
	check "  it finds the list" lacks "the check is off"

	PRIVATE_WORDS=$dir/no-such-list
	fresh
	stage 100644 notes.txt "ssh to hostbox$nl"
	commit
	check "a machine with no list passes" exits 0
	check "  it says that the check is off" has "the check is off"
	PRIVATE_WORDS=$dir/words

	rm "$dir/org/scripts/private-check"
	fresh
	stage 100644 notes.txt "ssh to hostbox$nl"
	commit
	check "a clone with no planning folder around it passes" exits 0
	check "  it prints nothing" quiet
	g worktree add -q -b wt2 "$dir/org/wt2"
	printf 'ssh to hostbox\n' > "$dir/org/wt2/notes.txt"
	git -C "$dir/org/wt2" add -- notes.txt
	git -C "$dir/org/wt2" -c core.hooksPath="$dir/hooks" commit -q -m notes > "$dir/out" 2>&1
	status=$?
	check "  and so does a commit in its worktree" exits 0
	check "  it prints nothing" quiet
fi

# This repository's index: each file that starts with #! has mode 100755. git grep reads the staged content of every
# file, binary too (-a), and gives each match as its path, its line's number and the match (-o), each one followed by a
# NUL (-z: a path with no quotes). A match on line 1 is a #! first. Then git ls-files gives the mode of each such file.
{
	git grep --cached -a -n -o -z -e '^#!' -- . | tr '\0' '\n' |
		awk 'NR % 3 == 1 { path = $0 } NR % 3 == 2 && $0 == "1" { print path }' > "$dir/scripts"
	git ls-files -s -z | tr '\0' '\n' | awk '
		FILENAME == ARGV[1] { script[$0] = 1; next }
		{
			path = substr($0, index($0, "\t") + 1)  # "mode sha stage", a tab, the path
			if ((path in script) && $1 != "100755")
				printf "%s has mode %s: git update-index --chmod=+x -- \047%s\047\n", path, $1, path
		}' "$dir/scripts" -
} > "$dir/out" 2>&1  # an error of git is in the output too, and fails the test
status=0  # the line FAIL gives $status, and no hook ran here
check "each script of this repository has its exec bit" quiet

exit $failed
