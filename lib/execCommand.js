const { execSync, spawn } = require('child_process');
const EventEmitter = require('events');
const os = require('os');

/**
 * exec the command
 * 
 * after initialize, use `.start()` to execute
 */
class ExecCommand extends EventEmitter {
    /**
     * @param {string} cmd the command
     */
    constructor(cmd) {
        super();
        const cmdArgv = cmd.split(' ');
        const isWin = os.platform() === 'win32';

        this.cmd = cmd;
        this._command = cmdArgv[0] + (isWin ? '.cmd' : '');
        this._args = cmdArgv.slice(1);
        /** the child process */
        this._cp = null;
        this._win = isWin;
        this.failed = false;
        /** events will be fired if failed */
        this._failEvents = null;
    }

    /**
     * with addition output
     */
    runDirectly() {
        console.info('INFO: run command directly.\n');
        console.info('$', this.cmd);
        this.start();
        this._cp.on('error', (e) => {
            // console.error(e);
            console.info('Failed to run command. <%s>', e.message);
        });
    }

    start() {
        this._cp = spawn(this._command, this._args, {
            stdio: 'inherit',
            cwd: process.cwd(),
            windowsHide: true,
        });
    }

    _close() {
        this._cp.off('exit', this._failEvents);
        if (!this._win) {
            this._cp.kill(0);
            return;
        }

        // on Windows
        execSync(`taskkill /T /F /PID ${this._cp.pid}`);
        this._cp = null;
    }

    restart() {
        if (this._cp) {
            this._close();
        }
        this.failed = false;
        this.start();
        // rebind for 'onFailed'
        this._cp.on('exit', this._failEvents);
    }

    /**
     * failed to exec command
     * 
     * @param {function} cb callback
     */
    onFailed(cb) {
        if (!this._cp) return;

        this._failEvents = (code) => {
            if (code !== 0) {
                this.failed = true;
                cb();
            }
        };
        this._cp.on('exit', this._failEvents);
    }
}

module.exports = ExecCommand;
