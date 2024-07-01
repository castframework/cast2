import { GetNewSecurityTokenImplementationConfig, NewSecurityTokenImplementationConfig } from "../configuration/new-security-token-implementation-config";
import path from 'path';
import process from "process";

const config = GetNewSecurityTokenImplementationConfig();

const stepOutput = require(path.join(process.cwd(),config.OutputFolder,"implementation-deploy-data-field.json"));

const usedConfig: NewSecurityTokenImplementationConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Implemention deploy transaction data field

### Used Operators 

    - Registrar : ${usedConfig.NewOperatorsAddress.Registrar}
    - Technical : ${usedConfig.NewOperatorsAddress.Technical}

### Generated Data Field

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
