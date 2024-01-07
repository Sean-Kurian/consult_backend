// sow.js
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
// import * as fs from "fs";
import { Document, Packer, Paragraph, TextRun } from "docx";
// import PizZip from "pizzip";
// import Docxtemplater from "docxtemplater";

// import path from "path";

// import { fileURLToPath } from "url";
// import { dirname } from "path";
import JSZip from "jszip";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const currentDir = path.dirname(new URL(import.meta.url).pathname);

console.log(currentDir);
const sowController = async (req, res) => {
  try {
    console.log("--");
    console.log(req);
    console.log("---");
    // Define the parameters for the SOW
    // const parameters = {
    //   scope: "Develop a web application",
    //   deliverables: "Source code, documentation, and deployment",
    //   timeline: "3 months",
    //   paymentTerms: "50% upfront, 50% upon completion",
    // };

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

    // const data = reader.readAsDataURL(currentDir);
    // var zip = new JSZip();
    // zip = zip.file(data);

    // // Load the docx file as binary content
    const content = fs.readFileSync(
      path.resolve(currentDir, "input.docx"),
      "binary"
    );

    console.log(typeof content);

    // // Unzip the content of the file
    const zip = new PizZip(content);
    console.log(zip);
    console.log("0-");

    // This will parse the template, and will throw an error if the template is
    // invalid, for example, if the template is "{data" (no closing tag)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Create a template for the SOW
    const template = ` You are a helpful assistant. Help the user write a Statement of Work for a consulting project. 
    
    My organization is {organization}.
    My client is {client}
    The confidentiality agreements is/are {confidentiality}.
    The project scope for this project is {projectScope}.
    The payment terms are {payment}.
    `;

    //call fillTemplate
    const filledTemplate = fillTemplate(template, req.body);
    console.log(filledTemplate);

    // Create a PromptTemplate from the template
    const promptTemplate = PromptTemplate.fromTemplate(filledTemplate);

    // Create a new ChatOpenAI model
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: "gpt-4-1106-preview",
    });

    // Create a new StringOutputParser
    const outputParser = new StringOutputParser();

    // Create a RunnableSequence from the PromptTemplate, model, and outputParser
    const chain = RunnableSequence.from([promptTemplate, model, outputParser]);

    // Use the chain to generate the SOW
    const result = await chain.invoke();

    // Render the document (Replace {data} with openai result)
    doc.render({
      data: result,
    });

    // Get the zip document and generate it as a nodebuffer
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      // compression: DEFLATE adds a compression step.
      // For a 50MB output document, expect 500ms additional CPU time
      compression: "DEFLATE",
    });

    // buf is a nodejs Buffer, you can either write it to a
    // file or res.send it with express for example.
    fs.writeFileSync(path.resolve(currentDir, "output.docx"), buf);

    return res.json({ sow: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default sowController;
