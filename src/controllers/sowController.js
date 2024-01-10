// sow.js
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BufferMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";
import callModelforResult from "../utils/llm.js";
// import * as fs from "fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  SectionType,
  HeadingLevel,
  NumberFormat,
  Footer,
  AlignmentType,
  PageNumber,
} from "docx";
import {
  MilvusClient,

  //   Milvus,
} from "@zilliz/milvus2-sdk-node";

import { Milvus } from "langchain/vectorstores/milvus";

import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const currentDir = path.dirname(new URL(import.meta.url).pathname);

// console.log(currentDir);

const sowController = async (req, res) => {
  try {
    //fillTemplate function fills prompt template with provided values from req.body object
    const fillTemplate = (template, values) => {
      //values is req.body object {key1:val1, key2:val...}
      //we must find which fields are new in req.body(means optional fields) by checking each key if they are in our prompt template
      const additionalFields = Object.entries(values) //static method will return [key,value]
        .filter(([key]) => !template.includes(`{${key}}`)) //return keys not in template this will show additional fields
        .map(([key, value]) => `The ${key} is ${value}`);

      //just putting this here to only concat if there are new fields, if not dont do anything
      const additionalFieldsString =
        additionalFields.length > 0 ? `${additionalFields.join("\n  ")}  ` : "";

      return Object.entries(values).reduce((prevTemplate, [key, value]) => {
        //for each key
        const placeholder = `{${key}}`; //split template by that key
        //ex becomes: ['The ',  'for this project is 3 months.']
        //                    ^^ then join by value
        //note: if there is a repeating key it will have wrong behaviour
        return prevTemplate.split(placeholder).join(value);
      }, template + additionalFieldsString);
    };
    //note: here usually result output will contain -- content -- need to parse

    // Create a template to feed
    const template = ` You are a helpful assistant. Help the user write a Statement of Work for a consulting project. 
    Make sure headers are wrapped in "**". Each section (separated by a header) must be a minimum of 100 words. Write as much as you can for each section. Make sure to include a signing section at the end.  
  
    `;
    // -----------------------------------------------
    //1. GATHER REQUEST BODY AND POPULATING TEMPLATE
    // -----------------------------------------------

    //call fillTemplate to populate with given req.body keys and values
    const filledTemplate = fillTemplate(template, req.body);
    // console.log(filledTemplate);

    // Create a PromptTemplate from the template
    const promptTemplate = PromptTemplate.fromTemplate(filledTemplate);

    // // Create a new ChatOpenAI model
    // const model = new ChatOpenAI({
    //   temperature: 0,
    //   modelName: "gpt-4-1106-preview",
    // });

    // // Create a new StringOutputParser
    // const outputParser = new StringOutputParser();

    // // Create a RunnableSequence from the PromptTemplate, model, and outputParser
    // const chain = RunnableSequence.from([promptTemplate, model, outputParser]);

    // // Use the chain to generate the SOW
    // const result = await chain.invoke();
    // // docxTemplaterGenerate(result);

    // -----------------------------------------------
    //2. CALL LLM CHAIN
    // -----------------------------------------------

    const sowContent = await callModelforResult(filledTemplate);
    // Split the content by sections
    // (e.g.,  gpt will display headers as ** **1. Introduction**, **2. Confidentiality Agreement**, etc.)
    const sections = sowContent.split(/(\*\*.*?\*\*)/);

    // -----------------------------------------------
    //3. GENERATE DOCX BASED ON PROVIDED SOW CONTENT -> NAMED SECTIONS
    // -----------------------------------------------

    //dynamically create sections of doc object
    const sectionsForOutputDocx = sections.map((data, index) => {
      // If the data contains "**", create TextRun with bold true and headers1
      console.log(index, data);
      if (data.includes("**")) {
        return {
          properties: { type: SectionType.CONTINUOUS },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER ? index == 1 : "",
              children: [
                new TextRun({
                  text: data.replace(/[^a-zA-Z ]/g, ""),
                  bold: true,
                }),
              ],
              spacing: {
                before: 100,
              },
              heading: HeadingLevel.HEADING_1,
              page: {
                pageNumbers: {
                  start: 1,
                  formatType: NumberFormat.DECIMAL,
                },
              },
            }),
          ],
          //TODO: currently footers are called for both, have tried to ...prevObj, footerObj, not working yet
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun(req.body.organization),
                    new TextRun({
                      children: ["Page Number: ", PageNumber.CURRENT],
                    }),
                    new TextRun({
                      children: [" of ", PageNumber.TOTAL_PAGES],
                    }),
                  ],
                }),
              ],
            }),
          },
        };
      } else {
        // If not, create TextRun without bold regular text
        return {
          properties: { type: SectionType.CONTINUOUS },
          children: [
            new Paragraph({
              text: data,
              spacing: {
                before: 100,
              },
              indent: true,
            }),
          ],

          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun(req.body.organization),
                    new TextRun({
                      children: [" Page Number: ", PageNumber.CURRENT],
                    }),
                    new TextRun({
                      children: [" of ", PageNumber.TOTAL_PAGES],
                    }),
                  ],
                }),
              ],
            }),
          },
        };
      }
    });

    // const footer = {
    //   footers: {
    //     default: new Footer({
    //       children: [
    //         new Paragraph({
    //           alignment: AlignmentType.CENTER,
    //           children: [
    //             new TextRun("Foo Bar corp. "),
    //             new TextRun({
    //               children: ["Page Number: ", PageNumber.CURRENT],
    //             }),
    //             new TextRun({
    //               children: [" to ", PageNumber.TOTAL_PAGES],
    //             }),
    //           ],
    //         }),
    //       ],
    //     }),
    //   },
    // };

    // console.log(newSection);

    const doc = new Document({
      sections: sectionsForOutputDocx,
    });
    // console.log(typeof sectionsForOutputDocx);
    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync("output.docx", buffer);
    });

    return res.json({ sow: filledTemplate });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default sowController;
