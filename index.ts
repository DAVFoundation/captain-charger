import { SDKFactory, Need } from "dav-js";
import { NeedFilterParams, NeedParams, BidParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const identity = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'charger')).toString());

async function main() {
    try {
        const DAV = SDKFactory({
            apiSeedUrls: ['http://localhost:8080'],
            kafkaSeedUrls: ['localhost:9092'],
            ethNodeUrl: wallet.nodeUrl
        });

        const charger = await DAV.getIdentity(identity.address);
        console.log('Charger', charger);

        const needs = await charger.needsForType(new NeedFilterParams({
            location: {
                lat: 32.050382,
                long: 34.766149
            },
            radius: 1000,
        }));
        needs.subscribe(bid, exitOnError);
        console.log('Waiting for Needs...', needs.topic);
    }
    catch (err) {
        exitOnError(err);
    }
}

async function bid(need: Need<NeedParams>) {
    try {
        console.log('Need', need);
        const bid = await need.createBid(new BidParams({
            price: '0.0',
            vehicleId: '1234',
            availableFrom: 1,
            isCommitted: false
        }));
        console.log('Waiting on Bid', bid);

        const commitmentRequests = await bid.commitmentRequests();
        commitmentRequests.subscribe(commitmentRequest => {
            console.log('CommitmentRequest', commitmentRequest);
            commitmentRequest.confirm();
        });

        const messages = await bid.messages();
        messages.subscribe(message => {
            console.log('Message', message);
        });

        const missions = await bid.missions();
        missions.subscribe(mission => {
            console.log('Mission', mission);
        });
    }
    catch (err) {
        exitOnError(err);
    }
}

main().then(() => { });

function exitOnError(err: any) {
    console.error('Exiting: ', err);
    process.exit(0);
}