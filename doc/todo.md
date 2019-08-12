ToDo
====

- migrate to 'thoregon.universe'!

- browserloader: analyse 'npm' packages
    * supply a generated 'boot-mjs', reference to 'index' by query param, apply other query params to the universe like 'setup.mjs' does.
    * which packager used (rollup, webpack), anlyse packager config, find or build the browser package
    * maintain cache

- watch changes of config's, reload
    --> own module, installable, for reliant and sovereign nodes

Done
====

- bootloader & browserloader
    * use the leading '/' to find builtin and node_modules

- browserloader: analyse 'npm' packages
    * package.json: if exists "jsnext:main" use it
