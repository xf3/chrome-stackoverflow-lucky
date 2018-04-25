/* global __dirname */
console.log('RELEASE');
const fs = require('fs');
const fse = require('fs-extra');
const wrench = require('wrench');
const archiver = require('archiver');

const archiveDir = __dirname + '/build';

const isUnpacked = process.env.NODE_ENV === 'development';

const forRelease = {
    files: [
        'manifest.json',
    ],
    directories: [
        '_locales',
        'html',
        'img',
    ]
};

forRelease.files.forEach(file => {
    if (fs.existsSync(archiveDir + '/' + file)) {
        fse.removeSync(archiveDir + '/' + file);
    }

    fse.copySync(__dirname + '/' + file, archiveDir + '/' + file);
});

forRelease.directories.forEach(dir => {
    if (fs.existsSync(archiveDir + '/' + dir)) {
        fse.removeSync(archiveDir + '/' + dir);
    }

    wrench.copyDirSyncRecursive(__dirname + '/' + dir, archiveDir + '/' + dir);
});

if (!isUnpacked) {
    const archiveName = 'extension.zip';
    const archivePath = archiveDir + '/' + archiveName;

    const output = fs.createWriteStream(archivePath);

    output.on('close', () => {
        console.log('Successfully created build/' + archiveName);
    });

    const archive = archiver('zip');

    archive.pipe(output);

    forRelease.files.forEach(file => {
        archive.file(archiveDir + '/' + file, {
            name: file
        });
    });

    forRelease.directories.push('assets');

    forRelease.directories.forEach(dir => {
        archive.directory(archiveDir + '/' + dir, dir);
    });

    archive.finalize();
} else {
    console.log('Successfully copied to build/');
}
