// sow.js
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

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

    // Create a template for the SOW
    const template = ` You are a helpful assistant. Help the user write a Statement of Work for a consulting project. 

    The scope of this project is to {scope}.
    The deliverables for this project will be {deliverables}.
    The timeline for this project is {timeline}.
    The payment terms are {paymentTerms}.
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
    const result = await chain.invoke(parameters);

    return res.json({ sow: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default sowController;
