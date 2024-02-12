import { parseArgs } from '@pkgjs/parseargs';
import path_ from 'path';
import fs_ from 'fs';
import JSON5 from 'json5';
import Vorpal from 'vorpal';
import { spawn } from 'child_process';
import { LineByLineStdoutLogger } from './LineByLineStdoutLogger.js';
import stringTemplate from 'string-template';
import stringArgv from 'string-argv';

const vorpal = Vorpal();

const argsSpec = {
    allowPositionals: true,
    options: {
        lines: {
            type: 'string',
            short: 'n'
        }
    }
};

const altcols = ['34','35','36'];
let i = 0;
let lastName = null;
const log = (name, isErr, line) => {
    if ( lastName !== name ) {
        i = (i + 1) % altcols.length;
        lastName = name;
    }

    let txt = `\x1B[${altcols[i]};1m[${name}:`;
    txt += isErr
        ? `\x1B[31;1merr\x1B[${altcols[i]}m`
        : `\x1B[32;1mout\x1B[${altcols[i]}m`;
    txt += ']\x1B[0m';
    txt += ' ' + line;

    vorpal.log(txt);
};

class InstanceManager {
    constructor () {
        this.instances = [];
        this.isEmptyPromise = new Promise((rslv) => {
            this.isEmptyResolve = rslv;
        });
    }
    register(cp, meta) {
        const instance = { cp, ...meta };
        this.instances.push(instance);
        const out = new LineByLineStdoutLogger(line => {
            log(meta.name, false, line);
        });
        out.attach(cp.stdout);
        const err = new LineByLineStdoutLogger(line => {
            log(meta.name, true, line);
        });
        err.attach(cp.stderr)
        cp.on('exit', () => {
            if ( instance.restarting ) return;

            instance.stopped = true;
            this.onInstanceStopped(instance);
        })
    }
    onInstanceStopped (instance) {
        let someInstancesRunning = false;
        for ( const ins of this.instances ) {
            if ( ! ins.stopped ) {
                someInstancesRunning = true;
                break;
            }
        }

        vorpal.log(`[${instance.name}] STOPPED`);

        if ( ! someInstancesRunning ) {
            this.isEmptyResolve();
        }
    }
    exitall () {
        for ( const ins of this.instances ) {
            ins.cp.kill();
        }
    }
    async waitUntilEmpty () {
        return this.isEmptyPromise;
    }
}

const main = async () => {
    const args = process.argv.slice(2);

    // prefix for log messages that occur before the advanced logging
    // has been initialized.
    const INIT_MARKER = ' \x1B[33;1m***\x1B[0m ';

    const { values, positionals } = parseArgs({
        ...argsSpec,
        args
    });

    let [ inputFilePathRel, varsFilePathRel ] = positionals;

    if ( inputFilePathRel === undefined || inputFilePathRel.trim() === '--' ) {
        inputFilePathRel = 'run.json5';
    }
    
    if ( varsFilePathRel === undefined || varsFilePathRel.trim() === '--' ) {
        varsFilePathRel = 'local.json5';
    }
    
    const inputFilePathAbs = path_.resolve(inputFilePathRel);
    const inputFileBuffer = fs_.readFileSync(inputFilePathAbs);
    const inputFileData = JSON5.parse(inputFileBuffer);

    let localVars = {};
    const varsFilePathAbs = path_.resolve(varsFilePathRel);
    if ( fs_.existsSync(varsFilePathAbs) ) {
        console.log(INIT_MARKER + `loading local vars from ${varsFilePathRel}`);
        const localVarsBuffer = fs_.readFileSync(varsFilePathAbs);
        localVars = JSON5.parse(localVarsBuffer);
    }


    const instancemgr = new InstanceManager();

    process.on('exit', () => {
        vorpal.log('exiting...');
        instancemgr.exitall();
    })

    for ( const service of inputFileData.services ) {
        let command = service.command;
        command = stringTemplate(command, localVars);
        const args = stringArgv(command);
        command = args.shift();

        const cp = spawn(command, args, {
            shell: true,
            env: process.env,
            cwd: service.pwd,
        });
        instancemgr.register(cp, { ...service });

    }

    (async () => {
        for ( ;; ) {
            await instancemgr.waitUntilEmpty();
            console.log('All instances stopped - quitting');
            process.exit(0);
        }
    })();

    vorpal.command('stop', 'stops')
        .action(function(args, callback) {
            instancemgr.exitall();
            callback();
        });

    vorpal
        .delimiter('dev-runner> ')
        .show();
};

main();
