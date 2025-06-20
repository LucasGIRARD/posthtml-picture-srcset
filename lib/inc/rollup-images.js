//import { Queue as PQ } from 'promise-queue';
const fs = require('node:fs');
const { imageSize } = require('image-size')
const globby = require('globby');
const sharp = require('sharp');
const PQ = require('promise-queue');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }
var globby__default = /*#__PURE__*/_interopDefaultLegacy(globby);

// Converts a value to an array if it isn't already
const arrayify = a => (Array.isArray(a) ? [...a] : [a]);

// Generates the crops for this image and saves it to disk
const generateCrops = async function ({ image, outputs, imagePathPre, quality, forceUpscale, addGeneratedFile }) {
  await sharp(image).webp({ lossless: false }).toFile(image.replace(/(\..*)/, '.webp'));

  if (quality || forceUpscale) {
    const todo = 'todo';
    console.log(todo);
  }

  // Get only the sizes that we need to generate
  const uniqueWidths = [];
  for (const output of outputs) {
    if (!uniqueWidths.includes(output.scaleWidth)) {
      uniqueWidths.push(output.scaleWidth);
    }
  }

  return Promise.allSettled(uniqueWidths.map(scaleWidth => {
    const outputWebp = image.replace(/(\..*)/, '.webp');
    let imageDimensions = { width: 0 };
    try {
      const buf = fs.readFileSync(outputWebp);
      imageDimensions = imageSize(buf);
    } catch {
      // File may not exist yet if sharp hasn't finished writing
    }

    // If the target width is larger than the original width and forceUpscale is not set, skip
    if (scaleWidth > imageDimensions.width) {
      return Promise.resolve();
    }

    // Save all the output images
    return Promise.all(outputs.filter(d => d.scaleWidth === scaleWidth).map(d => d.format).map(format => {
      addGeneratedFile(image, scaleWidth, format);
      return sharp(outputWebp).resize(scaleWidth).toFile(`${imagePathPre}@${scaleWidth}w.${format}`);
    }));
  }));
};

// Processes this image, determining which crops and sizes we need to generate
const processImage = ({ queue, size, skipExisting, outputFormat, quality, forceUpscale, addGeneratedFile }) => (image, index, imageArray) => {
  const sizes = arrayify(size);
  const imagePathSplit = image.split('.');
  const imagePathPre = imagePathSplit.slice(0, -1).join('.');
  const imageFormat = imagePathSplit.at(-1);
  // Process image format options
  const formats = [...new Set(arrayify(outputFormat).map(format => (format === 'match' ? imageFormat : format)).map(format => (format === 'jpeg' ? 'jpg' : format)))];
  // An array of objects that contains sizes and formats of all our outputs
  let outputs = [];
  for (const scaleWidth of sizes) {
    for (const format of formats) {
      outputs.push({ format, scaleWidth });
    }
  }

  if (image.includes('png')) {
    outputs = outputs.filter(item => item.format !== 'jpg');
  }

  if (image.includes('jpg')) {
    outputs = outputs.filter(item => item.format !== 'png');
  }

  // If skipExisting is set
  if (skipExisting) {
    outputs = outputs.filter(({ format, scaleWidth }) => {
      const cropExists = fs.existsSync(`${imagePathPre}@${scaleWidth}w.${format}`);
      if (cropExists) {
        addGeneratedFile(image, scaleWidth, format);
      }

      return !cropExists;
    });
    // If images already exist, we can skip the rest of this process
    if (outputs.length === 0) {
      if (index === imageArray.length - 1) {
        queue.add(() => Promise.resolve());
      }

      return;
    }
  }

  queue.add(() => generateCrops({
    image, outputs, imagePathPre, quality, forceUpscale, addGeneratedFile,
  }));
};

// Generates all images based on the given options
const generateAll = async function (options) {

  const {
    hook = 'renderStart',
    quality = 65,
    dir = null,
    src = null,
    size = [1400, 1024, 640, 320],
    inputFormat = ['jpg', 'jpeg', 'png'],
    outputFormat = ['jpg'],
    forceUpscale = false,
    skipExisting = true,
    maxParallel = 4,
    outputManifest = null,
  } = options;

  if (hook || src) {
    const todo = 'todo';
    console.log(todo);
  }

  if (!dir || dir.length === 0 || !size || !inputFormat || inputFormat.length === 0 || !outputFormat || outputFormat.length === 0) {
    return Promise.resolve();
  }

  const inputFormats = arrayify(inputFormat);
  const dirGlob = arrayify(dir).length > 1 ? `{${arrayify(dir).join(',')}}` : arrayify(dir)[0];
  const generatedFiles = [];
  function addGeneratedFile(image, width, format) {
    generatedFiles.push({ image, width, format });
  }

  return new Promise(resolve => {
    const q = new PQ(maxParallel, Infinity, {
      onEmpty() {
        if (outputManifest) {
          fs.writeFileSync(outputManifest, JSON.stringify(generatedFiles));
        }

        resolve();
      },
    });

    (async function () {
      const pattern = dirGlob+'/**/*.{'+inputFormats.join(',')+'}';
      const images = await globby__default["default"].globby(pattern);
      if (images.length === 0) {
        q.add(() => Promise.resolve());
      }

      for (const image of images) {
        if (!image.includes('@') && !image.includes('#')) {
          const optionProc = {
            queue: q, size, skipExisting, outputFormat, quality, forceUpscale, addGeneratedFile,
          };
          processImage(optionProc)(image, images.indexOf(image), images);
        }
      }
    })();
  });
};

module.exports = {
  generateAll,
  arrayify,
  generateCrops,
  processImage,
};
