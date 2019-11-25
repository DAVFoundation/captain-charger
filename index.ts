import { SDKFactory } from "dav-js";
import { NeedFilterParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());

const identityDir = path.join(os.homedir(), '.dav');
const identity = JSON.parse(fs.readFileSync(path.join(identityDir, fs.readdirSync(identityDir)[0])).toString());

async function main() {
    const DAV = SDKFactory({
        apiSeedUrls: ['localhost:8080'],
        kafkaSeedUrls: ['localhost:9092'],
        ethNodeUrl: wallet.nodeUrl
    });

    const charger = await DAV.getIdentity(identity.address);
}

main().then(() => { console.log('Done') }, (err) => { console.error(err) });