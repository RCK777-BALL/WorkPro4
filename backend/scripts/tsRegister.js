const { readFileSync } = require('fs');
const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  resolveJsonModule: true,
  skipLibCheck: true,
};

require.extensions['.ts'] = function register(module, filename) {
  const source = readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, { compilerOptions, fileName: filename });
  return module._compile(transpiled.outputText, filename);
};
