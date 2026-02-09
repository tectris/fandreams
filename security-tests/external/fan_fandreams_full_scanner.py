#!/usr/bin/env python3
"""
FanDreams Full Scanner — FAN Profile Wrapper
Executa o scanner completo com perfil FAN e output prefixado.

Uso:
    python fan_fandreams_full_scanner.py --target https://api.fandreams.app \
        --email fandreams.app@gmail.com --password '#Z1x2c3a4@321'
"""
import subprocess, sys, os

scanner = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fandreams_full_scanner.py")
args = [sys.executable, scanner] + sys.argv[1:]

if "--profile" not in args:
    args += ["--profile", "fan"]
if "--output" not in args:
    args += ["--output", "full_scan_fan"]

sys.exit(subprocess.call(args))
