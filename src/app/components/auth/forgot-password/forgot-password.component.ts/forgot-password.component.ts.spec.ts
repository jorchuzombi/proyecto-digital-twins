import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForgotPasswordComponentTs } from './forgot-password.component.ts';

describe('ForgotPasswordComponentTs', () => {
  let component: ForgotPasswordComponentTs;
  let fixture: ComponentFixture<ForgotPasswordComponentTs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponentTs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponentTs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
