# Bump Version

To release a new version your [commit message should follow these rules](https://github.com/semantic-release/semantic-release?tab=readme-ov-file#commit-message-format) which is the default behavior of `semantic-release`.

> [!CAUTION]
>
> `feat!: some message` won't release a new major version. So make sure to use the correct commit message:
>
> ```cmd
> git commit -m "feat: some message" -m "BREAKING CHANGE: extra details"
> ```
