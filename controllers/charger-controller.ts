import { Request, Response } from 'express';
import { Controller, Middleware, Get, Post } from '@overnightjs/core';
import { JwtManager, ISecureRequest } from '@overnightjs/jwt';
import { Logger } from '@overnightjs/logger';
import { SDKFactory, Need, Mission, Message } from "dav-js";
import { NeedFilterParams, NeedParams, BidParams, MissionParams, MessageParams, StartingMessageParams, ChargingStartedMessageParams, ChargingCompleteMessageParams, StatusRequestMessageParams, ProviderStatusMessageParams, ChargingArrivalMessageParams, DroneStatusMessageParams } from "dav-js/dist/drone-charging";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Identity from 'dav-js/dist/Identity';
import { Observable, ILocation } from 'dav-js/dist/common-types';
import * as util from 'util'
const config = require('../env');

const wallet = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.dav', 'wallet')).toString());
const DAV = SDKFactory({
    apiSeedUrls: config.apiSeedUrls,
    kafkaSeedUrls: config.kafkaSeedUrls,
    ethNodeUrl: wallet.nodeUrl
});

const jwtMgr = new JwtManager(wallet.apiSecret, '10h');

enum Status {
    Waiting = 'Waiting',
    Committed = 'Committed',
    Ready = 'Ready'
}

interface ChargerInfo {
    identity: Identity;
    status: Status;
    location: ILocation;
    needs?: Observable<Need<NeedParams>>;
    mission?: Mission<MissionParams>;
    logs: string[];
}

@Controller('')
export default class ChargerController {
    private chargers: { [key: string]: ChargerInfo } = {};

    @Get('status')
    @Middleware(jwtMgr.middleware)
    public status(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const chargerInfo = this.chargers[id];
            if (!chargerInfo) {
                res.status(404).json({});
                return;
            }

            res.status(200).json({
                status: chargerInfo.status || Status.Waiting,
                logs: chargerInfo.logs
            });
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    @Post('register')
    public async register(req: Request, res: Response) {
        try {
            const { address, lat, lon, radius } = req.body;

            if (!!this.chargers[address]) {
                res.status(400).json({});
                return;
            }

            const charger = await DAV.getIdentity(address);

            const location = {
                lat: parseFloat(lat),
                long: parseFloat(lon)
            };
            const chargerInfo: ChargerInfo = {
                identity: charger,
                status: Status.Waiting,
                location,
                logs: []
            };

            ChargerController.log(chargerInfo, `Charger ${util.inspect(charger)}`);

            this.chargers[address] = chargerInfo;

            const needs = await charger.needsForType<NeedParams>(new NeedFilterParams({
                location,
                radius: parseFloat(radius),
            }));

            chargerInfo.needs = needs;

            needs.subscribe((need) => ChargerController.handleNeed(chargerInfo, need));

            const key = jwtMgr.jwt({
                id: address
            });

            return res.status(200).send(key);
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    private static log(chargerInfo: ChargerInfo, msg: string) {
        chargerInfo.logs.push(msg);
        Logger.Info(msg);
    }

    private static async handleNeed(chargerInfo: ChargerInfo, need: Need<NeedParams>) {
        try {

            ChargerController.log(chargerInfo, `Got Need ${util.inspect(need)} for ${util.inspect(chargerInfo)}`);

            if (chargerInfo.status !== Status.Waiting) {
                ChargerController.log(chargerInfo, `No Bid - Already busy ${util.inspect(chargerInfo)}`);
                return;
            }

            const bid = await need.createBid(new BidParams({
                price: '1',
                vehicleId: chargerInfo.identity.davId,
                availableFrom: 1,
                isCommitted: false,
                entranceLocation: chargerInfo.location
            }));

            ChargerController.log(chargerInfo, `Waiting on Bid ${util.inspect(bid)} for ${util.inspect(chargerInfo)}`);

            const commitmentRequests = await bid.commitmentRequests();
            commitmentRequests.subscribe(async commitmentRequest => {
                try {
                    ChargerController.log(chargerInfo, `CommitmentRequest ${util.inspect(commitmentRequest)} for ${util.inspect(chargerInfo)}`);

                    if (chargerInfo.status !== Status.Waiting) {
                        ChargerController.log(chargerInfo, `No Confirm - Already busy ${util.inspect(chargerInfo)}`);
                        return;
                    }
                    chargerInfo.status = Status.Committed;
                    await commitmentRequest.confirm();
                }
                catch (err) {
                    Logger.Err(err, true);
                }
            });

            const messages = await bid.messages();
            messages.subscribe(message => {
                ChargerController.log(chargerInfo, `Bid Message ${util.inspect(message)} for ${util.inspect(chargerInfo)}`);
            });

            const missions = await bid.missions();
            missions.subscribe(mission => ChargerController.handleMission(chargerInfo, mission));
        }
        catch (err) {
            Logger.Err(err, true);
        }
    }

    private static async handleMission(chargerInfo: ChargerInfo, mission: Mission<MissionParams>) {
        try {
            if (chargerInfo.status !== Status.Committed) {
                ChargerController.log(chargerInfo, `No Mission - Already busy ${util.inspect(chargerInfo)}`);
                return;
            }
            chargerInfo.mission = mission;

            const messages = await mission.messages();
            messages.subscribe(message => ChargerController.handleMissionMessage(chargerInfo, message));

            await mission.sendMessage(new StartingMessageParams({}));
        }
        catch (err) {
            Logger.Err(err, true);
        }
    }

    private static async handleMissionMessage(chargerInfo: ChargerInfo, message: Message<MessageParams>) {
        try {
            const mission = chargerInfo.mission as Mission<MissionParams>;

            if (message.params instanceof ChargingArrivalMessageParams) {
                ChargerController.log(chargerInfo, 'Mission Message: Charging Arrival');
                chargerInfo.status = Status.Ready;
            }
            else if (message.params instanceof StatusRequestMessageParams) {
                ChargerController.log(chargerInfo, 'Mission Message: Status Request');
                await mission.sendMessage(new ProviderStatusMessageParams({ finishEta: 1 }));
            }
            else if (message.params instanceof DroneStatusMessageParams) {
                ChargerController.log(chargerInfo, `Mission Message: Drone Status ${message.params}`);
            }
            else {
                ChargerController.log(chargerInfo, `Mission Message ${message}`);
            }
        }
        catch (err) {
            Logger.Err(err, true);
        }
    }

    @Post('started')
    @Middleware(jwtMgr.middleware)
    public async started(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const chargerInfo = this.chargers[id];
            if (!chargerInfo || !chargerInfo.mission) {
                res.status(404).json({});
                return;
            }
            const mission = chargerInfo.mission;
            await mission.sendMessage(new ChargingStartedMessageParams({}));

            res.status(200).json({});
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    @Post('complete')
    @Middleware(jwtMgr.middleware)
    public async complete(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const chargerInfo = this.chargers[id];
            if (!chargerInfo || !chargerInfo.mission) {
                res.status(404).json({});
                return;
            }
            const mission = chargerInfo.mission;
            await mission.sendMessage(new ChargingCompleteMessageParams({}));

            res.status(200).json({});
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }

    @Post('clear')
    @Middleware(jwtMgr.middleware)
    public async clear(req: ISecureRequest, res: Response) {
        try {
            const id = req.payload.id;
            const chargerInfo = this.chargers[id];
            if (!chargerInfo || !chargerInfo.mission) {
                res.status(404).json({});
                return;
            }
            chargerInfo.mission = undefined;
            chargerInfo.status = Status.Waiting;

            res.status(200).json({});
        } catch (err) {
            Logger.Err(err, true);
            return res.status(500).json({});
        }
    }
}
