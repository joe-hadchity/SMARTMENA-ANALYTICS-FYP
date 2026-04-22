/**
 * LLM facade for the SmartMENA backend.
 *
 * Feature code (assistant, captionStudio, reportService, competitor digest)
 * imports from here and gets the shared Azure OpenAI client, the system
 * prompt builders, and the usage meter in one place.
 */

const client = require("./azureOpenAIClient");
const systemPrompts = require("./systemPrompts");
const usageMeter = require("./usageMeter");

module.exports = {
  ...client,
  systemPrompts,
  ...usageMeter,
};
