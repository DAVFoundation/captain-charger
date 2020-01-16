import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RegisterData {
  address: string;
  lat: string;
  lon: string;
  radius: string;
}

export interface StatusData {
  status: string;
  logs: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  constructor(private http: HttpClient) {
  }

  private getUrl(path) {
    return `${environment.serverUrl}${path}`;
  }

  register(data: RegisterData) {
    return this.http.post(this.getUrl('/register'), data, { responseType: 'text' });
  }

  getStatus(token: string) {
    return this.http.get<StatusData>(this.getUrl('/status'), {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }

  started(token: string) {
    return this.http.post(this.getUrl('/started'), {}, {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }

  completed(token: string) {
    return this.http.post(this.getUrl('/complete'), {}, {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }

  cleared(token: string) {
    return this.http.post(this.getUrl('/clear'), {}, {
      headers: {
        // tslint:disable-next-line:object-literal-key-quotes
        'Authorization': `Bearer ${token}`
      }
    });
  }
}
