#!/usr/bin/env python3
"""Back up and replace the files in a local clone of ShyFoo/shyfoo.github.io."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('repo', type=Path, help='Path to your existing local Git clone')
    parser.add_argument('--publish', action='store_true', help='Also commit and push to origin/main')
    parser.add_argument('--dry-run', action='store_true', help='Check the destination and list files without writing')
    args = parser.parse_args()
    source = Path(__file__).resolve().parent.parent
    repo = args.repo.expanduser().resolve()
    if source == repo or source in repo.parents or repo in source.parents:
        raise ValueError('Keep the unpacked project and your Git clone in separate folders.')

    def git(*arguments, check=True):
        return subprocess.run(['git', '-C', str(repo), *arguments], check=check,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if not repo.is_dir() or Path(git('rev-parse', '--show-toplevel').stdout.strip()).resolve() != repo:
        raise ValueError('The destination must be the root of your Git clone.')
    remote = git('config', '--get', 'remote.origin.url').stdout.strip()
    if not re.fullmatch(r'(?:https://github\.com/|git@github\.com:)ShyFoo/shyfoo\.github\.io(?:\.git)?/?', remote, re.I):
        raise ValueError('This installer is for ShyFoo/shyfoo.github.io. Check the origin remote.')
    if git('status', '--porcelain', '--untracked-files=all').stdout.strip():
        raise ValueError('Your clone has uncommitted or untracked files. Commit or move them before replacing it.')
    if args.publish and git('branch', '--show-current').stdout.strip() != 'main':
        raise ValueError('Switch to the main branch before using --publish.')
    tracked = set(git('ls-files', '-z').stdout.split('\0'))
    files = json.loads((source / 'deploy-files.json').read_text(encoding='utf-8'))
    for name in files:
        relative = PurePosixPath(name)
        if relative.is_absolute() or '..' in relative.parts or '.git' in relative.parts:
            raise ValueError(f'Invalid package path: {name}')
        src, dst = source / name, repo / name
        if not src.is_file() or src.is_symlink():
            raise ValueError(f'Missing package file: {name}')
        if repo not in dst.resolve().parents or any(p.is_symlink() for p in [dst, *dst.parents] if p != repo and repo in p.parents):
            raise ValueError(f'Unsafe destination path: {name}')
        if dst.exists() and (not dst.is_file() or name not in tracked):
            raise ValueError(f'An untracked or ignored destination would be overwritten: {name}')
    if args.dry_run:
        print(f'Would replace/copy {len(files)} files into {repo}. No files changed.')
        print('\n'.join(files))
        return

    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')
    backup = repo.parent / f'shyfoo-homepage-backup-{timestamp}.zip'
    git('archive', '--format=zip', f'--output={backup}', 'HEAD')
    print(f'Backup: {backup}')
    for name in files:
        src, dst = source / name, repo / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists() or src.read_bytes() != dst.read_bytes():
            shutil.copy2(src, dst)
    print(f'Copied {len(files)} project files. Existing unrelated files and Git history were preserved.')
    if not args.publish:
        print('Review with git diff, then commit and push the replacement when ready.')
        return
    git('add', '--', *files)
    if git('diff', '--cached', '--quiet', check=False).returncode == 1:
        git('commit', '-m', 'Refresh academic homepage')
    pushed = git('push', 'origin', 'main')
    print(pushed.stdout or pushed.stderr)
    print('Pushed to origin/main. GitHub Pages will publish according to your repository settings.')
    print('Homepage: https://shyfoo.github.io/')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Could not finish: {error}', file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError):
            print(error.stderr.strip(), file=sys.stderr)
        print('Any existing backup remains available. No force-push or history rewrite is used.', file=sys.stderr)
        sys.exit(1)
