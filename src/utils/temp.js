import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { formatDocumentsAsString } from "langchain/util/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PromptTemplate, FewShotPromptTemplate } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import path from "path";
import { LLMChain } from "langchain/chains";
import { ConversationChain } from "langchain/chains";
import {
  MilvusClient,

  //   Milvus,
} from "@zilliz/milvus2-sdk-node";
import MilvusVectorStore from "@zilliz/milvus2-sdk-node";
import { Milvus } from "langchain/vectorstores/milvus";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";

//milvus vectordb

const token =
  "44a0b129c554ceee52382afd3f7d3bae8e8fdb0b6f5bde0596072837437600a471b86f0bb8363d38a64c7a4db953d4fb36ba6f36";
const uri = "https://in03-30a8110457fc8bd.api.gcp-us-west1.zillizcloud.com";

// create milvus vector db client
// const testclient = new MilvusClient({
//   address: uri,
//   token: token,
// });

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
const currentDir = path.dirname(new URL(import.meta.url).pathname);
const loadThisDir = path.resolve(currentDir, "examples");
console.log(loadThisDir);
// const milvusClient = new Milvus();
async function callModelforResult(filledTemplate) {
  // Create docs with a loader
  const loader = new DirectoryLoader(loadThisDir, {
    ".json": (path) => new JSONLoader(path, "/texts"),
    ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
    ".txt": (path) => new TextLoader(path),
    ".csv": (path) => new CSVLoader(path, "text"),
  });
  // console.log(token);
  var docs = await loader.load();
  // console.log(docs);

  // Load the docs into the vector store
  //note: HNSW is in memory vector store, we can try cloud vector store to store more files
  // const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());

  //loading docs into milvus store try using different embedding
  //splitting the text into
  // const text_splitter = new RecursiveCharacterTextSplitter();
  // text_splitter.chunkSize = 1000;
  // text_splitter.chunkOverlap = 200;
  // docs = await text_splitter.splitDocuments(docs);

  const EXISTS = true;
  var milStore = null;
  if (EXISTS == true) {
    milStore = await Milvus.fromDocuments(docs, new OpenAIEmbeddings(), {
      collectionName: "sowDataCollection",
      clientConfig: {
        address: uri,
        token: token,
      },
    });
  } else {
    milStore = new MilvusClient({
      address: "https://in03-30a8110457fc8bd.api.gcp-us-west1.zillizcloud.com",
      token:
        "44a0b129c554ceee52382afd3f7d3bae8e8fdb0b6f5bde0596072837437600a471b86f0bb8363d38a64c7a4db953d4fb36ba6f36",
    });

    // console.log(milStore);
    //   milStore = new MilvusVectorStore(milStore);
  }

  const model = new ChatOpenAI({ modelName: "gpt-4" });

  // // const retriever = vectorStore.asRetriever();

  //perform similarity search on external db
  // //getting the top1 most similar document to project solution which will be req.body.projectSolution
  // const prevTop1Doc = await vectorStore.similaritySearch(
  //   "data science solution", //<req.body.projectSolution>
  //   1
  // );

  const prevTop1Doc = await milStore.similaritySearch(
    "data science solution", //<req.body.projectSolution>
    2
  );

  //TODO:Chunk it into gpt chain it, first step, second etc, increased context window

  // console.log(prevTop1Doc);
  // console.log(typeof prevTop1Doc);
  // console.log("----END OF TOP DOCS-----");
  // const prompt = PromptTemplate.fromTemplate({
  //   conversation: ConversationChain(
  //     prompt : `You are a helpful assistant. Help the user write a Statement of Work for a consulting project. Make sure headers are wrapped in "**"
  //         My organization is IBM.
  //         My client is MS
  //         The confidentiality agreements is/are v big big confidentiality stuff.
  //         The project scope for this project is v big project scope
  //         The payment terms are a lot of money.
  //         The projectSolution is v small project solution
  //         The Food provided is mangos and fruits  `
  //   ),
  //   llm: model,
  //   memory: new BufferMemory(),
  // });
  // const temp = `Here are statements of work   `;
  // const prompt = PromptTemplate.fromTemplate(temp);

  const memory = new BufferMemory({ memoryKey: "history" });
  // This chain is preconfigured with a default prompt
  // const convochain = new ConversationChain({
  //   llm: model,
  //   memory: memory,
  //   //   prompt: prompt,
  // });
  // prevTop1Doc.forEach(async (doc) => {
  //   //   console.log(doc.pageContent);
  //   const res1 = await convochain.call({
  //     input: `Here are most relevant Statement of Work ${doc.pageContent}`,
  //   });
  //   console.log({ res1 });
  //   console.log("NEXT DOC");
  // });

  // Create a prompt template for a friendly conversation between a human and an AI.
  const prompt =
    PromptTemplate.fromTemplate(`Here are previous statement of work: remember these

Current conversation:
{history}
Human: {input}
AI:`);

  // Set up the chain with the language model, prompt, and memory.
  const chain = new LLMChain({ llm: model, prompt, memory });

  // Example usage of the chain to continue the conversation.
  // The `call` method sends the input to the model and returns the AI's response.

  // const chain = new LLMChain({
  //   llm: model,
  //   memory: memory,
  //   prompt: prompt,
  // });
  prevTop1Doc.forEach(async (doc) => {
    //   console.log(doc.pageContent);
    const res1 = await chain.call({
      input: ` ${doc.pageContent}`,
    });
    // console.log({ res1 });
    // console.log("NEXT DOC");
  });

  // console.log(memory.chatHistory);

  //   var res3 = "tempfornow";
  await sleep(10000);
  //   .then(async () => {
  //   return await chain.call({
  const res3 = await chain.call({
    //       input: `
    //     You are a helpful assistant. Help the user write a Statement of Work for a consulting project.   Make sure headers are wrapped in "**" and give as much as possible

    //     organization": "Ernst & Young LLP ",
    //   "client": "Villlage of Westmont, IL",
    //   "confidentiality": "You will not and not permit others to quote or refer to any reports to EY or any other EY firm documents related to purchase or sale of securities, or periodic reporting obligations under Securities Laws. ",
    //   "projectScope": "EY will provide the following Services: Analysis of TIF assistance requests  by participating in project iniation meetings with representatives of the village, assist the village to identify key data, discuss TIF assistance requests the village has received or is considering, understand and confirm the villages financial expectations with respect to public benefits, assist the village in their review of TIF assistance requests by reviewing a number of agreed upon elements and benchmarks determined by the village. In additional, we will provide observations, a detailed analysis and model the pro form and gap analysis as well as prepare for client's review and approval. Finally we will prepare a summary memorandum, and assist the village in a supporting role. ",
    //   "projectSolution": "We will assist the village with preparing the annual TIF report(s) based on policies, criteria and data provided by the village. EY will prepare an addendum to the scope of work and proposal for the annual TIF reports. ",
    //   "payment": "You shall pay fees based on the time our professionals spend performing them, billed at the following agreed upon rates per hour: Partner/Principal, $400 - Executive Director, $400 - Senior Manager, $325 - Manager, $275 - Senior, $230 - Staff, $190. ",
    //   "additonalInfo": "",
    //   "Contacts": "We will communicate with Spencer Parker. Your contact at EY will be Jennifer Tammen.
    // `,
    input: filledTemplate,
  });
  console.log(res3.text);
  console.log(res3.text.length);
  console.log("END---");
  return res3.text;
  // awaitconsole.log("END");
  //   });

  //   console.log(res3);
  //   console.log(res3.text.length);
  // console.log({ res });
  //   const res2 = await convochain.call({
  //     input: `what was my first message}`,
  //   });
  //   console.log({ res2 });
  //   console.log();
  // memory. note token limit is by min request we can try .sleep
  //   const lastchain = new LLMChain({
  //     llm: model,
  //     memory: memory,
  //     prompt,
  //   });
  //   console.log("lLAST RUN=--");
  //   const result = await lastchain.call({
  //     question: "what was my first message?",
  //   });
  //   console.log(result);
  // });
  //   prompt: prompt,)
}

// const final = await callModelforResult(
//   `You are a helpful assistant. Help the user write a Statement of Work for a consulting project.   Make sure headers are wrapped in "**" and give as much as possible

//         organization": "Ernst & Young LLP ",
//       "client": "Villlage of Westmont, IL",
//       "confidentiality": "You will not and not permit others to quote or refer to any reports to EY or any other EY firm documents related to purchase or sale of securities, or periodic reporting obligations under Securities Laws. ",
//       "projectScope": "EY will provide the following Services: Analysis of TIF assistance requests  by participating in project iniation meetings with representatives of the village, assist the village to identify key data, discuss TIF assistance requests the village has received or is considering, understand and confirm the villages financial expectations with respect to public benefits, assist the village in their review of TIF assistance requests by reviewing a number of agreed upon elements and benchmarks determined by the village. In additional, we will provide observations, a detailed analysis and model the pro form and gap analysis as well as prepare for client's review and approval. Finally we will prepare a summary memorandum, and assist the village in a supporting role. ",
//       "projectSolution": "We will assist the village with preparing the annual TIF report(s) based on policies, criteria and data provided by the village. EY will prepare an addendum to the scope of work and proposal for the annual TIF reports. ",
//       "payment": "You shall pay fees based on the time our professionals spend performing them, billed at the following agreed upon rates per hour: Partner/Principal, $400 - Executive Director, $400 - Senior Manager, $325 - Manager, $275 - Senior, $230 - Staff, $190. ",
//       "additonalInfo": "",
//       "Contacts": "We will communicate with Spencer Parker. Your contact at EY will be Jennifer Tammen.
//     `
// );

// console.log(final);

export default callModelforResult;
