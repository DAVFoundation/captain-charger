import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChargerComponent } from './charger.component';

describe('ChargerComponent', () => {
  let component: ChargerComponent;
  let fixture: ComponentFixture<ChargerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChargerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChargerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
