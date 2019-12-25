import { Component, ViewChild, ViewContainerRef, ComponentFactoryResolver, ComponentRef, ComponentFactory } from '@angular/core';
import { ChargerComponent } from './charger/charger.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('chargers', { static: true, read: ViewContainerRef }) chargers: ViewContainerRef;

  constructor(private resolver: ComponentFactoryResolver) { }

  addCharger() {
    const factory = this.resolver.resolveComponentFactory(ChargerComponent);
    this.chargers.createComponent(factory);
  }
}
