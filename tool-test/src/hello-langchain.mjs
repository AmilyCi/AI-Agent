import dotenv from 'dotenv'
import { ChatOpenAI } from '@langchain/openai'

dotenv.config();

const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME || "qwen3-coder-flash",
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENEAI_BASE_URL
    }
})

const response = await model.invoke("介绍一下自己")
console.log(response.content)