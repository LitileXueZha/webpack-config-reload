const acorn = require('acorn');
const walk = require('acorn-walk');
const fs = require('fs');
const path = require('path');

const PARSE_OPTS = {
    ecmaVersion: 2020,
    sourceType: 'module',
};
const PARSE_EXTS = new Set(['.js', '.node', '.mjs']);

/**
 * find all dependencies in one file
 * 
 * + support es6/import and node/require
 * + dependency from node_modules will be **IGNORED**
 * 
 * @param {string} filePath entrypoint file absolute path
 * @returns {Array<string>} dependency file paths
 */
module.exports = (filePath) => {
    let file = filePath;

    if (!path.isAbsolute(filePath)) {
        // based on process.cwd
        file = path.resolve(process.cwd(), file);
    }
    // eslint-disable-next-line no-use-before-define
    const fdep = new FileDependencies(file);

    fdep.parseRecursive();
    const deps = fdep.getAllDependencies();

    return [...new Set(deps)];
};

class FileDependencies {
    /**
     * @param {string} file absolute path
     */
    constructor(file) {
        this._id = '';
        this.file = path.basename(file);
        this.dir = path.dirname(file);
        this.absolutePath = file;
        this.dependencies = [];
        this._recursive = false;
    }

    /**
     * parse file content
     */
    parse() {
        const { absolutePath } = this;
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const deps = new Set();
        let ast;
        const ext = path.extname(absolutePath);

        // abort parse non javascript
        if (!PARSE_EXTS.has(ext)) {
            return;
        }
        try {
            ast = acorn.parse(content, PARSE_OPTS);
        } catch (e) {
            console.error(
                `AcornParseError: ${e.message}\n`
                + `    > ${absolutePath}`,
            );
            process.exit(1);
        }

        // see node types in estree
        // https://github.com/estree/estree
        walk.simple(ast, {
            ImportDeclaration(node) {
                walk.simple(node, {
                    Literal(cNode) {
                        deps.add(cNode.value);
                    },
                });
            },
            CallExpression(node) {
                // handle require('xxx')
                if (node.callee.name === 'require') {
                    walk.simple(node, {
                        Literal(cNode) {
                            deps.add(cNode.value);
                        },
                    });
                }
            },
        });

        this.dependencies = [...deps];
        this.ignore();
    }

    /**
     * parse recursively
     * 
     * find all of dependencies recursively, if can be required in file
     */
    parseRecursive() {
        this._recursive = true;
        this.parse();

        const { dependencies, dir } = this;
        const deps = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const dep of dependencies) {
            try {
                const resolvedPath = require.resolve(path.resolve(dir, dep));
                const fdep = new FileDependencies(resolvedPath);

                // eslint-disable-next-line no-underscore-dangle
                fdep._id = dep;
                fdep.parseRecursive();
                deps.push(fdep);
            } catch (e) { /* skip */ }
        }

        this.dependencies = deps;
    }

    /**
     * delete dependency from node_modules,
     * it should start with './' or '../' or '/'
     * 
     * @see https://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders
     */
    ignore() {
        const reg = /^\.{0,2}\//;
        const deps = this.dependencies.filter((dep) => reg.test(dep));

        this.dependencies = deps;
    }

    /**
     * get all dependent file absolute paths
     * 
     * @return {Array<string>} file paths
     */
    getAllDependencies() {
        // if parsed recursively
        if (this._recursive) {
            let paths = [this.absolutePath];

            // eslint-disable-next-line no-restricted-syntax
            for (const dep of this.dependencies) {
                const dPaths = dep.getAllDependencies();

                paths = paths.concat(dPaths);
            }
            // remove duplicate item

            return paths;
        }

        return this.dependencies;
    }
}

function AcornParseError(message) {
    this.name = 'AcornParseError';
    this.message = message;
    Error.captureStackTrace(this, AcornParseError);
}
