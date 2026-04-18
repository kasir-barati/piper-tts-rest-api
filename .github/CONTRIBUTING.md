# Test Locally

```bash
cp .env.example .env

./test.sh
```

## Load Testing

```bash
cp .env.example .env

python3 load_test.py --help
```

# Bump Version

To release a new version your [commit message should follow these rules](https://github.com/semantic-release/semantic-release?tab=readme-ov-file#commit-message-format) which is the default behavior of `semantic-release`.

> [!CAUTION]
>
> `feat!: some message` won't release a new major version. So make sure to use the correct commit message:
>
> ```cmd
> git commit -m "perf: some message" -m "BREAKING CHANGE: extra details"
> ```

## Automated Docker Hub release

This repository is configured to auto-release Docker images from `Dockerfile` using Conventional Commits.

- Workflow: `.github/workflows/dockerhub-release.yml`.
- Release config: `.releaserc.json` ([semantic-release](https://www.npmjs.com/package/semantic-release)).
- Trigger: push to `main`.

How versioning works:

| Commit type(s)                                           | Release behavior       |
| -------------------------------------------------------- | ---------------------- |
| `feat:`                                                  | **minor** version bump |
| `fix:` or `perf:`                                        | **patch** version bump |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:` | No release by default  |

For each release, the workflow builds from `Dockerfile` and pushes:

- `9109679196/piper-tts-rest-api:<semantic-version>`
- `9109679196/piper-tts-rest-api:latest`
