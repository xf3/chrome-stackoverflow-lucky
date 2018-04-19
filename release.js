const fs = require('fs');
const archiver = require('archiver');

const archiveName = 'extension.zip';

const archivePath = __dirname + '/' + archiveName;

const output = fs.createWriteStream(archivePath);
const archive = archiver('zip');

output.on('close', () => {
    fs.renameSync(archivePath, __dirname + '/build/' + archiveName);

    console.log('Successfully created build/' + archiveName);
});

archive.pipe(output);

archive.file(__dirname + '/manifest.json', { name: 'manifest.json' });

[
    '_locales',
    'build',
    'html',
    'img',
    'js',
]
    .forEach(path => {
        archive.directory(__dirname + '/' + path, path);
    });

archive.finalize();
