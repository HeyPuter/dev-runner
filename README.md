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
dev-runner run.json5
```

If a config filename is not specified, it will try `run.json5` by default.

## Features

### Variables

A command specified in the `run.json5` file can contain variables which
are loaded from another json5 file specified as the second argument to
`dev-runner` (`local.json5` by default).

For example, this can be your `run.json5`:

```javascript
{
    services: [
        {
            name: 'static-https',
            pwd: './dist',
            command: 'npx http-server =p 8443 -S -C "{cert} -L "{key}"'
        }
    ]
}
```

and this can be your `local.json5`:

```javascript
{
    cert: '/var/my-certs/cert.pem',
    key: '/var/my-certs/key.pem',
}
```

Then you can run either `dev-runner` or `dev-runner run.json5 local.json5`
