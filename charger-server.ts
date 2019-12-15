import * as express from "express"
import * as bodyParser from 'body-parser';
import { Server } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import ChargerController from './controllers/charger-controller';

export default class ChargerServer extends Server {
    constructor() {
        super(true);

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        super.addControllers([new ChargerController()]);
    }

    public start(port: number): void {
        this.app.get('*', (req: express.Request, res: express.Response) => {
            res.status(200).send('Ok');
        });
        this.app.listen(port, () => {
            Logger.Imp(`Charger server started on port ${port}`);
        });
    }
}
