const ChildProcess = require('child_process');
const os = require('os');
const util = require('util');

const exec = util.promisify(ChildProcess.exec);

/**
 * find the runtime shell
 * 
 * @returns {string} shell executable path
 */
module.exports = async () => {
    const pid = process.ppid;
    const isWin = os.platform() === 'win32';
    const cmd = isWin
        ? `wmic process get processid,executablepath | findstr ${pid}`
        : `lsof -p ${pid} | awk '$4 == "txt" { print $9 }'`;

    const regClear = new RegExp(`\\s+${pid}\\s+`);
    const { stdout, stderr } = await exec(cmd);

    if (stderr) {
        throw new Error(stderr);
    }

    // clear out processid on windows
    return stdout.replace(regClear, '');
};
