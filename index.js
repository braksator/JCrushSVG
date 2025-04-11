#!/usr/bin/env node
'use strict';

/**
 * @file
 * JCrush SVG - A Javascript based SVG deduplicator & compressor.
 */

var fs = require('fs');
var path = require('path');
var jcrush = require('jcrush');

let jcrushsvg = opts => {
  let svgItems = {}, joinString = '★', breakString = '•';
  opts = { ...{ inDir: '', outDir: '', outFile: 'svg.js', bundle: 0, processSVG: null, processJS: null, prog: 1, tpl: 1, break: [], param: 0,
    tplEsc: 0, funcName: 'svg', wrap: 'custom', customPre: joinString, customPost: ' ', resVars: [], let: 1, maxLen: 40 }, ...opts };
  if (opts.checkNew && fs.existsSync(opts.outFile) && !fs.readdirSync(opts.inDir).some(f => fs.statSync(path.join(opts.inDir, f)).mtime > fs.statSync(opts.outFile).mtime)) {
    console.log(`JCrush SVG checked ${opts.inDir} and determined ${opts.outFile} is already up-to-date. ✔️`);
    return;
  }
  opts.break.push(breakString);
  opts.resVars.push('k');
  if (!opts.bundle) {
    opts.resVars.push('el');
    opts.resVars.push('r');
    opts.resVars.push('c');
  }
  if (opts.param) opts.let = 0;
  if (!opts.outDir) opts.outDir = opts.inDir;
  try {
    fs.readdirSync(opts.inDir).filter(file => path.extname(file) == '.svg').forEach(file => {
      opts.prog && console.log("Loading SVG file", file);
      let filePath = path.join(opts.inDir, file),
        svgTagMatch = fs.readFileSync(filePath, 'utf8').match(/<svg[^>]*>[\s\S]*<\/svg>/),
        svgContent = svgTagMatch ? svgTagMatch[0] : null;
      if (opts.processSVG) svgContent = opts.processSVG(filePath, svgContent);
      svgItems[path.basename(file, '.svg')] = svgContent
        // Whitespace
        .replace(/\s+/g, ' ').trim() // Remove redundant whitespace
        // Strip attrs
        .replace(/\s*version="[^"]*"/gi, '') // Remove version attr
        .replace(/\s*baseProfile="[^"]*"/gi, '')  // Remove baseProfile attr
        .replace(/\s*id="[^"]*"/gi, '') // Remove id attr
        .replace(/\s*xmlns(:\w+)?="[^"]*"/gi, '') // Remove any xmlns attributes
        .replace(/\s*xml:space="preserve"/gi, '') // Remove xml:space attr
        .replace(/\s*enable-background="[^"]*"/gi, '') // Remove enable-background attr
        // Crush
        .replace(/\s*\/>/g, ' />') // Add a space before the end of self-closing tags (will be removed later)
        .replace(/(<\w+[^>]*\b\w+=['"]?)0\.(\d)/g, '$1.$2') // Remove leading zero for decimals in attribute values inside tags
        .replace(/>\s+</g, '><') // Remove spaces between tags - Gotcha: Can't rely on whitespace between tags for styling
        .replace(/(<[a-zA-Z][^>]*>)\s+/g, '$1') // Remove whitespace after opening tags
        .replace(/\s+(<\/[a-zA-Z]+>)/g, '$1') // Remove whitespace before closing tags
        .replace(/(\w+)="([^"\s]+)(?="(?!\/>))"/g, (m, k, v) => `${k}=${v}`) // Remove " around attrs where possible (but not if followed by self-close)
        .replace(/"\s+(?=\s*[\w-]+=|\s*\/?>)/g, '"') // Remove spaces **after** a closing quote (but not if followed by self-close)
        .replace(/(?<=\w=")\s+/g, '') // Remove spaces **after** an opening quote
        .replace(/\s*(["'])\s*\/>/g, '$1/>') // Remove space only between quote and />
        .replace(/(\S)\s*\/>/g, '$1 />') // Ensure space before /> if no quote
        .replace(/(?<=<[^>]+)\s+(?=>)/g, ''); // Remove space before > in tags
    });
    if (!Object.keys(svgItems).length) {
      throw new Error(`Did not find any SVG files in ${opts.inDir} folder.`);
    }
    let funcCode,
      keys = Object.keys(svgItems),
      enc = jcrush.code(Object.values(svgItems).join(breakString), opts).split(joinString);
    enc[1].split(breakString).forEach((v, k) => {
      svgItems[keys[k]] = v;
    });
    if (opts.bundle) {
      funcCode = (opts.param ? '(k,' + enc[0] + ')' : 'k') + ` => {${opts.param ? '' : "\n  " + enc[0]}`
(opts.param ? '' : "\n  return {") + `
    ${Object.entries(svgItems).map(([key, value]) => `${key}: \`${value}\``).join(",\n    ")}
  }[k]` + (opts.param ? ';' : ";\n}");
    }
    else {
      let ext = opts.appendExt ? '.svg.js' : '.js';
      for (let key in svgItems) fs.writeFileSync(opts.outDir + '/' + key + ext, svgItems[key]);
      funcCode = (opts.param ? '(k,el,' + enc[0] + ')' : '(k, el)') + ` => ${opts.param ? '' : "{\n  " + enc[0]}` +
      `${opts.param ? '' : "\n  return "}fetch(` + opts.outDir + '/${k}' + ext + `).then(r => r.text()).then(c => el.innerHTML = eval(c))` +
      (opts.param ? ';' : "\n}");
    }
    let jsContent = `// This file is generated automatically. Do not modify.
// It contains SVG code for use in the application.
// Generated from SVG files in the ${opts.inDir} folder.
let ${opts.funcName} = ${funcCode}`;
    if (opts.processJS) jsContent = opts.processJS(opts.outFile, jsContent);
    fs.writeFileSync(opts.outFile, jsContent);
    opts.prog && console.log('Main SVG JS file created: ' + opts.outFile);
  }
  catch (err) {
    console.error('🛑', err.message);
    process.exit(1);
  }
};

module.exports = jcrushsvg;


// CLI Usage
if (require.main === module) {
  let args = process.argv.slice(2), opts = {};
  args.forEach((arg, index) => {
    let key = arg.slice(2), value = args[index + 1];
    if (value === '1' || value === '0') opts[key] = value === '1';
    else if (value && !value.startsWith('--')) opts[key] = value;
    else opts[key] = true;
  });
  if (args.length < 2) {
    console.log('Usage: jcrushsvg --inDir="/src/svg" --outDir="/svg" --outFile="svg.js"');
    console.log("See README file for full list of arguments.");
    process.exit(1);
  }
  jcrushsvg(opts);
}