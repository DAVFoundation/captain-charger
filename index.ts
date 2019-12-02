import { SDKFactory, Need, Mission, Message } from "dav-js";
import { NeedFilterParams, NeedParams, BidParams, MissionParams, StartingMessageParams, ChargingStartedMessageParams, ChargingCompleteMessageParams, StatusRequestMessageParams, ProviderStatusMessageParams, ChargingArrivalMessageParams, DroneStatusMessageParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import MessageParams from 'dav-js/dist/drone-charging/MessageParams';

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
        needs.subscribe(handleBid, exitOnError);
        console.log('Waiting for Needs...', needs.topic);
    }
    catch (err) {
        exitOnError(err);
    }
}

async function handleBid(need: Need<NeedParams>) {
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
        }, exitOnError);

        const messages = await bid.messages();
        messages.subscribe(message => {
            console.log('Bid Message', message);
        }, exitOnError);

        const missions = await bid.missions();
        missions.subscribe(handleMission, exitOnError);
    }
    catch (err) {
        exitOnError(err);
    }
}

async function handleMission(mission: Mission<MissionParams>) {
    try {
        console.log('Mission', mission);

        const messages = await mission.messages();
        messages.subscribe(message => handleMissionMessage(mission, message), exitOnError);

        await mission.sendMessage(new StartingMessageParams({}));
        await mission.sendMessage(new StatusRequestMessageParams({}));
    }
    catch (err) {
        exitOnError(err);
    }
}

async function handleMissionMessage(mission: Mission<MissionParams>, message: Message<MessageParams>) {
    try {
        if (message.params instanceof ChargingArrivalMessageParams) {
            console.log('Mission Message', 'Charging Arrival');
            await mission.sendMessage(new ChargingStartedMessageParams({}));
            await mission.sendMessage(new ChargingCompleteMessageParams({}));
        }
        else if (message.params instanceof StatusRequestMessageParams) {
            console.log('Mission Message', 'Status Request');
            await mission.sendMessage(new ProviderStatusMessageParams({ finishEta: 1 }));
        }
        else if (message.params instanceof DroneStatusMessageParams) {
            console.log('Mission Message', 'Drone Status', message.params);
        }
        else {
            console.log('Mission Message', message);
        }
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
