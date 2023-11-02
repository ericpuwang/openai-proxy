# proxy

# OpenAI/ChatGPT 免翻墙代理

## 部署

点击[这个链接][1]，可以快速一键部署到 Deno Deploy 上。

然后在 Settings 选项卡里可以设置自定义二级域名，或者绑定自己的域名。

或者，访问 https://deno.new 域名，把 openai.ts 复制到 Playground 中，点击 Play
按钮。

## 使用

使用 OpenAI/ChatGPT 官方 npm 包：

```diff
import { Configuration } from "openai";

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
+ basePath: "https://xxxxx.deno.dev/v1",
});
```

使用 OpenAI/ChatGPT 官方 Python 包：

```diff
  import openai

  openai.api_key = os.getenv("OPENAI_API_KEY")
+ openai.api_base = "https://xxxxx.deno.dev/v1"
```

# V2Ray

## 部署

点击[这个链接][2]，可以快速一键部署到 Deno Deploy 上。

然后在 Settings 选项卡里可以设置自定义二级域名，或者绑定自己的域名。

[1]: https://dash.deno.com/new?url=https://raw.githubusercontent.com/ericpuwang/proxy/main/openai.ts
[2]: https://dash.deno.com/new?url=https://raw.githubusercontent.com/ericpuwang/proxy/main/v2ray.ts
