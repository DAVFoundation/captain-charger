import { Component, OnInit } from '@angular/core';
import { ServerService } from '../server.service';
import { interval } from 'rxjs';

@Component({
  selector: 'app-charger',
  templateUrl: './charger.component.html',
  styleUrls: ['./charger.component.scss']
})
export class ChargerComponent implements OnInit {
  address: string;
  lat: string;
  lon: string;
  radius: string;
  token: string;
  status: string;
  logs: string[];

  constructor(private server: ServerService) {
    this.address = '0x8B22d48bd7fFBcE764c60AE2a78128427973DAdB';
    this.lat = '32.050382';
    this.lon = '34.766149';
    this.radius = '1000';
    this.logs = [];
  }

  async ngOnInit() {
    interval(500).subscribe(async () => {
      if (!!this.token) {
        const res = (await this.server.getStatus(this.token).toPromise());
        this.status = res.status;
        this.logs = res.logs;
      } else {
        this.status = '';
        this.logs = [];
      }
    });
  }

  async register() {
    this.token = await this.server.register({
      address: this.address,
      lat: this.lat,
      lon: this.lon,
      radius: this.radius
    }).toPromise();
  }

  async started() {
    await this.server.started(this.token).toPromise();
  }

  async completed() {
    await this.server.completed(this.token).toPromise();
  }

  async cleared() {
    await this.server.cleared(this.token).toPromise();
  }
}
