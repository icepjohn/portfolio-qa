#!/usr/bin/env python3
"""Calcule le hash CSP du bloc JS inline de index.html.

Le navigateur hashe le contenu textuel exact de l'element, saut de ligne
initial compris. On repere le bloc par sa balise ouvrante sans attribut,
en ignorant toute occurrence situee dans un commentaire HTML.

    python3 tools/csp-hash.py           # affiche le hash attendu et verifie
    python3 tools/csp-hash.py --write   # met a jour la meta CSP dans index.html
"""
import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"
OPEN_TAG = "<" + "script>"
CLOSE_TAG = "</" + "script>"


def inline_body(src: str) -> str:
    stripped = re.sub(r"<!--.*?-->", lambda m: " " * len(m.group(0)), src, flags=re.S)
    start = stripped.find(OPEN_TAG)
    if start == -1:
        sys.exit("bloc JS inline introuvable")
    start += len(OPEN_TAG)
    end = stripped.find(CLOSE_TAG, start)
    if end == -1:
        sys.exit("balise fermante introuvable")
    return src[start:end]


def main() -> int:
    src = PAGE.read_text(encoding="utf-8")
    digest = hashlib.sha256(inline_body(src).encode("utf-8")).digest()
    expected = "sha256-" + base64.b64encode(digest).decode()

    current = re.search(r"'(sha256-[^']+)'", src)
    if "--write" in sys.argv:
        if not current:
            sys.exit("aucun hash sha256 dans la meta CSP")
        PAGE.write_text(src.replace(current.group(1), expected, 1), encoding="utf-8")
        print(f"meta CSP mise a jour : {expected}")
        return 0

    print(f"attendu : {expected}")
    print(f"dans la page : {current.group(1) if current else 'aucun'}")
    if current and current.group(1) == expected:
        print("OK")
        return 0
    print("DESYNCHRONISE — relancer avec --write")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
