import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
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
import { config } from "dotenv";
config();

//milvus vectordb
//TODO: Wrap in try catch and error handling

const token = process.env.ZILLIZ_TOKEN;
const uri = process.env.ZILLIZ_URI;

//Will need this later
//similar to .sleep in python,
// we need this because when loading in memory and then calling last chain to generate SOW,
//loading in memory takes longer than calling generate SOW, so it will have no knowledge of history
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
//TODO: CURRENTLY just loading files in from local directory
//should have a seperate file to load in files
const currentDir = path.dirname(new URL(import.meta.url).pathname);
var loadThisDir = path.resolve(currentDir, "examples");

if (loadThisDir.includes("C:\\C:\\")) {
  loadThisDir = loadThisDir.replace("C:\\", "");
}

console.log(loadThisDir);

// const milvusClient = new Milvus();
if (loadThisDir.includes("C:\\C:\\")) {
  loadThisDir = loadThisDir.replace("C:\\", "");
}

async function callModelforResult(filledTemplate) {
  const model = new ChatOpenAI({ modelName: "gpt-4-1106-preview" });
  // Create docs with a loader
  //------------------------------------------------
  //1. LOAD PRE-EXISTING SOWS INTO VECTOR DATABASE
  //------------------------------------------------

  const loader = new DirectoryLoader(loadThisDir, {
    ".json": (path) => new JSONLoader(path, "/texts"),
    ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
    ".txt": (path) => new TextLoader(path),
    ".csv": (path) => new CSVLoader(path, "text"),
  });

  var docs = await loader.load();
  // console.log(docs);

  //TODO: TRY HUGGING FACE EMBEDDING FOR COST
  //loading docs into milvus store try using different embedding
  //splitting the text into
  //chunking documents to gather better relevant information
  const text_splitter = new RecursiveCharacterTextSplitter({
    chumkSize: 300,
    chunkOverlap: 200,
    // seperator: "**<HEADER>**",
  });

  docs = await text_splitter.splitDocuments(docs);

  //TODO: currently this adds 2x documents to db everytime we run,
  // we need to change EXISTS to true and have a milvus client instead of .fromDocuments
  //currently not working for true
  // create milvus vector db client
  const EXISTS = false;
  var milStore = null;
  var milClient = new MilvusClient({
    address: uri,
    token: token,
  });
  //uploading files from documents to vector
  if (EXISTS == false) {
    milStore = await Milvus.fromDocuments(docs, new OpenAIEmbeddings(), {
      collectionName: "sowDataCollection",
      clientConfig: {
        address: uri,
        token: token,
      },
    });
  }

  //

  //   else {
  //     milStore = new MilvusClient({
  //       address: uri,
  //       token: token,
  //     });
  //   }

  //------------------------------------------------
  //2.PERFORM SIMILARITY SEARCH FOR REQUEST BODY KEYS
  //------------------------------------------------

  //TODO: this needs to be variable/parameter maybe we can decide what similarity word to search on
  //TODO: REPLACE myObj with req.body.keys object, add to this function as parameter
  //given all keys
  //find the most relevant doc to section x
  //ideally its chunked perfectly for just section
  const myObj = [
    "organization",
    "client",
    "confidentiality",
    "projectScope",
    "projectSolution",
    "payment",
    "contacts",
  ];
  //for each key search for that section in db and pass into chat history
  var topxDocument = [];
  const performSimilaritySearch = async (dataToSearchOn, limit) => {
    try {
      const prevTop1Doc = await milStore.similaritySearch(
        dataToSearchOn,
        limit
      );
      //   console.log(prevTop1Doc);
      topxDocument.push({ [dataToSearchOn]: prevTop1Doc[0] });
    } catch (error) {
      console.error(
        `Error searching for section "${dataToSearchOn}":`,
        error.message
      );
    }
  };

  //perform similarity search on external db

  const searchPromises = [];
  for (const section of myObj) {
    searchPromises.push(performSimilaritySearch(section, 1));
  }
  //damn these promises
  // Wait for all similarity searches to complete
  await Promise.all(searchPromises);
  //   console.log(topxDocument);

  //------------------------------------------------
  //3.ADD TO BUFFER HISTORY AND PERFORM LLM CALL
  //------------------------------------------------

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

  // this is frm example
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

  //LOADING ALL SIMILAR DOCS INTO MEMORY
  //-----------------------------------
  topxDocument.forEach(async (doc) => {
    //   console.log(doc[0]);

    for (const key in doc) {
      const res1 = await chain.call({
        input: ` here are some previous formatting for section:${key} [${doc[key].pageContent}]`,
      });
    }
  });

  // console.log(memory.chatHistory);

  await sleep(10000);
  //   .then(async () => {
  //   return await chain.call({
  const res3 = await chain.call({
    input: filledTemplate,
  });
  //   console.log(res3.text);
  //   console.log(res3.text.length);
  //   console.log("END---");
  //RESET collection
  milClient.dropCollection({ collection_name: "sowDataCollection" });

  return res3.text;

  //-----------------------------------
}

// const final = await callModelforResult(
//   `You are a helpful assistant. Help the user write a 2 page Statement of Work for a consulting project.   Make sure headers are wrapped in "**" and give as much as possible

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
