import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverPanel } from './driver-panel';

describe('DriverPanel', () => {
  let component: DriverPanel;
  let fixture: ComponentFixture<DriverPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
