const glob = require('glob');
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location == null) return;
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  }
};

const commonOptions = {
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  logLevel: 'warning',
  plugins: [esbuildProblemMatcherPlugin]
};

async function buildClient() {
  const buildOptions = {
    entryPoints: ['client/src/extension.ts'],
    bundle: true,
    outfile: 'dist/client/out/extension.js',
    external: ['vscode']
  }
  return watch
    ? esbuild.context({...commonOptions, ...buildOptions})
    : esbuild.build({...commonOptions, ...buildOptions});
}

async function buildServer() {
  const buildOptions = {
    entryPoints: ['server/src/server.ts'],
    bundle: true,
    outfile: 'dist/server/out/server.js',
    external: ['vscode']
  }
  return watch
    ? esbuild.context({...commonOptions, ...buildOptions})
    : esbuild.build({...commonOptions, ...buildOptions});
}

async function buildTests() {
  const testFiles = glob.sync('client/src/test/**/*.ts');
  if (testFiles.length === 0) {
    console.warn('No tests found.')
    return;
  } else {
    console.info('Building tests...')
    console.info(testFiles);
  }

  const buildOptions = {
    entryPoints: testFiles,
    bundle: false,
    outdir: 'dist/client/out/test'
  }
  return watch
    ? esbuild.context({...commonOptions, ...buildOptions})
    : esbuild.build({...commonOptions, ...buildOptions});
}

async function main() {
  const buildTasks = [
    buildClient(),
    buildServer(),
    buildTests()
  ]
  const buildContexts = await Promise.all(buildTasks);
  
  if (watch) {
    for (const ctx of buildContexts) {
      if (ctx && typeof ctx.watch === 'function') {
        await ctx.watch();
      }
    }
  } else {
    for (const ctx of buildContexts) {
      if (ctx && typeof ctx.watch === 'function') {
        await ctx.rebuild();
        await ctx.dispose();
      }
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
