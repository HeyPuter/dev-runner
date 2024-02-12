# dev-runner

```
npm install -g @heyputer/dev-runner
```

This is a convenient utility to run multiple processes when something
like `supervisord` is overkill, or you can think of it as a pre-shaven
yak you just watched float by.

Simply write a configuration file in json5 format with all the commands
you'd like to run:

```javascript
{
    services: [
        {
            name: 'static-host',
            pwd: './dist',
            command: 'npx http-server -p 8080',
        },
        {
            name: 'rollup-watcher',
            pwd: '.',
            command: 'npx rollup -c rollup.config.js --watch',
        },
    ]
}
```

Then run `dev-runner` and specify your config file's name:

```
dev-runner my-config.json5
```

If a config filename is not specified, it will try `run.json5` by default.
