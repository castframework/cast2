import path from 'path';
import process from 'process';
import {
  GetNewSecurityTokenProxyConfig,
  NewSecurityTokenProxyConfig,
} from '../configuration/new-security-token-proxy-config';

const config = GetNewSecurityTokenProxyConfig();

const stepOutput = require(path.join(
  process.cwd(),
  config.OutputFolder,
  'proxy-deploy-data-field.json',
));

const usedConfig: NewSecurityTokenProxyConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Proxy deploy transaction data field

### Used configuration 

    - BaseUri : ${usedConfig.Contracts.BaseUri}
    - ImplementationAddress : ${usedConfig.Contracts.ImplementationArtifactName}

### Generated Data Field

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
