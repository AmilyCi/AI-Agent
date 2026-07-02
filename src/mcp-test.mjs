import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({ 
    modelName: process.env.OPENAI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        'my-mcp-server': {
            command: "node",
            args: [
                "/Users/cixin/04 github上的项目/tool-test/src/my-mcp-server.mjs"
            ]
        },
        "amap-maps-streamableHTTP": {
            "url": "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY
        },
        "filesystem": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-filesystem",
              ...(process.env.ALLOWED_PATHS.split(',') || [])
            ]
        },
        "chrome-devtools": {
            "command": "npx",
            "args": [
                "-y",
                "chrome-devtools-mcp@latest"
            ]
        },
    }
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

// 工具调用之间的最小间隔(ms)，用于避免超出第三方 API 的 QPS 限制
const TOOL_CALL_INTERVAL_MS = 1000;
// QPS 限流时的最大重试次数
const MAX_RETRIES = 4;
// 限流错误关键词
const RATE_LIMIT_KEYWORDS = ['CUQPS_HAS_EXCEEDED_THE_LIMIT', 'QPS', 'RATE_LIMIT', 'rate limit', '429'];

function isRateLimitError(err) {
    const msg = String(err?.message || err || '');
    return RATE_LIMIT_KEYWORDS.some(k => msg.toUpperCase().includes(k.toUpperCase()));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 带退避重试的工具调用封装
async function invokeToolWithRetry(tool, args) {
    let lastErr;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await tool.invoke(args);
        } catch (err) {
            lastErr = err;
            if (isRateLimitError(err) && attempt < MAX_RETRIES) {
                // 指数退避: 1s, 2s, 4s, 8s...
                const backoff = 1000 * Math.pow(2, attempt);
                console.log(chalk.yellow(`⚠️  触发限流，${backoff}ms 后重试 (第 ${attempt + 1}/${MAX_RETRIES} 次)`));
                await sleep(backoff);
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
}

async function runAgentWithTools(query, maxIterations = 30) {
    const messages = [
        new HumanMessage(query)
    ];

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
        const response = await modelWithTools.invoke(messages);
        messages.push(response);

        // 检查是否有工具调用
        if (!response.tool_calls || response.tool_calls.length === 0) {
            console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
            return response.content;
        }

        console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
        console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));
        // 执行工具调用(串行 + 间隔 + 限流重试)
        for (let idx = 0; idx < response.tool_calls.length; idx++) {
            const toolCall = response.tool_calls[idx];
            // 除第一个外，每个工具调用前等待一段时间，降低 QPS 压力
            if (idx > 0) await sleep(TOOL_CALL_INTERVAL_MS);

            const foundTool = tools.find(t => t.name === toolCall.name);
            if (foundTool) {
                const toolResult = await invokeToolWithRetry(foundTool, toolCall.args);

                // 确保 content 是字符串类型
                let contentStr;
                if (typeof toolResult === 'string') {
                    contentStr = toolResult;
                } else if (toolResult && toolResult.text) {
                    // 如果返回对象有 text 字段，优先使用
                    contentStr = toolResult.text;
                }

                messages.push(new ToolMessage({
                    content: contentStr,
                    tool_call_id: toolCall.id,
                }));
            }
        }
    }

    return messages[messages.length - 1].content;
}

// await runAgentWithTools("北京南站附近的5个酒店，以及去的路线");
// await runAgentWithTools("北京南站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/cixin/Desktop 的一个 md 文件");
await runAgentWithTools("北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名");

// await mcpClient.close();
