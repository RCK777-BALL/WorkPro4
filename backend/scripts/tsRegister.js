const { readFileSync } = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  resolveJsonModule: true,
  skipLibCheck: true,
};

// Allow TypeScript files to import modules from the project root using the `src/*` prefix.
const existingNodePath = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
const updatedNodePath = [path.resolve(__dirname, '..'), ...existingNodePath];
process.env.NODE_PATH = Array.from(new Set(updatedNodePath)).join(path.delimiter);
Module._initPaths();

require.extensions['.ts'] = function register(module, filename) {
  const source = readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, { compilerOptions, fileName: filename });
  return module._compile(transpiled.outputText, filename);
};
