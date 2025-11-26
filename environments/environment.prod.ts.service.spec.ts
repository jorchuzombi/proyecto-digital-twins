import { TestBed } from '@angular/core/testing';

import { EnvironmentProdTsService } from './environment.prod.ts.service';

describe('EnvironmentProdTsService', () => {
  let service: EnvironmentProdTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnvironmentProdTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
