import hljs from 'highlight.js/lib/core'

// ============================================================================
// Регистрация 50 самых популярных языков
// Порядок — примерно по популярности (TIOBE/GitHub/StackOverflow survey 2024)
// ============================================================================

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import csharp from 'highlight.js/lib/languages/csharp'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import scala from 'highlight.js/lib/languages/scala'
import dart from 'highlight.js/lib/languages/dart'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import powershell from 'highlight.js/lib/languages/powershell'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml' // + HTML/SVG
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import less from 'highlight.js/lib/languages/less'
import markdown from 'highlight.js/lib/languages/markdown'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import ini from 'highlight.js/lib/languages/ini' // + TOML
import makefile from 'highlight.js/lib/languages/makefile'
import nginx from 'highlight.js/lib/languages/nginx'
import diff from 'highlight.js/lib/languages/diff'
import plaintext from 'highlight.js/lib/languages/plaintext'
import lua from 'highlight.js/lib/languages/lua'
import perl from 'highlight.js/lib/languages/perl'
import r from 'highlight.js/lib/languages/r'
import matlab from 'highlight.js/lib/languages/matlab'
import julia from 'highlight.js/lib/languages/julia'
import haskell from 'highlight.js/lib/languages/haskell'
import elixir from 'highlight.js/lib/languages/elixir'
import erlang from 'highlight.js/lib/languages/erlang'
import clojure from 'highlight.js/lib/languages/clojure'
import groovy from 'highlight.js/lib/languages/groovy'
import objectivec from 'highlight.js/lib/languages/objectivec'
import fsharp from 'highlight.js/lib/languages/fsharp'
import vbnet from 'highlight.js/lib/languages/vbnet'
import pgsql from 'highlight.js/lib/languages/pgsql'
import graphql from 'highlight.js/lib/languages/graphql'
import protobuf from 'highlight.js/lib/languages/protobuf'
import latex from 'highlight.js/lib/languages/latex'
import vim from 'highlight.js/lib/languages/vim'
import ocaml from 'highlight.js/lib/languages/ocaml'

// ============================================================================
// Регистрация + алиасы
// ============================================================================

const languages: Record<string, unknown> = {
  javascript,
  typescript,
  python,
  java,
  csharp,
  cpp,
  c,
  go,
  rust,
  php,
  ruby,
  swift,
  kotlin,
  scala,
  dart,
  bash,
  shell,
  powershell,
  sql,
  json,
  yaml,
  xml,
  css,
  scss,
  less,
  markdown,
  dockerfile,
  ini,
  makefile,
  nginx,
  diff,
  plaintext,
  lua,
  perl,
  r,
  matlab,
  julia,
  haskell,
  elixir,
  erlang,
  clojure,
  groovy,
  objectivec,
  fsharp,
  vbnet,
  pgsql,
  graphql,
  protobuf,
  latex,
  vim,
  ocaml,
}

for (const [name, lang] of Object.entries(languages)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hljs.registerLanguage(name, lang as any)
}

// Алиасы популярных имён — чтобы ```js, ```ts, ```sh, ```html и т.д. работали
hljs.registerAliases(['js', 'jsx', 'mjs', 'cjs'], { languageName: 'javascript' })
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['cs'], { languageName: 'csharp' })
hljs.registerAliases(['c++', 'cxx', 'h', 'hpp'], { languageName: 'cpp' })
hljs.registerAliases(['rb'], { languageName: 'ruby' })
hljs.registerAliases(['rs'], { languageName: 'rust' })
hljs.registerAliases(['kt', 'kts'], { languageName: 'kotlin' })
hljs.registerAliases(['sh', 'zsh'], { languageName: 'bash' })
hljs.registerAliases(['ps', 'ps1'], { languageName: 'powershell' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })
hljs.registerAliases(['html', 'htm', 'svg', 'xhtml'], { languageName: 'xml' })
hljs.registerAliases(['md'], { languageName: 'markdown' })
hljs.registerAliases(['docker'], { languageName: 'dockerfile' })
hljs.registerAliases(['toml'], { languageName: 'ini' })
hljs.registerAliases(['mk', 'mak'], { languageName: 'makefile' })
hljs.registerAliases(['text', 'txt'], { languageName: 'plaintext' })
hljs.registerAliases(['pl'], { languageName: 'perl' })
hljs.registerAliases(['postgres', 'postgresql'], { languageName: 'pgsql' })
hljs.registerAliases(['proto'], { languageName: 'protobuf' })
hljs.registerAliases(['tex'], { languageName: 'latex' })
hljs.registerAliases(['objc', 'obj-c'], { languageName: 'objectivec' })
hljs.registerAliases(['fs'], { languageName: 'fsharp' })
hljs.registerAliases(['vb'], { languageName: 'vbnet' })
hljs.registerAliases(['hs'], { languageName: 'haskell' })
hljs.registerAliases(['ex', 'exs'], { languageName: 'elixir' })
hljs.registerAliases(['erl'], { languageName: 'erlang' })
hljs.registerAliases(['clj', 'cljs', 'cljc'], { languageName: 'clojure' })
hljs.registerAliases(['ml'], { languageName: 'ocaml' })

export { hljs }