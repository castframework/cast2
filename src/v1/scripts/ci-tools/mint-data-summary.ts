import path from 'path';
import process from 'process';
import {
  GetNewSecurityTokenProxyConfig,
  NewSecurityTokenProxyConfig,
} from '../configuration/new-security-token-proxy-config';
import {
  GetMintDataConfig,
  MintDataConfig,
} from '../configuration/mint-data-config';

const config = GetMintDataConfig();

const stepOutput = require(path.join(
  process.cwd(),
  config.OutputFolder,
  'mint-data-field.json',
));

const usedConfig: MintDataConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Mint data parameter

### Used configuration 

    - Registrar Agent : ${usedConfig.RegistrarAgentAddress}
    - Settler Agent : ${usedConfig.SettlerAgentAddress}
    - Metadata Uri : ${usedConfig.MetadataUri}

### Generated Data Parameter

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
