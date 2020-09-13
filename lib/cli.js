'use strict';

const commander = require('commander');
const checkConfig = require('./checkConfig');
const colorCli = require('./colorCli');
const fileDependencies = require('./fileDependencies');
const FileWatcher = require('./FileWatcher');
const ExecCommand = require('./ExecCommand');

const { program } = commander;
const DESC = `
Auto reload webpack when configuration changes.
Examples:
  $ wc-reload npm start
  $ wc-reload webpack-dev-server --config dev.js
`.trim();

exports.run = () => {
    program
        .name('wc-reload')
        .version('0.0.1')
        .usage('[options] node scripts')
        .description(DESC)
        .allowUnknownOption(true)
        .action(runCommand);

    program.parse(process.argv);
};

async function runCommand() {
    const { args } = commander;

    if (args.length === 0) {
        colorCli.red('ERROR: no command found.');
        process.exit(1);
    }

    let startArg = 0;

    // unrecognized options also included in `args`
    // consider actual command should start without parameters
    // `--allow -b webpack` ==> `webpack`
    for (let i = 0, len = args.length; i < len; i++) {
        if (!/^-{1,2}/.test(args[i])) {
            startArg = i;
            break;
        }
    }

    const command = args.slice(startArg).join(' ');
    const entryFile = await checkConfig(command);
    const cmder = new ExecCommand(command);

    if (!entryFile) {
        cmder.runDirectly();
        return;
    }

    const files = fileDependencies(entryFile);
    const listener = (eventType, filename) => {
        // console.log('INFO:', eventType, filename)
        watcher.add(fileDependencies(entryFile));
        console.clear();
        console.info('INFO:', 'reload webpack config');
        cmder.restart();
    };
    const watcher = new FileWatcher(files, listener);

    console.info('INFO: start watching files.');
    watcher.start();
    cmder.start();
    cmder.onFailed(() => {
        colorCli.red('ERROR: failed to run command');
        process.exit(1);
    });
}
