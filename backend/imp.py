"""
Minimal compatibility shim for the removed `imp` module (Python 3.12+).

Provides a small subset of the old imp API (find_module, load_source, load_module)
by delegating to importlib. This is a quick workaround for third-party packages
that still import `imp`. Prefer upgrading the offending dependency long-term.
"""

from __future__ import annotations
import importlib.util
import importlib.machinery
import sys
import os
import types
from typing import Optional, Tuple


def load_source(name: str, pathname: str) -> types.ModuleType:
    """Load a module from a source file path (replacement for imp.load_source)."""
    spec = importlib.util.spec_from_file_location(name, pathname)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module {name!r} from {pathname!r}")
    module = importlib.util.module_from_spec(spec)
    # Execute module code
    spec.loader.exec_module(module)  # type: ignore
    sys.modules[name] = module
    return module


def load_module(name: str, file, pathname: str, description=None) -> types.ModuleType:
    """
    Compatibility wrapper for imp.load_module(name, file, pathname, description).
    Ignores the file/description and loads using pathname.
    """
    if pathname is None:
        raise ImportError("pathname must be provided to load_module")
    return load_source(name, pathname)


def find_module(name: str, path: Optional[Tuple[str, ...]] = None):
    """
    Minimal version of imp.find_module.
    Returns a tuple (fileobj_or_None, pathname, description).
    This scans the provided path (or sys.path) for <name>.py.
    """
    search_paths = list(path) if path else list(sys.path)
    for entry in search_paths:
        try:
            candidate = os.path.join(entry, f"{name}.py")
        except TypeError:
            continue
        if os.path.isfile(candidate):
            return (None, candidate, ("", "", importlib.machinery.SOURCE))
    raise ImportError(f"Module {name!r} not found via find_module")
