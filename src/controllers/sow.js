// sow.js
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

const sowController = async (req, res) => {
  try {
    // Define the parameters for the SOW
    const parameters = {
      scope: "Develop a web application",
      deliverables: "Source code, documentation, and deployment",
      timeline: "3 months",
      paymentTerms: "50% upfront, 50% upon completion",
    };

    // Create a template for the SOW
    const template = ` You are a helpful assistant. Help the user write a Statement of Work for a consulting project. 

    The scope of this project is to {scope}.
    The deliverables for this project will be {deliverables}.
    The timeline for this project is {timeline}.
    The payment terms are {paymentTerms}.
    `;

    // Create a PromptTemplate from the template
    const promptTemplate = PromptTemplate.fromTemplate(template);

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
