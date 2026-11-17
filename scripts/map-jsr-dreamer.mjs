/**
 * Bun preload / Node --import entry.
 * Deno import maps rewrite JSX and imports to jsr:/npm: URLs. Bun and Node
 * cannot load those schemes, so map them to the npm packages already installed
 * (jsr:@scope/name -> @jsr/scope__name, npm:pkg@version -> pkg).
 */
import { mapSpecifier, rewriteSource } from "./map-jsr-dreamer.hooks.mjs";

/** Bun.Transpiler omits automatic JSX runtime imports; put them back. */
function withJsxImports(code) {
  const found = new Map();
  for (const m of code.matchAll(/\b((?:jsxDEV|jsxs|jsx|Fragment)_([a-z0-9]+))\b/g)) {
    const ident = m[1];
    const base = ident.startsWith("jsxDEV")
      ? "jsxDEV"
      : ident.startsWith("jsxs")
      ? "jsxs"
      : ident.startsWith("Fragment")
      ? "Fragment"
      : "jsx";
    found.set(ident, base);
  }
  if (found.size === 0) return code;
  const bindings = [...found].map(([ident, exp]) => `${exp} as ${ident}`).join(", ");
  return `import { ${bindings} } from "@dreamer/view/jsx-runtime";\n${code}`;
}

if (globalThis.Bun) {
  globalThis.Bun.plugin({
    name: "map-jsr-dreamer",
    setup(build) {
      build.onResolve({ filter: /^(?:jsr|npm):/ }, (args) => {
        const mapped = mapSpecifier(args.path);
        if (!mapped) return;
        const parent = args.resolveDir ||
          (args.importer
            ? args.importer.replace(/[/\\][^/\\]+$/, "")
            : process.cwd());
        return { path: globalThis.Bun.resolveSync(mapped, parent) };
      });

      build.onLoad({ filter: /\.[jt]sx$/ }, async (args) => {
        const text = rewriteSource(await Bun.file(args.path).text());
        const transpiler = new Bun.Transpiler({
          loader: args.path.endsWith(".jsx") ? "jsx" : "tsx",
          tsconfig: {
            compilerOptions: { jsx: "react-jsx", jsxImportSource: "@dreamer/view" },
          },
        });
        const contents = withJsxImports(rewriteSource(await transpiler.transform(text)));
        return { contents, loader: "js" };
      });
    },
  });
} else {
  const { register } = await import("node:module");
  register(new URL("./map-jsr-dreamer.hooks.mjs", import.meta.url));
}
