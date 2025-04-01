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
  opts = { ...{ inDir: '', outDir: '', outFile: 'svg.js', bundle: 0, processSVG: null, processJS: null, prog: 1, tpl: 1, break: [],
    tplEsc: 0, funcName: 'svg', wrap: 'custom', customPre: joinString, customPost: ',', resVars: [], let: 1, maxLen: 120 }, ...opts };
  if (opts.checkNew && !fs.existsSync(opts.outFile) || !fs.readdirSync(opts.inDir).some(f => fs.statSync(path.join(opts.inDir, f)).mtime > fs.statSync(opts.outFile).mtime)) {
    console.log(`JCrush SVG checked ${opts.inDir} and determined ${opts.outFile} is already up-to-date. ✔️`);
    return;
  }
  opts.break.push(breakString);
  opts.resVars.push('k');
  opts.resVars.push('el');
  if (!opts.outDir) opts.outDir = opts.inDir;
  try {
    fs.readdirSync(opts.inDir).filter(file => path.extname(file) == '.svg').forEach(file => {
      opts.prog && console.log("Loading SVG file", file);
      let filePath = path.join(opts.inDir, file),
        svgTagMatch = fs.readFileSync(filePath, 'utf8').match(/<svg[^>]*>[\s\S]*<\/svg>/),
        svgContent = svgTagMatch ? svgTagMatch[0] : null;
      if (opts.processSVG) svgContent = opts.processSVG(filePath, svgContent);
      svgItems[path.basename(file, '.svg')] = svgContent
        .replace(/\s+version="[^"]*"/, '') // Remove version attr
        .replace(/\s*baseProfile="[^"]*"/i, '')  // Remove baseProfile attr
        .replace(/\s+id="[^"]*"/, '') // Remove id attr
        .replace(/\s*xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"\s*|\s*x="0px"\s*|\s*y="0px"*/g, '') // Remove xmlns attr
        .replace(/\s*xml:space="preserve"*/g, '') // Remove xml:space attr
        .replace(/\s*enable-background="[^"]*"/g, '') // Remove enable-background attr
        .replace(/\b0\./g, '.') // Remove leading zero for decimal numbers
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .replace(/\s*class="[^"]*"*/g, '') // Remove class attr
        .replace(/\s+>/g, '>') // Remove space before >
        .replace(/(<[a-zA-Z][^>]*>)\s+/g, '$1') // Remove whitespace after opening tags
        .replace(/\s+(<\/[a-zA-Z]+>)/g, '$1') // Remove whitespace before closing tags
        .replace(/(\w+)="([^"\s]+)(?="(?!\/>))"/g, (m, k, v) => `${k}=${v}`) // Remove " around attrs where possible (but not if followed by self-close)
        .replace(/"\s+(?=\w+=)/g, '"') // Remove spaces **after** a closing quote before another attribute
        .replace(/"\s+(?=\w+=)(?!\/)/g, '"') // Remove spaces **after** a closing quote before another attribute (but not if followed by self-close)
        .replace(/(?<=\w=")\s+/g, '') // Remove spaces **after** an opening quote
        .replace(/\s+/g, ' ').trim() // Remove redundant whitespace
        .replace(/\s*(["']?)\s*\/>/g, '$1/>'); // Remove extra space at end of self-closing tags
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
      funcCode = `k => {
  ${enc[0]}
  return {
    ${Object.entries(svgItems).map(([key, value]) => `${key}: ${value}`).join(",\n    ")}
  }[k];
}`;
    }
    else {
      let ext = opts.appendExt ? '.svg.js' : '.js';
      for (let key in svgItems) fs.writeFileSync(opts.outDir + '/' + key + ext, svgItems[key]);
      funcCode = `(k, el) => {
  ${enc[0]}
  return fetch(` + opts.outDir + '/${k}' + ext + `).then(r => r.text()).then(c => el.innerHTML = eval(c))
  }`;
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