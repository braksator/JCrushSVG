[![npm](https://img.shields.io/npm/dt/jcrushsvg.svg)](#)

JCrush SVG
==========

Deduplicates and compresses an SVG file using Javascript.

> It creates Javascript files that provide the SVG code.

Uses [JCrush](https://www.npmjs.com/package/jcrush), see that project for more info (and an in-built plugin for
compressing Javascript files).  You should merge, minify, and reprocess the main output file produced with
`JCrush SVG` using `JCrush` for further optimisation.

If you'd like to optimise your HTML output (more than minifiers), see also [HyperCrush](https://www.npmjs.com/package/hypercrush).


## Installation

This is a Node.JS module available from the Node Package Manager (NPM).

https://www.npmjs.com/package/jcrushsvg

Here's the command to download and install from NPM:

`npm install jcrushsvg -S`

or with Yarn:

`yarn add jcrushsvg`

## Setup Instructions

1. **Place all relevant SVG files in one directory:**
   - Example: `/src/svg`

2. **Choose a processing method:**
   - Decide whether to use the terminal, a custom script, or Gulp to process the directory with this module.
   - Refer to the `Usage` section below for further instructions.

3. **Modify your Javascript code:**
   - Instead of using the SVG images in an `<img>` tag, call a function with the file's basename (slug).
   - The usage differs based on the `bundle` option:
     - **If `bundle` is `false` (default):**
       - The functionality is asynchronous. To load the SVG code into a DOM element, use:
         ```js
         svg('main-logo', document.getElementById("logo"))
         ```
       - **Note:** This will replace whatever is already inside the `#logo` element, so plan your code accordingly.
     - **If `bundle` is `true`:**
       - The SVG code is stored in the main JS file. The function will return the SVG code like so:
         ```js
         var svgCode = svg('main-logo')
         ```

4. **Include the main Javascript `outFile` in your HTML:**
   - Or, use some automation to merge it into your scripts.
   - **Note:** There's no need to include each individual image's corresponding JS file.

5. **Merge/minify/compress the main `outFile`:**
   - You should merge, minify, or [compress](https://www.npmjs.com/package/jcrush) the main `outFile` as you would with your own code.
   - **Note:** This module leaves that file in a human-readable state.
## Usage


### From the Terminal

It may be sufficient to just run:

`node node_modules/jcrushsvg --inDir="/src/svg" --outDir="/svg" --outFile="svg.js"`

Once and you're done.

### Write a Custom Script

Create a file `svgTask.js` with the contents:

```javascript
import jcrushSVG from 'jcrushsvg';
let opts = { inDir: '/src/svg', outDir: '/svg', outFile: 'svg.js', processFile:(filePath, svgContent) => {
  // Check there is no version or it's v1.1... that's the cool one.
  if (svgContent.includes('version=') && !svgContent.includes('version="1.1"')) {
    throw new Error(`SVG in ${filePath} does not have version="1.1". Ensure you set "SVG Profile: SVG 1.1" in save-as dialogue of Adobe Illustrator.`);
  }
  // Check for style tags, not on my watch.
  if (svgContent.match(/<style[^>]*>[\s\S]*?<\/style>/g)) {
    throw new Error(`SVG in ${filePath} contains <style> tags, which are not allowed. Ensure you set "CSS Properties: Presentation Attributes" in save-as dialogue of Adobe Illustrator.`);
  }
  // Check if it uses CSS for colors - get outta here with that!
  if (/style\s*=\s*["'][^"']*color\s*:/i.test(svgContent)) {
    throw new Error(`SVG in ${filePath} uses CSS for colors, which is not allowed. Ensure you set "CSS Properties: Presentation Attributes" in save-as dialogue of Adobe Illustrator.`);
  }
  return svgContent;
}};
jcrushSVG({opts});
```

Then run this command:

`node svgTask`

Whenever you've added a new SVG file to the directory.

### With Gulp

In your `gulpfile.mjs`:

#### Step 1: Import **JCrush SVG**

```javascript
import jcrushSVG from 'jcrushsvg';
```

#### Step 2: Create a Gulp Task


```javascript
gulp.task('svg', (done) => {
  let opts = { inDir: '/src/svg', outDir: '/svg', outFile: 'svg.js' };
  jcrushSVG({opts});
  done(); // Signal completion
});
```

#### Step 3: (Optional) Run **JCrush SVG** Before Minification

To run **JCrush SVG** before your minification tasks, add JCrush SVG in series before other tasks, such as in this example:

```javascript
gulp.task('default', gulp.series(
  'svg' // Run it before your other stuff.  Probably.
  gulp.parallel('minify-svg', 'minify-js', 'minify-html'),
));
```

Alternatively don't include it in your default gulp task.  Run the task manually, e.g. `gulp svg`.


---

## Parameters

### `opts` (Object, optional)

A configuration object with the following properties:

- `inDir` (String, default: `''`):
  - The folder where the SVG files are.  You MUST put this in.

- `outDir` (String, default: `''`):
  - The folder where the JS files will be outputted.  Will assume same as `inDir` if not supplied, but that isn't ideal.

- `outFile` (String, default: `'svg.js'`):
  - The name of the main JS file to create that will have the function to provide SVG code.

- `funcName` (String, default: `svg`):
  - The name of the function to create that will provide SVG code.

- `bundle` (Boolean, default: `false`):
  - If `true`, will load all the SVG code into the main `outFile` instead of separate files.  The SVGs are preloade
  and the SVG function will return SVG code as a string.
  - If `false`, will load individual JS files on an as-needed basis, reducing loading overhead. The SVG function accepts a DOM element
  and will replace its contents with the SVG once it is loaded.

- `appendExt` (Boolean, default: `true`):
  - If `true`, will create the individual js files with ".svg.js" extensions.
  - If `false`, will create the individual js files with just ".js" extensions.

- `processSVG` (Function, default: `null`):
  A function to run custom validation/preprocessing on each SVG tag.  2 params: filePath, svgContent. Throw error to halt
   processing. Return the changed SVG code.

- `processJS` (Function, default: `null`):
  A function to run custom processing on JS output. 2 params: filePath, jsContent. Throw error to halt processing. Return the
  changed JS code.

- `prog` (Boolean, default: `true`):
  - If `true`, will output console messages when making progress.
  - If `false`, will work silently.

- `fin` (Boolean, default: `true`):
  - If `true`, will output a final console message about bytes saved or failure.
  - If `false`, will remain silent.

Additionally; `JCrush SVG` can accept the options of the underlying [JCrush](https://www.npmjs.com/package/jcrush)
package, however if they're not listed above then changing them may break this module's functionality.  Tread carefully.

---

## Unnecessary Reprocessing

To prevent unnecessarily reprocessing files consider using [gulp-changed](https://www.npmjs.com/package/gulp-changed),
[gulp-cached](https://www.npmjs.com/package/gulp-cached), or [gulp-newer](https://www.npmjs.com/package/gulp-newer).

---

## Contributing

https://github.com/braksator/jcrushsvg

In lieu of a formal style guide, take care to maintain the existing coding
style.
