# 部署备忘

## 现状

- 仓库:`xingyejiu237/game_demo1`(大号,Public),main 分支,GitHub Pages 已启用。
- 自定义域名 `yunxiangcity.top`(购于 NameSilo,NS 托管在 Cloudflare)。
- 两个地址并存:默认 `xingyejiu237.github.io/game_demo1/` + 自定义 `yunxiangcity.top/`(免费版无法隐藏默认地址,属正常)。
- 部署 = `git push` 到 main,1-2 分钟自动生效。

## Cloudflare DNS 关键规则

- **GitHub Pages 的 A/CNAME 记录必须"仅 DNS"(灰云)**,橙云代理会导致证书签不出来。
- 邮箱(Cloudflare Email Routing)与网页共存原理:邮箱靠 MX 记录,网页靠 A/CNAME,互不干扰。
- 同名 A 记录会合并解析(浏览器随机连),旧记录必须删掉再换,否则"时好时坏"。
- NS 指向谁就在谁家配记录(NameSilo 上配了不生效)。

## 证书踩坑

- Pages 域名状态 `errored` 时(GitHub 不会自动重试):用 `PUT /repos/{owner}/{repo}/pages {"cname":"..."}` 重新触发,状态依次 `errored → building → built`,证书 SAN 更新比配置状态慢(几分钟~1 小时)。
- 验证:`openssl s_client -connect yunxiangcity.top:443 -servername yunxiangcity.top | openssl x509 -noout -ext subjectAltName`,确认 SAN 含自定义域名。
- 私有仓库免费套餐不支持 Pages(报 "Your current plan does not support..."),必须 Public。

## Git 操作经验

- 无权限访问 GitHub 统一报 `Repository not found`(私有仓库不暴露存在性),先确认仓库存在 + 账号有权限,别误判。
- 凭证:Windows Git Credential Manager(`credential.helper = manager`);缓存了错误账号时,凭据管理器删除 `git:https://github.com` 条目。
- 本机测试环境(无头/Node)读不到 GitHub 凭证弹窗,涉及认证的操作要在用户终端执行或说明。

## 完整流程

见本地 `部署流程.md`(含 DNS 记录表与踩坑清单,已被 .gitignore 忽略,不推送)。
