import 'dotenv/config';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import {
  createAgent,
  createMiddleware,
  HumanMessage,
  ToolMessage,
  tool,
} from 'langchain';

// ================= 模拟用户数据库 =================
const USERS = {
  'user-1': { id: 'user-1', name: '小明', role: 'admin', points: 320 },
  'user-2': { id: 'user-2', name: '小红', role: 'vip', points: 520 },
};
const findUser = (id) =>
  USERS[id] ?? { id, name: '未知用户', role: 'guest', points: 0 };

// ================= 1. 工具定义 =================
// 工具一：查当前用户信息（userId 由中间件自动注入，模型不用关心）
const getUserInfoTool = tool(
  async ({ userId }) => JSON.stringify(findUser(userId)),
  {
    name: 'get_user_info',
    description:
      '获取当前登录用户的信息（昵称、角色、积分）。userId 无需手动传，系统会自动带上当前用户。',
    schema: z.object({
      userId: z
        .string()
        .optional()
        .describe('当前用户ID，通常由系统自动注入，无需手动提供'),
    }),
  },
);

// 工具二：管理类工具，仅 admin 可调（用来演示权限拦截）
const deleteUserTool = tool(async ({ targetUserId }) => `已删除用户 ${targetUserId}`, {
  name: 'delete_user',
  description: '删除指定用户（仅限 admin 角色可执行）。',
  schema: z.object({
    targetUserId: z.string().describe('要删除的用户ID'),
  }),
});

// ================= 2. 鉴权中间件 =================
const authMiddleware = createMiddleware({
  name: 'AuthMiddleware',

  // contextSchema：每次 invoke 通过 config.context 传入的"当前请求身份"
  // 只读、不持久化，相当于 HTTP 请求里携带的 JWT/登录态
  contextSchema: z.object({
    userId: z.string(),
    userRole: z.string(),
  }),

  // 通过中间件注册工具 → agent 的 tools 保持 [] 也能用这些工具
  tools: [getUserInfoTool, deleteUserTool],

  // wrapToolCall：每次工具执行前被调用 → 鉴权 + 审计 + 参数注入
  wrapToolCall: async (request, handler) => {
    const toolName = request.tool?.name ?? request.toolCall.name;
    const { userId, userRole } = request.runtime.context;

    // ① 审计日志：谁、什么时刻、调了什么工具、传了什么参数
    console.log(
      `[Auth] ${userId}(${userRole}) -> ${toolName}`,
      JSON.stringify(request.toolCall.args ?? {}),
    );

    // ② 权限拦截：delete_user 仅 admin 可用，否则直接返回"无权限"的 ToolMessage
    if (toolName === 'delete_user' && userRole !== 'admin') {
      return new ToolMessage({
        content: `无权限执行 delete_user（当前角色: ${userRole}，需要 admin）`,
        tool_call_id: request.toolCall.id,
        name: toolName,
      });
    }

    // ③ 参数自动注入：get_user_info 若模型没传 userId，自动补上当前登录用户
    if (toolName === 'get_user_info') {
      const args = {
        ...request.toolCall.args,
        userId: request.toolCall.args.userId ?? userId,
      };
      return handler({ ...request, toolCall: { ...request.toolCall, args } });
    }

    // 其他工具原样放行
    return handler(request);
  },

  // beforeModel：模型每次调用前，把用户身份注入系统上下文（演示用）
  beforeModel: (state, runtime) => {
    console.log(
      `[Auth] 模型调用前，注入用户: ${runtime.context.userId}(${runtime.context.userRole})`,
    );
  },

  // afterAgent：整个 agent 跑完后，输出审计汇总
  afterAgent: (state, runtime) => {
    console.log(`[Auth] agent 结束，本次会话用户: ${runtime.context.userId}`);
  },
});

// ================= 3. Agent =================
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: { baseURL: process.env.OPENAI_BASE_URL },
  temperature: 0,
});

const agent = createAgent({
  model,
  tools: [], // 工具全部由中间件注入
  systemPrompt:
    '你是一个带权限管理的客服助手。\n' +
    '- 用户问"我是谁/我的信息"时用 get_user_info\n' +
    '- 用户要求删除用户时用 delete_user',
  middleware: [authMiddleware],
});

// ================= 4. 运行：两种身份对比 =================
const cases = [
  {
    text: '我是谁？我有什么权限？',
    context: { userId: 'user-1', userRole: 'admin' },
  },
  {
    text: '把 user-3 删掉',
    context: { userId: 'user-2', userRole: 'vip' }, // vip 想干 admin 的活
  },
];

for (const { text, context } of cases) {
  console.log('\n===== 输入:', text, '| 身份:', JSON.stringify(context), '=====');
  const { messages } = await agent.invoke(
    { messages: [new HumanMessage(text)] },
    { context }, // ← 关键：登录态通过 config.context 传入
  );
  console.log('回复:', messages.at(-1)?.content);
}
