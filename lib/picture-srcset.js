const path = require('node:path')
const fs = require('node:fs')
const process = require('node:process')
const { imageSize } = require('image-size')
const parser = require('posthtml-parser')
//const match = require('posthtml/lib/api').match
const generateAll = require('./inc/rollup-images.js').generateAll;


module.exports = function (options) {
  const cwd = options.cwd ?? process.cwd();
  const imageOptions = options.imageOptions ?? {};

  options ||= {};

  if (imageOptions.size === undefined) {
    imageOptions.size = [320, 640, 1024];
  }

  if (options.format === undefined) {
    options.format = '.webp';
  }

  const getPicture = async (img, src) => {
    if (options.format === 'native') {
      options.format = '.' + img.attrs.src.split('.').pop();
    }

    // If the image is referencing an external url, skip it
    if (img.attrs.src.startsWith('http://') || img.attrs.src.startsWith('https://')) {
      return img;
    }

    // If the image has a skip flag, skip it
    if (img.attrs.skip === true) {
      return img;
    }

    // Loop through the different set sizes and check if an image exists for that size
    const srcset = [];
    const buf = fs.readFileSync(src);
    const dimensions = imageSize(buf);
    let relativeSrc = src.split(cwd + '\\')[1];
    relativeSrc = relativeSrc.replaceAll('\\', '/'); // Normalize path for web usage
    relativeSrc = relativeSrc.replaceAll(' ', '%20');

    img.content = [];

    if (src.includes('.gif')) {
      img.attrs.src = relativeSrc;
      return img;
    }

    if (img.attrs.fullsize === undefined) {
      for (let i = 0; i < imageOptions.size.length; i++) {
        const size = imageOptions.size[i];
        const suffix = '@' + size + 'w';
        const image = relativeSrc.replace(/\.(\w+)$/, suffix + '.webp') + ' ' + size + 'w';
        if (size <= dimensions.width) {
          srcset.push(image);
        }
      }
    }

    srcset.push(relativeSrc.replace(/\.(\w+)$/, '.webp ' + dimensions.width + 'w'));

    img.tag = 'picture';
    delete img.attrs.src;

    if (img.attrs.alt === undefined) {
      img.attrs.alt = '';
    }

    if (img.attrs.nolazy === undefined) {
      if (img.attrs.class === undefined) {
        img.attrs.class = '';
      }

      img.attrs.class += ' lazy';
    } else {
      img.attrs.src = relativeSrc.replace(/\.(\w+)$/, options.format);
    }

    const srcsetTag = {
      tag: 'source',
      attrs: {
        'data-srcset': srcset.join(', '),
        type: 'image/webp',
      },
    };

    let fallbackType = relativeSrc.split('.')[1];
    if (fallbackType === 'jpg') {
      fallbackType = 'jpeg';
    }

    const defaultSrc = {
      tag: 'source',
      attrs: {
        'data-srcset': relativeSrc.replace(/\.(\w+)$/, '.webp'),
        type: 'image/webp',
      },
    };

    if (img.attrs.nolazy !== undefined) {
      defaultSrc.attrs.srcset = defaultSrc.attrs['data-srcset'];
      srcsetTag.attrs.srcset = srcsetTag.attrs['data-srcset'];
    }

    img.content.push([
      srcsetTag,
      defaultSrc,
      {
        tag: 'img',
        attrs: {
          'data-src': relativeSrc,
          skip: true,
          width: dimensions.width,
          height: dimensions.height,
          ...img.attrs,
        },
      },
    ]);

    if (imageOptions.generate === false) {
      img.attrs.src = relativeSrc;
      img.content = [
        {
          tag: 'img',
          attrs: {
            'data-src': relativeSrc,
            skip: true,
            width: dimensions.width,
            height: dimensions.height,
            ...img.attrs,
          },
        },
      ];
    }

    delete img.attrs;
    return img;
  };

  // Ease of use function to generate all the images + sizes
  const generateImages = async function() {
    if (imageOptions.generate) {
      return await generateAll(imageOptions);
    }
  };

  return function (tree) {
    return new Promise(async resolve => {
      console.log('Generating images...');
      await generateImages();

      const promises = [];

      if (!tree.promises) {
        tree.parser = parser;
      }

      tree.match ||= match;

      tree.match({ tag: 'img' }, node => {
        if (node.attrs.skip || node.attrs.src?.includes('.svg')) {
          return node;
        }

        promises.push((async () => {
          const { src } = node.attrs;
          if (src) {
            const imgSrc = path.resolve(cwd, src);
            node = await getPicture(node, imgSrc);
          }
        })());

        return node;
      });

      (async () => {
        await Promise.all(promises);
        resolve(tree);
      })();
    });
  };
}
