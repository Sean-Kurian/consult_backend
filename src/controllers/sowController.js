// sow.js
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
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
// import PizZip from "pizzip";
// import Docxtemplater from "docxtemplater";

// import path from "path";

// import { fileURLToPath } from "url";
// import { dirname } from "path";

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const currentDir = path.dirname(new URL(import.meta.url).pathname);

console.log(currentDir);
//this is old not used
const docxTemplaterGenerate = (result) => {
  // // Load the docx file as binary content
  //
  const content = fs.readFileSync(
    path.resolve(currentDir, "input.docx"),
    "binary"
  );

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
};

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
    //note: here usually rsult output will contain -- content -- need to parse
    const sowContent = `**Statement of Work (SOW)****Project Title:** [Project Name]**Date:** [Date]**Prepared by:** [Your Name/Position], IBM**Client:** MS**1. Introduction**This Statement of Work (SOW) is entered into by IBM and MS as of the date last signed below and outlines the terms and conditions under which IBM will provide consulting services to MS.**2. Confidentiality Agreement**Both parties agree to adhere to the confidentiality terms as outlined in the separate confidentiality agreement, which includes but is not limited to the protection of proprietary information, trade secrets, and any other data deemed sensitive. The confidentiality agreement is recognized as "v big big confidentiality stuff" and is integral to the trust and execution of this project.**3. Project Scope**The scope of this consulting project, referred to as "v big project scope," encompasses the following deliverables and services:- [List of Deliverables]- [Description of Services]- [Any Milestones or Phases]- [Expected Outcomes]IBM will provide the necessary resources and expertise to achieve the objectives outlined in the project scope.**4. Project Solution**The solution to be implemented, known as "v small project solution," will address the specific needs of MS as identified during the initial assessment phase. The solution will include:- [Solution Components]- [Implementation Plan]- [Support and Maintenance Terms]**5. Payment Terms**MS agrees to compensate IBM with "a lot of money," under the following payment terms:- [Initial Deposit Amount and Due Date]- [Payment Milestones and Schedules]- [Acceptance Criteria for Deliverables]- [Any Late Payment Penalties or Interest]**6. Food Provisions**During the term of this project, IBM will provide mangos and fruits to MS personnel involved in the project as a courtesy. This provision is not part of the formal compensation or project deliverables.**7. Project Management**IBM will assign a project manager to oversee the project's progress and serve as the primary point of contact for MS. Regular updates and meetings will be scheduled to ensure transparency and alignment on project status.**8. Acceptance Criteria**MS will have [Number of Days] days from the delivery of each milestone to review and accept the work. Acceptance will be deemed to have occurred unless MS notifies IBM in writing of any deficiencies within this period.**9. Term and Termination**This SOW is effective as of [Effective Date] and will remain in effect until [End Date or Completion of Project], unless terminated earlier by either party in accordance with the terms set forth herein.**10. Signatures**This SOW will not take effect until signed by authorized representatives from both IBM and MS.For IBM:[Signature][Printed Name][Title][Date]For MS:[Signature][Printed Name][Title][Date]`;

    // const data = reader.readAsDataURL(currentDir);
    // var zip = new JSZip();
    // zip = zip.file(data);

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

    // Split the content by sections (e.g.,  gpt will display headers as ** **1. Introduction**, **2. Confidentiality Agreement**, etc.)
    const sections = sowContent.split(/(\*\*.*?\*\*)/);

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
                  text: data.replace(/[^a-zA-Z]/g, ""), //fix this to have replaceall
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
