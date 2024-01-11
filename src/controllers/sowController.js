// sow.js
import { PromptTemplate } from "@langchain/core/prompts";
import callModelforResult from "../utils/llm.js";
import s3 from "../models/s3Model.js";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "stream";
import { saveFile } from "./fileController.js";

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

import fs from "fs";
import path from "path";

import { config } from "dotenv";
config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const currentDir = path.dirname(new URL(import.meta.url).pathname);

console.log(`currentDir: ${currentDir}`);
console.log(`currentDir: ${currentDir}`);

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
    const template = ` You are a helpful assistant. Help the user write a Statement of Work for a consulting project. Add a title page with the name of the project, the name of the client, and the name of the consultant. 
    Make sure headers are wrapped in "**". Each section (separated by a header) must be a minimum of 100 words. Write as much as you can for each section. Make sure to include a signing section at the end. Do not write the word "Section" before a section in the document.

    `;
    // -----------------------------------------------
    //1. GATHER REQUEST BODY AND POPULATING TEMPLATE
    // -----------------------------------------------

    //call fillTemplate to populate with given req.body keys and values
    const filledTemplate = fillTemplate(template, req.body);
    // console.log(filledTemplate);

    // Create a PromptTemplate from the template
    const promptTemplate = PromptTemplate.fromTemplate(filledTemplate);

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
                  font: {
                    name: "Times New Roman",
                  },
                  size: 32, // 1 point = 2 half-points. So, 16 points = 32 half-points.
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
              children: [
                new TextRun({
                  text: data,
                  font: {
                    name: "Times New Roman",
                  },
                  size: 24, // 1 point = 2 half-points. So, 12 points = 24 half-points.
                }),
              ],
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

    const doc = new Document({
      sections: sectionsForOutputDocx,
    });
    // console.log(typeof sectionsForOutputDocx);
    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync("src/output.docx", buffer);
      fs.writeFileSync("src/output.docx", buffer);
    });
    //TODO optional: previously downloaded in consult_backend/output.docx , however path.join(dir, ".../output.docx") becomes string consult_backend/.../output.docx
    //so output is moved to src/ since ../ dots 2x works
    const outputFilePath = path.join(currentDir, "../output.docx");
    console.log(outputFilePath);

    res.sendFile(outputFilePath, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=sow.docx", //TODO: we can modify this download name, optional
      },
    });

    try {
      // upload to S3
      const docBuffer = await Packer.toBuffer(doc);
      const docStream = new PassThrough();
      docStream.end(docBuffer);

      const file_name = "output.docx";
      const key = req.user._id.toString() + "/" + Date.now() + "-" + file_name;

      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        Body: docStream,
      };

      const uploads3 = new Upload({
        client: s3,
        params,
      });

      uploads3.on("httpUploadProgress", (progress) => {
        console.log(progress);
      });

      await uploads3.done();
      saveFile(req.user._id.toString(), key); // save to DB
    } catch (err) {
      console.log(err);
    }

    return res.status(200).json({ message: "Success" });
    // return res.json({ sow: filledTemplate });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default sowController;
