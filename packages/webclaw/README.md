# webclaw

Official CLI for WebClaw. It initializes a new project by cloning the WebClaw repository.

## Usage

```bash
npx webclaw
```

Initialize into a specific directory:

```bash
npx webclaw init my-webclaw
```

Run project commands from a WebClaw project directory:

```bash
webclaw dev
webclaw build
webclaw preview
webclaw test
webclaw lint
```

## Commands

- `webclaw` - initialize in current directory
- `webclaw init [dir]` - initialize a project in `dir`
- `webclaw doctor` - validate local prerequisites
