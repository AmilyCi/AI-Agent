import "dotenv/config"
import "cheerio"
// 加载网页的loader
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

const cheerioLoader = new CheerioWebBaseLoader(
    "https://juejin.cn/post/7233327509919547452",
    {
        selector: '.main-area p'
    }
)

const documents = await cheerioLoader.load()

const textsplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400, // 每个分块的字符数
    chunkOverlap: 50, // 分块之间的重叠字符数
    separators: ["。", "！", "？"], // 分隔符，优先使用段落分割
})

const splitDocuments = await textsplitter.splitDocuments(documents)

console.log(splitDocuments)
