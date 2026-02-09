#!/usr/bin/env python3
"""
FanDreams Full Scanner — CREATOR Profile Wrapper
Executa o scanner completo com perfil CREATOR e output prefixado.

Uso:
    python creator_fandreams_full_scanner.py --target https://api.fandreams.app \
        --email <your-email> --password '<your-password>'
"""
import subprocess, sys, os

scanner = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fandreams_full_scanner.py")
args = [sys.executable, scanner] + sys.argv[1:]

if "--profile" not in args:
    args += ["--profile", "creator"]
if "--output" not in args:
    args += ["--output", "full_scan_creator"]

sys.exit(subprocess.call(args))
