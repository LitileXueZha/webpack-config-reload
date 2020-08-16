module.exports = {
    red(str) {
        console.log('\x1b[31m%s\x1b[0m', str);
    },
    yellow(str) {
        console.log('\x1b[33m%s\x1b[0m', str);
    },
};
